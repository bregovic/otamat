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

    private generateCode(): string {
        // Generate random number between 100000 and 999999
        const min = 100000;
        const max = 999999;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }
}
