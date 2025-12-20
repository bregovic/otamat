import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DixitGame, DixitPlayer, DixitPhase, GameStatus } from '@prisma/client';
import { Server } from 'socket.io';

const ALL_CARDS = [
    '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg',
    '8.jpg', '9.jpg', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg',
    'x1.jpg', 'x2.jpg', 'x3.jpg', 'x4.jpg', 'x5.jpg',
    // We can add more if we scan the directory, but this is a start based on view_dir
];

@Injectable()
export class DixitService {
    constructor(private prisma: PrismaService) { }

    private server: Server;
    setServer(server: Server) {
        this.server = server;
    }

    async createGame(hostId?: string, guestInfo?: { nickname: string, avatar: string }) {
        let finalHostId = hostId;

        // If no hostId but guest info provided -> Create Guest User
        if (!finalHostId) {
            const guestUser = await this.prisma.user.create({
                data: {
                    email: `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@dixit.temp`,
                    nickname: guestInfo?.nickname || 'Anonym',
                    avatar: guestInfo?.avatar || 'fox',
                    role: 'HOST'
                }
            });
            finalHostId = guestUser.id;
        }

        if (!finalHostId) throw new Error("Host ID or Guest Info required");

        // Generate unique PIN
        let pin = '';
        let exists = true;
        while (exists) {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin } });
            if (!existing) exists = false;
        }

        // Fetch cards for the deck
        let allCards = await this.prisma.dixitCard.findMany({ select: { id: true } });
        const deck = allCards.map(c => c.id).sort(() => Math.random() - 0.5);

        // Create the game
        const game = await this.prisma.dixitGame.create({
            data: {
                pinCode: pin,
                hostId: finalHostId,
                status: GameStatus.WAITING,
                phase: DixitPhase.LOBBY,
                deck: deck,
                rounds: {
                    create: []
                }
            },
            include: { players: true }
        });

        // If guestInfo provided, auto-join the creator as a player
        let playerId: string | null = null;
        if (guestInfo && guestInfo.nickname) {
            const player = await this.prisma.dixitPlayer.create({
                data: {
                    gameId: game.id,
                    nickname: guestInfo.nickname,
                    avatar: guestInfo.avatar || 'fox',
                    hand: [],
                }
            });
            playerId = player.id;
        }

        // Return game with players included
        const updatedGame = await this.prisma.dixitGame.findUnique({
            where: { id: game.id },
            include: { players: true, rounds: true }
        });

        return { game: updatedGame, playerId };
    }

    async joinGame(pin: string, nickname: string, avatar: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { pinCode: pin },
            include: { players: true }
        });

        if (!game) throw new Error('Game not found');
        if (game.status === GameStatus.FINISHED) {
            throw new Error('Game already finished');
        }

        const player = await this.prisma.dixitPlayer.create({
            data: {
                gameId: game.id,
                nickname,
                avatar,
                hand: [], // No cards yet
            }
        });

        return { game, player };
    }

    async uploadCards(files: Array<{ buffer: Buffer, originalname: string }>) {
        // Dynamic import sharp to avoid issues if not installed/build time
        let sharp;
        try {
            sharp = require('sharp');
        } catch (e) {
            console.error('Sharp not found, storing raw buffer');
        }

        const createdCards = [];
        for (const file of files) {
            let processedBuffer = file.buffer;

            if (sharp) {
                try {
                    processedBuffer = await sharp(file.buffer)
                        .rotate() // Auto-orient based on EXIF
                        .resize({ width: 800, height: 1200, fit: 'inside' })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                } catch (err) {
                    console.error('Error processing image:', err);
                }
            }

            const base64Data = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

            const card = await this.prisma.dixitCard.create({
                data: {
                    data: base64Data,
                    fileName: file.originalname
                }
            });
            createdCards.push(card);
        }
        return createdCards;
    }

    async startGame(pin: string, firstStorytellerId?: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { pinCode: pin },
            include: { players: true }
        });
        if (!game) throw new Error('Game not found');

        const playerCount = game.players.length;
        const HAND_SIZE = playerCount === 3 ? 7 : 6;

        let deck = [...game.deck];
        if (deck.length === 0) {
            const allCards = await this.prisma.dixitCard.findMany({ select: { id: true } });
            deck = allCards.map(c => c.id).sort(() => Math.random() - 0.5);
        }

        // Deal HAND_SIZE cards to each player
        for (const player of game.players) {
            const hand = deck.splice(0, HAND_SIZE);
            await this.prisma.dixitPlayer.update({
                where: { id: player.id },
                data: { hand }
            });
        }

        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: { deck }
        });


        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: {
                status: GameStatus.ACTIVE,
                phase: DixitPhase.STORYTELLER_PICK,
                storytellerId: null, // No storyteller yet
                currentRound: 1
            }
        });

        // Round 1 will be created when a player claims storyteller

        return this.getGameState(game.id);
    }

    async getGameState(gameId: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { id: gameId },
            include: { players: true, rounds: { orderBy: { roundNumber: 'desc' }, take: 1 } }
        });
        return game;
    }

    async getGameStateByPin(pin: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { pinCode: pin },
            include: { players: true, rounds: { orderBy: { roundNumber: 'desc' }, take: 1 } }
        });
        return game;
    }

    async claimStoryteller(pin: string, playerId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        if (!game) throw new Error('Game not found');

        if (game.phase !== DixitPhase.STORYTELLER_PICK) throw new Error('Wrong phase');
        if (game.storytellerId) throw new Error('Storyteller already set');

        // Set storyteller
        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: { storytellerId: playerId }
        });

        // Use currentRound from game, should be 1
        const roundNum = game.currentRound || 1;

        // Create the round now
        await this.prisma.dixitRound.create({
            data: {
                gameId: game.id,
                roundNumber: roundNum,
                storytellerId: playerId,
                clue: "",
                cardsPlayed: {},
                votes: {},
                scores: {}
            }
        });

        return this.getGameState(game.id);
    }

    async setClueAndCard(pin: string, playerId: string, clue: string, cardId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin } });
        if (!game) throw new Error('Game not found');

        if (game.phase !== DixitPhase.STORYTELLER_PICK) throw new Error('Wrong phase');
        if (game.storytellerId !== playerId) throw new Error('Not storyteller');

        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });
        if (!lastRound) throw new Error('No round found');

        // Store as array for consistency
        const cardsPlayed = (lastRound.cardsPlayed as any) || {};
        cardsPlayed[playerId] = [cardId];

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: { clue, cardsPlayed }
        });

        const player = await this.prisma.dixitPlayer.findUnique({ where: { id: playerId } });
        if (!player) throw new Error('Player not found');
        const newHand = player.hand.filter(c => c !== cardId);

        await this.prisma.dixitPlayer.update({
            where: { id: playerId },
            data: { hand: newHand, submittedCardId: cardId } // submittedCardId legacy, assumes last one
        });

        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: { phase: DixitPhase.PLAYERS_PICK }
        });

        return await this.getGameState(game.id);
    }

    async submitPlayerCard(pin: string, playerId: string, cardId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        if (!game) throw new Error('Game not found');

        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });
        if (!lastRound) throw new Error('Round not found');

        const cardsPlayed = (lastRound.cardsPlayed as any) || {};

        // Setup array if not exists
        if (!cardsPlayed[playerId]) cardsPlayed[playerId] = [];

        // Check if already submitted max cards
        const playerCount = game.players.length;
        const requiredCards = (playerCount === 3 && game.storytellerId !== playerId) ? 2 : 1;

        if (cardsPlayed[playerId].includes(cardId)) return await this.getGameState(game.id); // Idempotent
        if (cardsPlayed[playerId].length >= requiredCards) throw new Error('Already submitted required cards');

        cardsPlayed[playerId].push(cardId);

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: { cardsPlayed }
        });

        const player = await this.prisma.dixitPlayer.findUnique({ where: { id: playerId } });
        if (!player) throw new Error('Player not found');
        const newHand = player.hand.filter(c => c !== cardId);

        // We update submittedCardId just to indicate "activity", but for 3-player it might be the 2nd card.
        // Frontend should check cardsPlayed from game state to know status.
        await this.prisma.dixitPlayer.update({
            where: { id: playerId },
            data: { hand: newHand, submittedCardId: cardId }
        });

        // Check if ALL players (except storyteller) have submitted ALL required cards
        let allSubmitted = true;
        for (const p of game.players) {
            if (p.id === game.storytellerId) continue;
            const pCards = cardsPlayed[p.id] || [];
            if (pCards.length < ((playerCount === 3) ? 2 : 1)) {
                allSubmitted = false;
                break;
            }
        }

        if (allSubmitted) {
            await this.prisma.dixitGame.update({
                where: { id: game.id },
                data: { phase: DixitPhase.VOTING }
            });
        }

        return await this.getGameState(game.id);
    }

    async submitVote(pin: string, voterId: string, targetCardId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        if (!game) throw new Error('Game not found');

        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });
        if (!lastRound) throw new Error('Round not found');

        const votes = (lastRound.votes as any) || {};
        votes[voterId] = targetCardId; // Store CARD ID

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: { votes }
        });

        await this.prisma.dixitPlayer.update({
            where: { id: voterId },
            data: { votedCardId: targetCardId }
        });

        const votersCount = game.players.length - 1;
        if (Object.keys(votes).length >= votersCount) {
            await this.calculateScores(game.id, lastRound.id);
            await this.prisma.dixitGame.update({
                where: { id: game.id },
                data: { phase: DixitPhase.SCORING }
            });
        }

        return await this.getGameState(game.id);
    }

    async calculateScores(gameId: string, roundId: string) {
        const round = await this.prisma.dixitRound.findUnique({ where: { id: roundId } });
        const game = await this.prisma.dixitGame.findUnique({ where: { id: gameId }, include: { players: true } });

        if (!game || !round) return;

        const votes = (round.votes as any) || {};
        const cardsPlayed = (round.cardsPlayed as any) || {};
        const storytellerId = round.storytellerId;
        const totalVoters = game.players.length - 1;

        // Map CardId -> OwnerId
        const cardOwnerMap: Record<string, string> = {};
        Object.entries(cardsPlayed).forEach(([pid, cards]: [string, any]) => {
            // cards is string[]
            if (Array.isArray(cards)) {
                cards.forEach(cId => cardOwnerMap[cId] = pid);
            } else {
                // Fallback for transition or legacy
                cardOwnerMap[cards] = pid;
            }
        });

        // Initialize points
        const pointsMap: Record<string, number> = {};
        game.players.forEach(p => pointsMap[p.id] = 0);

        // Count votes for storyteller's CARD
        let storytellerCardId = "";
        // Find storyteller's card (should be only 1 even in 3 player mode rules? usually yes)
        if (Array.isArray(cardsPlayed[storytellerId])) {
            storytellerCardId = cardsPlayed[storytellerId][0];
        } else {
            storytellerCardId = cardsPlayed[storytellerId];
        }

        let correctVotes = 0;
        Object.values(votes).forEach(votedCardId => {
            if (cardOwnerMap[votedCardId as string] === storytellerId) correctVotes++;
        });

        // Logic: 
        // If NO ONE guesses storyteller OR EVERYONE guesses storyteller -> Storyteller 0, Others 2.
        // Else -> Storyteller 3, Guessers 3.
        const everyoneGuessed = correctVotes === totalVoters;
        const noOneGuessed = correctVotes === 0;

        if (everyoneGuessed || noOneGuessed) {
            // Storyteller 0
            // All other players +2
            game.players.forEach(p => {
                if (p.id !== storytellerId) pointsMap[p.id] += 2;
            });

            // Bonus points for votes on OTHER cards
            Object.values(votes).forEach((votedCardId: string) => {
                const ownerId = cardOwnerMap[votedCardId];
                if (ownerId && ownerId !== storytellerId) {
                    pointsMap[ownerId] = (pointsMap[ownerId] || 0) + 1;
                }
            });
        } else {
            // Success for Storyteller
            pointsMap[storytellerId] += 3;

            // Points for correct voters
            Object.entries(votes).forEach(([voterId, votedCardId]: [string, any]) => {
                const ownerId = cardOwnerMap[votedCardId];
                if (ownerId === storytellerId) {
                    pointsMap[voterId] += 3;
                } else {
                    // Bonus point for owner of misleading card
                    if (ownerId) pointsMap[ownerId] = (pointsMap[ownerId] || 0) + 1;
                }
            });
        }

        // Apply
        const updates = [];
        for (const player of game.players) {
            const pointsToAdd = pointsMap[player.id] || 0;
            if (pointsToAdd > 0) {
                updates.push(this.prisma.dixitPlayer.update({
                    where: { id: player.id },
                    data: { score: player.score + pointsToAdd }
                }));
            }
        }
        await this.prisma.$transaction(updates);

        // Win check
        const WIN_SCORE = 30; // user specified 30
        const winner = game.players.find(p => (pointsMap[p.id] ? p.score + pointsMap[p.id] : p.score) >= WIN_SCORE);

        if (winner) {
            await this.prisma.dixitGame.update({
                where: { id: game.id },
                data: { status: GameStatus.FINISHED }
            });
        }
    }

    async nextRound(pin: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        if (!game) throw new Error('Game not found');

        const playerCount = game.players.length;
        const HAND_SIZE = playerCount === 3 ? 7 : 6;

        const currentIdx = game.players.findIndex(p => p.id === game.storytellerId);
        const nextIdx = (currentIdx + 1) % game.players.length;
        const nextStoryteller = game.players[nextIdx];

        let deck = [...game.deck];

        for (const player of game.players) {
            const needed = HAND_SIZE - player.hand.length;
            if (needed > 0 && deck.length >= needed) {
                const newCards = deck.splice(0, needed);
                const hand = [...player.hand, ...newCards];
                await this.prisma.dixitPlayer.update({ where: { id: player.id }, data: { hand } });
            }
        }

        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: {
                phase: DixitPhase.STORYTELLER_PICK,
                storytellerId: nextStoryteller.id,
                currentRound: game.currentRound + 1,
                deck: deck
            }
        });

        await this.prisma.dixitRound.create({
            data: {
                gameId: game.id,
                roundNumber: game.currentRound + 1,
                storytellerId: nextStoryteller.id,
                clue: "",
                cardsPlayed: {},
                votes: {},
                scores: {}
            }
        });

        await this.prisma.dixitPlayer.updateMany({
            where: { gameId: game.id },
            data: { submittedCardId: null, votedCardId: null }
        });

        return await this.getGameState(game.id);
    }

    async getCard(id: string) {
        return this.prisma.dixitCard.findUnique({ where: { id } });
    }

}
