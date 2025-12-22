import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimesUpGame, TimesUpGameStatus, TimesUpPlayer } from '@prisma/client';

@Injectable()
export class TimesUpService {
    constructor(private prisma: PrismaService) { }

    async createGame(data: { teamCount: number; timeLimit: number; category?: string }): Promise<TimesUpGame> {
        const gameCode = this.generateCode();

        const game = await this.prisma.timesUpGame.create({
            data: {
                gameCode,
                teamCount: data.teamCount,
                timeLimit: data.timeLimit,
                category: data.category,
                status: 'LOBBY',
            },
        });

        // Create teams automatically
        await this.createTeams(game.id, data.teamCount);

        return game;
    }

    async createTeams(gameId: number, count: number, names?: string[]) {
        for (let i = 0; i < count; i++) {
            await this.prisma.timesUpTeam.create({
                data: {
                    gameId,
                    name: names?.[i] || `Tým ${i + 1}`,
                    order: i + 1
                }
            });
        }
    }

    async getGame(code: string) {
        return this.prisma.timesUpGame.findUnique({
            where: { gameCode: code },
            include: {
                players: true,
                teams: { include: { players: true } }
            },
        });
    }

    async getGameByHostId(hostId: string) {
        return this.prisma.timesUpGame.findUnique({
            where: { hostId },
            include: {
                players: true,
                teams: { include: { players: true } }
            },
        });
    }

    async getPlayer(playerId: number) {
        return this.prisma.timesUpPlayer.findUnique({
            where: { id: playerId },
            include: { game: true }
        });
    }

    async joinGame(code: string, playerName: string, avatar: string, socketId?: string): Promise<TimesUpPlayer> {
        const game = await this.prisma.timesUpGame.findUnique({ where: { gameCode: code } });
        if (!game) throw new Error('Hra nenalezena');

        return this.prisma.timesUpPlayer.create({
            data: {
                gameId: game.id,
                name: playerName,
                avatar,
                socketId,
                teamId: null // Not assigned yet
            },
        });
    }

    async joinTeam(playerId: number, teamId: number) {
        return this.prisma.timesUpPlayer.update({
            where: { id: playerId },
            data: { teamId }
        });
    }

    async startGame(gameCode: string) {
        const game = await this.prisma.timesUpGame.findUnique({
            where: { gameCode },
            include: { players: true, teams: true }
        });

        if (!game) throw new Error("Game not found");
        //if (game.players.length < 2) throw new Error("Not enough players"); // Disabled for testing

        // 1. Assign players to teams (Round Robin)
        const unassignedPlayers = game.players.filter(p => !p.teamId);
        const teams = game.teams.sort((a, b) => a.order - b.order);

        if (teams.length > 0) {
            for (let i = 0; i < unassignedPlayers.length; i++) {
                const player = unassignedPlayers[i];
                const team = teams[i % teams.length];
                await this.prisma.timesUpPlayer.update({
                    where: { id: player.id },
                    data: { teamId: team.id }
                });
            }
        }

        // 2. Select Cards (e.g., 40 random cards)
        // Taking more to shuffle properly. Ideally filter by category if needed.
        const allCards = await this.prisma.timesUpCard.findMany({ take: 300 });
        const selectedCards = this.shuffleArray(allCards).slice(0, 40);

        for (const card of selectedCards) {
            await this.prisma.timesUpGameCard.create({
                data: {
                    gameId: game.id,
                    value: card.value, // Copy value from TimesUpCard
                    state: 'DECK'
                }
            });
        }

        // 3. Update Game Status
        return this.prisma.timesUpGame.update({
            where: { id: game.id },
            data: {
                status: 'PLAYING',
                currentTeamId: teams[0]?.id, // First team starts
                round: 1
            },
            include: { teams: { include: { players: true } } }
        });
    }

    private shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    private generateCode(): string {
        // Generate random number between 100000 and 999999
        const min = 100000;
        const max = 999999;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
}
