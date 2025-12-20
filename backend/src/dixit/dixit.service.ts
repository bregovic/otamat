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

    async createGame(hostId: string) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        // Get all card IDs properly
        const allCards = await this.prisma.dixitCard.findMany({ select: { id: true } });
        const deck = allCards.map(c => c.id).sort(() => Math.random() - 0.5);

        const game = await this.prisma.dixitGame.create({
            data: {
                pinCode: pin,
                hostId,
                status: GameStatus.WAITING,
                phase: DixitPhase.LOBBY,
                deck: deck
            }
        });
        return game;
    }

    async joinGame(pin: string, nickname: string, avatar: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { pinCode: pin },
            include: { players: true }
        });

        if (!game) throw new Error('Game not found');
        if (game.status !== GameStatus.WAITING && game.status !== GameStatus.ACTIVE) { // Allow rejoin?
            // Simple logic for now: only join in Waiting
            if (game.status !== GameStatus.WAITING) throw new Error('Game already started');
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

    async startGame(pin: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { pinCode: pin },
            include: { players: true }
        });
        if (!game) throw new Error('Game not found');

        // Restore deck from DB (it was shuffled at creation or we shuffle now)
        // If deck is empty/not present, we should probably fetch ALL cards again
        let deck = [...game.deck];
        if (deck.length === 0) {
            const allCards = await this.prisma.dixitCard.findMany({ select: { id: true } });
            deck = allCards.map(c => c.id).sort(() => Math.random() - 0.5);
        }

        // Deal 6 cards to each player
        for (const player of game.players) {
            const hand = deck.splice(0, 6);
            await this.prisma.dixitPlayer.update({
                where: { id: player.id },
                data: { hand }
            });
        }

        // Save remaining deck
        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: { deck }
        });

        // Set first storyteller (random)
        const storyteller = game.players[0]; // Simplification

        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: {
                status: GameStatus.ACTIVE,
                phase: DixitPhase.STORYTELLER_PICK,
                storytellerId: storyteller.id,
                currentRound: 1
            }
        });

        // Create Round Record
        await this.prisma.dixitRound.create({
            data: {
                gameId: game.id,
                roundNumber: 1,
                storytellerId: storyteller.id,
                clue: "",
                cardsPlayed: {},
                votes: {},
                scores: {}
            }
        });

        return this.getGameState(game.id);
    }

    async getGameState(gameId: string) {
        const game = await this.prisma.dixitGame.findUnique({
            where: { id: gameId },
            include: { players: true, rounds: { orderBy: { roundNumber: 'desc' }, take: 1 } }
        });
        return game;
    }

    async setClueAndCard(pin: string, playerId: string, clue: string, cardId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin } });
        if (!game) throw new Error('Game not found');

        // Verify it is storyteller phase and player is storyteller
        if (game.phase !== DixitPhase.STORYTELLER_PICK) throw new Error('Wrong phase');
        if (game.storytellerId !== playerId) throw new Error('Not storyteller'); // Check logic carefully

        // Update Round
        // We need to find current round
        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });

        if (!lastRound) throw new Error('No round found');

        const cardsPlayed = (lastRound.cardsPlayed as any) || {};
        cardsPlayed[playerId] = cardId;

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: {
                clue,
                cardsPlayed
            }
        });

        // Remove card from Hand
        const player = await this.prisma.dixitPlayer.findUnique({ where: { id: playerId } });
        const newHand = player.hand.filter(c => c !== cardId);
        await this.prisma.dixitPlayer.update({
            where: { id: playerId },
            data: { hand: newHand, submittedCardId: cardId }
        });

        // Advance Phase
        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: { phase: DixitPhase.PLAYERS_PICK }
        });

        return await this.getGameState(game.id);
    }

    async submitPlayerCard(pin: string, playerId: string, cardId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        // ... Check phase PLAYERS_PICK
        // ... Check if player already submitted

        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });

        const cardsPlayed = (lastRound.cardsPlayed as any) || {};
        cardsPlayed[playerId] = cardId;

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: { cardsPlayed }
        });

        // Update Hand
        const player = await this.prisma.dixitPlayer.findUnique({ where: { id: playerId } });
        const newHand = player.hand.filter(c => c !== cardId);
        await this.prisma.dixitPlayer.update({
            where: { id: playerId },
            data: { hand: newHand, submittedCardId: cardId }
        });

        // Check if all players (except storyteller) submitted
        // Actually storyteller already submitted in previous step.
        // So check if Object.keys(cardsPlayed).length === game.players.length

        if (Object.keys(cardsPlayed).length === game.players.length) {
            await this.prisma.dixitGame.update({
                where: { id: game.id },
                data: { phase: DixitPhase.VOTING }
            });
        }

        return await this.getGameState(game.id);
    }

    async submitVote(pin: string, voterId: string, targetCardOwnerId: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        // ... Phase VOTING

        const lastRound = await this.prisma.dixitRound.findFirst({
            where: { gameId: game.id },
            orderBy: { roundNumber: 'desc' }
        });

        const votes = (lastRound.votes as any) || {};
        votes[voterId] = targetCardOwnerId;

        await this.prisma.dixitRound.update({
            where: { id: lastRound.id },
            data: { votes }
        });

        // Update player votedCardId temp
        await this.prisma.dixitPlayer.update({
            where: { id: voterId },
            data: { votedCardId: targetCardOwnerId }
        });

        // Check if all voters voted (everyone except storyteller)
        const votersCount = game.players.length - 1;
        if (Object.keys(votes).length >= votersCount) {
            // Calculate scores
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

        const votes = (round.votes as any) || {};
        const storytellerId = round.storytellerId;
        const totalVoters = game.players.length - 1;

        let storytellerPoints = 0;
        let pointsMap: Record<string, number> = {};

        // Initialize points
        game.players.forEach(p => pointsMap[p.id] = 0);

        // Count votes for storyteller
        let correctVotes = 0;
        Object.values(votes).forEach(target => {
            if (target === storytellerId) correctVotes++;
        });

        if (correctVotes === 0 || correctVotes === totalVoters) {
            // Storyteller fails: 0 points. Others: 2 points.
            storytellerPoints = 0;
            game.players.forEach(p => {
                if (p.id !== storytellerId) pointsMap[p.id] += 2;
            });
            // Bonus points for votes on others
            Object.values(votes).forEach((target: string) => {
                if (target !== storytellerId) {
                    pointsMap[target] = (pointsMap[target] || 0) + 1;
                }
            });
        } else {
            // Normal case: Storyteller 3 points
            storytellerPoints = 3;
            pointsMap[storytellerId] += 3;

            // Players who guessed right get 3
            Object.entries(votes).forEach(([voterId, target]: [string, any]) => {
                if (target === storytellerId) {
                    pointsMap[voterId] += 3;
                } else {
                    // Bonus points for the owner of the target card
                    pointsMap[target] = (pointsMap[target] || 0) + 1;
                }
            });
        }

        // Apply updates
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
    }

    async nextRound(pin: string) {
        const game = await this.prisma.dixitGame.findUnique({ where: { pinCode: pin }, include: { players: true } });
        if (!game) throw new Error('Game not found');

        // Rotate storyteller
        const currentIdx = game.players.findIndex(p => p.id === game.storytellerId);
        const nextIdx = (currentIdx + 1) % game.players.length;
        const nextStoryteller = game.players[nextIdx];

        let deck = [...game.deck];

        // Deal 1 card to everyone to back to 6
        for (const player of game.players) {
            // Player hand should have 5 cards now (played 1, maybe voted, but hand only tracks played)
            // Wait, calculateScores updates scores but hands stay same minus updated one
            // We just need to ensure they have 6.
            const needed = 6 - player.hand.length;
            if (needed > 0 && deck.length >= needed) {
                const newCards = deck.splice(0, needed);
                const hand = [...player.hand, ...newCards];
                await this.prisma.dixitPlayer.update({ where: { id: player.id }, data: { hand } });
            }
        }

        // If deck is empty, maybe reshuffle? For now, if empty, we just continue without new cards.

        // Update Game (Phase, Storyteller, Round, Deck)
        await this.prisma.dixitGame.update({
            where: { id: game.id },
            data: {
                phase: DixitPhase.STORYTELLER_PICK,
                storytellerId: nextStoryteller.id,
                currentRound: game.currentRound + 1,
                deck: deck
            }
        });

        // Create new round
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

        // Reset player temp fields
        await this.prisma.dixitPlayer.updateMany({
            where: { gameId: game.id },
            data: { submittedCardId: null, votedCardId: null }
        });

        return await this.getGameState(game.id);
    }

}
