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
    origin: '*', // In production, change this to your frontend URL
  },
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
    // TODO: Handle player disconnect during game
  }

  @SubscribeMessage('createGame')
  async handleCreateGame(
    @MessageBody() data: { title: string; questions: any[]; isPublic: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    let { title, questions, isPublic } = data;

    if (!title || !questions || questions.length === 0) {
      return { success: false, message: 'Neplatná data kvízu' };
    }

    this.logger.log(`Client ${client.id} creating game: ${title}`);

    // --- SAVE TO DATABASE ---
    try {
      let host = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
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

      await this.prisma.quiz.create({
        data: {
          title: title,
          isPublic: isPublic || false,
          authorId: host.id,
          questions: {
            create: questions.map((q, index) => ({
              text: q.text,
              type: 'MULTIPLE_CHOICE',
              order: index,
              timeLimit: 30,
              options: {
                create: q.options.map((opt: string, optIndex: number) => ({
                  text: opt,
                  isCorrect: optIndex === q.correct,
                  order: optIndex
                }))
              }
            }))
          }
        }
      });
      this.logger.log(`Quiz '${title}' saved to database.`);
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

  @SubscribeMessage('saveQuiz')
  async handleSaveQuiz(
    @MessageBody() data: { title: string; questions: any[]; isPublic: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    let { title, questions, isPublic } = data;
    this.logger.log(`Client ${client.id} saving quiz (no start): ${title}`);

    try {
      let host = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
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

      await this.prisma.quiz.create({
        data: {
          title: title,
          isPublic: isPublic || false,
          authorId: host.id,
          questions: {
            create: questions.map((q, index) => ({
              text: q.text,
              type: 'MULTIPLE_CHOICE',
              order: index,
              timeLimit: 30,
              options: {
                create: q.options.map((opt: string, optIndex: number) => ({
                  text: opt,
                  isCorrect: optIndex === q.correct,
                  order: optIndex
                }))
              }
            }))
          }
        }
      });
      return { success: true, message: 'Kvíz byl úspěšně uložen.' };
    } catch (error) {
      console.error("Error saving quiz:", error);
      return { success: false, message: 'Chyba při ukládání do databáze.' };
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: { pin: string; nickname: string; avatar: string },
    @ConnectedSocket() client: Socket,
  ) {
    const game = this.games.get(data.pin);
    if (!game) return { success: false, message: 'Hra neexistuje.' };
    if (game.state !== 'lobby') return { success: false, message: 'Hra už běží.' };

    client.join(data.pin);

    const player = { id: client.id, nickname: data.nickname, avatar: data.avatar, score: 0 };
    game.players.push(player);

    this.server.to(data.pin).emit('playerJoined', player);
    this.server.to(data.pin).emit('updatePlayerList', game.players);

    return { success: true, message: 'Joined' };
  }

  @SubscribeMessage('startGame')
  handleStartGame(@MessageBody() data: { pin: string }) {
    const game = this.games.get(data.pin);
    if (!game) return { success: false };

    this.logger.log(`Starting game ${data.pin}`);
    this.nextQuestion(data.pin);
    return { success: true };
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
    const timeLimit = 30; // 30 seconds per question

    // Send question to everyone (Players get options count, Host gets text)
    this.server.to(pin).emit('questionStart', {
      questionIndex: game.currentQuestionIndex + 1,
      totalQuestions: game.questions.length,
      text: question.text,
      options: question.options,
      timeLimit: timeLimit
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

    // Wait 5 seconds then next question (or let host trigger it? Let's auto-advance for now for simplicity)
    game.timer = setTimeout(() => {
      this.nextQuestion(pin);
    }, 5000);
  }
}
