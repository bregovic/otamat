import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { QuizService } from '../../quiz/quiz.service';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: [
      'https://hollyhop.cz',
      'http://hollyhop.cz',
      'https://www.hollyhop.cz',
      'http://www.hollyhop.cz',
      'https://otamat.w33.wedos.net',
      'http://localhost:3000',
      'http://localhost:4000'
    ],
    credentials: true,
  },
  maxHttpBufferSize: 1e7 // 10 MB
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GameGateway');

  constructor(
    private quizService: QuizService,
    private prisma: PrismaService
  ) { }

  // In-memory storage for games
  private games = new Map<string, {
    title: string;
    questions: any[];
    players: any[];
    currentQuestionIndex: number;
    answers: Map<string, { index: number; time: number }>; // playerId -> { answerIndex, timestamp }
    state: 'lobby' | 'question' | 'results' | 'finished';
    timer: NodeJS.Timeout | null;
    questionStartTime: number;
  }>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Find game where this player is
    for (const [pin, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === client.id);
      if (playerIndex !== -1) {
        // If game is in lobby, remove player
        if (game.state === 'lobby') {
          const removedPlayer = game.players[playerIndex];
          game.players.splice(playerIndex, 1);
          this.server.to(pin).emit('updatePlayerList', game.players);
          this.logger.log(`Player ${removedPlayer.nickname} removed from lobby ${pin}`);
        } else {
          // TODO: Handle disconnect during active game (maybe mark as disconnected?)
          this.logger.log(`Player ${game.players[playerIndex].nickname} disconnected from active game ${pin}`);
        }
        break;
      }
    }
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(
    @MessageBody() data: { title: string; questions: any[]; isPublic: boolean; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    let { title, questions, isPublic, userId } = data;

    if (!title || !questions || questions.length === 0) {
      return { success: false, message: 'Neplatná data kvízu' };
    }

    this.logger.log(`Client ${client.id} creating game: ${title} for user ${userId}`);

    // --- SAVE TO DATABASE ---
    try {
      let host;
      if (userId) {
        host = await this.prisma.user.findUnique({ where: { id: userId } });
      }

      if (!host) {
        // Fallback to admin if no user found or provided
        host = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!host) {
          host = await this.prisma.user.findFirst();
          if (!host) {
            host = await this.prisma.user.create({
              data: {
                email: 'admin@hollyhop.cz',
                nickname: 'Admin',
                role: 'ADMIN'
              }
            });
          }
        }
      }

      await this.prisma.quiz.create({
        data: {
          title: title,
          isPublic: isPublic || false,
          authorId: host.id,
          questions: {
            create: questions.map((q, index) => ({
              text: q.text,
              type: q.type || 'MULTIPLE_CHOICE',
              order: index,
              timeLimit: 30,
              options: {
                create: q.options.map((opt: any, optIndex: number) => ({
                  text: typeof opt === 'string' ? opt : opt.text,
                  imageUrl: typeof opt === 'string' ? null : opt.mediaUrl,
                  isCorrect: optIndex === q.correct,
                  order: optIndex
                }))
              }
            }))
          }
        }
      });
      this.logger.log(`Quiz '${title}' saved to database for author ${host.id}.`);
    } catch (error) {
      this.logger.error(`Failed to save quiz to DB: ${error}`);
    }
    // ------------------------

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    this.games.set(pin, {
      title: title,
      questions: questions,
      players: [],
      currentQuestionIndex: -1,
      answers: new Map(),
      state: 'lobby',
      timer: null,
      questionStartTime: 0
    });

    client.join(pin);
    this.logger.log(`Game created with PIN: ${pin}`);

    return { success: true, pin: pin };
  }

  @SubscribeMessage('createGameFromQuiz')
  async handleCreateGameFromQuiz(
    @MessageBody() data: { quizId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { quizId } = data;
    this.logger.log(`Creating game from quiz ID: ${quizId}`);

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz) {
      return { success: false, message: 'Kvíz nenalezen.' };
    }

    // Transform DB questions to Game questions structure
    const gameQuestions = quiz.questions.map(q => {
      // Sort options by order to ensure correct index matches
      const sortedOptions = q.options.sort((a, b) => a.order - b.order);
      return {
        text: q.text,
        mediaUrl: q.mediaUrl,
        options: sortedOptions.map(o => ({ text: o.text, mediaUrl: o.imageUrl })),
        correct: sortedOptions.findIndex(o => o.isCorrect),
        timeLimit: q.timeLimit || 30,
        type: q.type
      };
    });

    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    this.games.set(pin, {
      title: quiz.title,
      questions: gameQuestions,
      players: [],
      currentQuestionIndex: -1,
      answers: new Map(),
      state: 'lobby',
      timer: null,
      questionStartTime: 0
    });

    client.join(pin);
    this.logger.log(`Game created from saved quiz with PIN: ${pin}`);

    return { success: true, pin: pin };
  }

  @SubscribeMessage('loadQuizToSession')
  async handleLoadQuizToSession(
    @MessageBody() data: { pin: string; quizId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { pin, quizId } = data;
    const game = this.games.get(pin);

    if (!game) {
      return { success: false, message: 'Hra nebyla nalezena.' };
    }

    this.logger.log(`Loading new quiz ${quizId} into session ${pin}`);

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz) {
      return { success: false, message: 'Kvíz nenalezen.' };
    }

    // Transform DB questions
    const gameQuestions = quiz.questions.map(q => {
      const sortedOptions = q.options.sort((a, b) => a.order - b.order);
      return {
        text: q.text,
        mediaUrl: q.mediaUrl,
        options: sortedOptions.map(o => ({ text: o.text, mediaUrl: o.imageUrl })),
        correct: sortedOptions.findIndex(o => o.isCorrect),
        timeLimit: q.timeLimit || 30,
        type: q.type
      };
    });

    // Reset Game State but KEEP players
    game.title = quiz.title;
    game.questions = gameQuestions;
    game.currentQuestionIndex = -1;
    game.answers.clear();
    game.state = 'lobby';
    game.timer = null;
    game.questionStartTime = 0;

    // Reset player scores for the new game
    game.players.forEach(p => p.score = 0);

    // Notify everyone
    this.server.to(pin).emit('quizLoaded', {
      title: game.title,
      totalQuestions: game.questions.length
    });

    // Send updated player list (scores reset)
    this.server.to(pin).emit('updatePlayerList', game.players);

    return { success: true };
  }

  @SubscribeMessage('saveQuiz')
  async handleSaveQuiz(
    @MessageBody() data: { quizId?: string; title: string; questions: any[]; isPublic: boolean; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    let { quizId, title, questions, isPublic, userId } = data;
    this.logger.log(`Client ${client.id} saving quiz: ${title} (ID: ${quizId}) for user ${userId}`);

    // Debug logging
    try {
      const payloadSize = JSON.stringify(data).length;
      this.logger.log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

      // Check for cover image in data (it might be in a different property depending on frontend implementation, 
      // but based on previous context it seemed to be part of quizData. Here 'data' IS the payload)
      // The frontend sends { quizId, title, questions, isPublic, userId, coverImage? }
      // Let's check if 'coverImage' exists in data
      if ('coverImage' in data) {
        const coverImg = (data as any).coverImage;
        this.logger.log(`Cover image present. Length: ${coverImg ? coverImg.length : 'NULL'}`);
      } else {
        this.logger.log('Cover image property missing in payload');
      }

      if (questions && questions.length > 0) {
        const q = questions[0];
        this.logger.log(`First question mediaUrl: ${q.mediaUrl ? 'Present (' + q.mediaUrl.length + ')' : 'Missing'}`);
      }
    } catch (e) {
      this.logger.error('Error logging payload details', e);
    }

    try {
      let host;
      if (userId) {
        host = await this.prisma.user.findUnique({ where: { id: userId } });
      }

      if (!host) {
        host = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!host) {
          host = await this.prisma.user.findFirst();
          if (!host) {
            host = await this.prisma.user.create({
              data: {
                email: 'admin@hollyhop.cz',
                nickname: 'Admin',
                role: 'ADMIN'
              }
            });
          }
        }
      }

      // Check if quiz with same title exists for this user (if no ID provided)
      if (!quizId) {
        const existingQuiz = await this.prisma.quiz.findFirst({
          where: {
            title: title,
            authorId: host.id
          }
        });

        if (existingQuiz) {
          quizId = existingQuiz.id;
          this.logger.log(`Found existing quiz with title '${title}' (ID: ${quizId}). Updating instead of creating.`);
        }
      }

      if (quizId) {
        // Update existing quiz
        await this.prisma.question.deleteMany({ where: { quizId: quizId } });
        await this.prisma.quiz.update({
          where: { id: quizId },
          data: {
            title: title,
            coverImage: (data as any).coverImage, // Add coverImage
            isPublic: isPublic || false,
            questions: {
              create: questions.map((q, index) => ({
                text: q.text,
                type: q.type || 'MULTIPLE_CHOICE',
                mediaUrl: q.mediaUrl, // Add mediaUrl
                order: index,
                timeLimit: q.timeLimit || 15,
                options: {
                  create: q.options.map((opt: any, optIndex: number) => {
                    const text = typeof opt === 'string' ? opt : (opt.text || "");
                    const imageUrl = typeof opt === 'string' ? null : (opt.mediaUrl || opt.imageUrl);
                    // Use explicit isCorrect if available (from Excel import), otherwise fallback to index comparison
                    const isCorrect = (typeof opt === 'object' && opt.isCorrect !== undefined)
                      ? opt.isCorrect
                      : optIndex === q.correct;

                    return {
                      text: String(text),
                      imageUrl: imageUrl,
                      isCorrect: isCorrect,
                      order: optIndex
                    };
                  })
                }
              }))
            }
          }
        });
        return { success: true, message: 'Kvíz byl úspěšně aktualizován.', quizId: quizId };
      } else {
        const newQuiz = await this.prisma.quiz.create({
          data: {
            title: title,
            coverImage: (data as any).coverImage, // Add coverImage
            isPublic: isPublic || false,
            authorId: host.id,
            questions: {
              create: questions.map((q, index) => ({
                text: q.text,
                type: q.type || 'MULTIPLE_CHOICE',
                mediaUrl: q.mediaUrl, // Add mediaUrl
                order: index,
                timeLimit: q.timeLimit || 15,
                options: {
                  create: q.options.map((opt: any, optIndex: number) => {
                    const text = typeof opt === 'string' ? opt : (opt.text || "");
                    const imageUrl = typeof opt === 'string' ? null : (opt.mediaUrl || opt.imageUrl);
                    // Use explicit isCorrect if available (from Excel import), otherwise fallback to index comparison
                    const isCorrect = (typeof opt === 'object' && opt.isCorrect !== undefined)
                      ? opt.isCorrect
                      : optIndex === q.correct;

                    return {
                      text: String(text),
                      imageUrl: imageUrl,
                      isCorrect: isCorrect,
                      order: optIndex
                    };
                  })
                }
              }))
            }
          }
        });
        return { success: true, message: 'Kvíz byl úspěšně uložen.', quizId: newQuiz.id };
      }
    } catch (error: any) {
      console.error("Error saving quiz:", error);
      return { success: false, message: 'Chyba při ukládání do databáze: ' + (error.message || error) };
    }
  }

  @SubscribeMessage('watchGame')
  handleWatchGame(
    @MessageBody() data: { pin: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.games.get(data.pin);
    if (!game) return { success: false, message: 'Hra neexistuje.' };

    client.join(data.pin);
    this.logger.log(`Client ${client.id} watching game ${data.pin}`);

    // Send current state immediately
    client.emit('updatePlayerList', game.players);

    return { success: true };
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: { pin: string; nickname: string; avatar: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.games.get(data.pin);
    if (!game) return { success: false, message: 'Hra neexistuje.' };
    // Check if player already exists by ID (reconnect)
    const existingPlayerById = game.players.find(p => p.id === client.id);
    if (existingPlayerById) {
      // Update info just in case
      existingPlayerById.nickname = data.nickname;
      existingPlayerById.avatar = data.avatar;
      client.join(data.pin);
      this.server.to(data.pin).emit('updatePlayerList', game.players);

      // If game is running, sync state for reconnecting player
      if (game.state === 'question') {
        const question = game.questions[game.currentQuestionIndex];
        const timeLimit = question.timeLimit || 30;
        const endTime = game.questionStartTime + timeLimit * 1000;

        client.emit('questionStart', {
          questionIndex: game.currentQuestionIndex + 1,
          totalQuestions: game.questions.length,
          text: question.text,
          mediaUrl: question.mediaUrl,
          type: question.type,
          options: question.options,
          timeLimit: timeLimit,
          endTime: endTime
        });
      } else if (game.state === 'results') {
        const question = game.questions[game.currentQuestionIndex];
        client.emit('questionEnd', {
          correctIndex: question.correct,
          players: game.players
        });
      } else if (game.state === 'finished') {
        client.emit('gameOver', { players: game.players });
      }

      return { success: true, playerId: client.id };
    }

    // Check if nickname exists and uniquify if needed
    let nickname = data.nickname;
    let counter = 2;
    while (game.players.some(p => p.nickname === nickname)) {
      nickname = `${data.nickname} ${counter}`;
      counter++;
    }

    client.join(data.pin);

    const player = { id: client.id, nickname: nickname, avatar: data.avatar, score: 0 };
    game.players.push(player);

    this.server.to(data.pin).emit('playerJoined', player);
    this.server.to(data.pin).emit('updatePlayerList', game.players);

    // Sync state for new player joining mid-game
    if (game.state === 'question') {
      const question = game.questions[game.currentQuestionIndex];
      const timeLimit = question.timeLimit || 30;
      const endTime = game.questionStartTime + timeLimit * 1000;

      client.emit('questionStart', {
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
        text: question.text,
        mediaUrl: question.mediaUrl,
        type: question.type,
        options: question.options,
        timeLimit: timeLimit,
        endTime: endTime
      });
    } else if (game.state === 'results') {
      const question = game.questions[game.currentQuestionIndex];
      client.emit('questionEnd', {
        correctIndex: question.correct,
        players: game.players
      });
    } else if (game.state === 'finished') {
      client.emit('gameOver', { players: game.players });
    }

    return { success: true, playerId: client.id };
  }



  @SubscribeMessage('startGame')
  handleStartGame(@MessageBody() data: { pin: string }) {
    const game = this.games.get(data.pin);
    if (!game) return { success: false };

    this.logger.log(`Starting game ${data.pin}`);
    this.startCountdown(data.pin);
    return { success: true };
  }

  @SubscribeMessage('nextQuestion')
  handleNextQuestion(@MessageBody() data: { pin: string }) {
    const game = this.games.get(data.pin);
    if (!game) return;
    this.startCountdown(data.pin);
  }

  private startCountdown(pin: string) {
    const game = this.games.get(pin);
    if (!game) return;

    // If this is the last question (current index is length - 1), skip countdown and finish immediately
    // Note: currentQuestionIndex is incremented inside nextQuestion, so we check if we are at the end
    if (game.currentQuestionIndex >= game.questions.length - 1) {
      this.nextQuestion(pin);
      return;
    }

    this.server.to(pin).emit('countdownStart', { duration: 3 });
    setTimeout(() => {
      this.nextQuestion(pin);
    }, 3000);
  }

  @SubscribeMessage('submitAnswer')
  handleSubmitAnswer(
    @MessageBody() data: { pin: string; answerIndex: number },
    @ConnectedSocket() client: Socket
  ) {
    const game = this.games.get(data.pin);
    if (!game || game.state !== 'question') return;

    // Record answer
    if (!game.answers.has(client.id)) {
      game.answers.set(client.id, { index: data.answerIndex, time: Date.now() });

      // Notify host about answer count update
      this.server.to(data.pin).emit('answerSubmitted', { count: game.answers.size, total: game.players.length });

      // Check if all players answered
      if (game.answers.size === game.players.length) {
        this.finishQuestion(data.pin);
      }
    }
  }

  private nextQuestion(pin: string) {
    const game = this.games.get(pin);
    if (!game) return;

    game.currentQuestionIndex++;

    if (game.currentQuestionIndex >= game.questions.length) {
      // Game Over
      game.state = 'finished';
      this.server.to(pin).emit('gameOver', { players: game.players }); // Send final scores
      return;
    }

    game.state = 'question';
    game.answers.clear();
    game.questionStartTime = Date.now();

    const question = game.questions[game.currentQuestionIndex];
    const timeLimit = question.timeLimit || 30; // Use question time limit or default 30
    const endTime = Date.now() + timeLimit * 1000;

    // Send question to everyone (Players get options count, Host gets text)
    this.server.to(pin).emit('questionStart', {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      text: question.text,
      mediaUrl: question.mediaUrl,
      type: question.type,
      options: question.options,
      timeLimit: timeLimit,
      endTime: endTime
    });

    // Start Timer
    if (game.timer) clearTimeout(game.timer);
    game.timer = setTimeout(() => {
      this.finishQuestion(pin);
    }, timeLimit * 1000);
  }

  private finishQuestion(pin: string) {
    const game = this.games.get(pin);
    if (!game || game.state !== 'question') return;

    if (game.timer) clearTimeout(game.timer);
    game.state = 'results';

    const currentQ = game.questions[game.currentQuestionIndex];
    const correctIndex = currentQ.correct;
    const timeLimit = 30 * 1000; // 30s in ms

    // Calculate scores
    game.answers.forEach((answer, playerId) => {
      if (answer.index === correctIndex) {
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          // Calculate score based on speed
          const timeTaken = answer.time - game.questionStartTime;
          // Formula: 1000 * (1 - (timeTaken / timeLimit) / 2)
          // If timeTaken = 0, score = 1000
          // If timeTaken = timeLimit, score = 500
          let score = Math.round(1000 * (1 - (timeTaken / timeLimit) / 2));
          if (score < 500) score = 500; // Minimum points for correct answer
          if (score > 1000) score = 1000; // Cap at 1000

          player.score += score;
        }
      }
    });

    // Send results
    this.server.to(pin).emit('questionEnd', {
      correctIndex: correctIndex,
      players: game.players // Send updated scores
    });

    // Wait for host to trigger next question
    // game.timer = setTimeout(() => {
    //   this.nextQuestion(pin);
    // }, 5000);
  }
}
