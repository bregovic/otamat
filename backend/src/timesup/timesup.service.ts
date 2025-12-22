import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimesUpGame, TimesUpGameStatus, TimesUpPlayer } from '@prisma/client';

@Injectable()
export class TimesUpService {
    constructor(private prisma: PrismaService) { }

    async createGame(data: {
        hostName: string;
        hostAvatar: string;
        mode: 'LOBBY' | 'SINGLE_DEVICE';
        players?: string[]; // Manual players list
        teamCount: number;
        timeLimit: number;

        // New filters
        difficulty?: number; // 1 (Default), 2, 3, 0 (Kids)
        selectedCategories?: string[]; // Array of categories
    }): Promise<TimesUpGame> {
        const gameCode = this.generateCode();
        const hostId = Math.random().toString(36).substring(2) + Date.now().toString(36);

        const game = await this.prisma.timesUpGame.create({
            data: {
                gameCode,
                hostId,
                teamCount: data.teamCount,
                timeLimit: data.timeLimit,
                status: 'LOBBY',
                difficulty: data.difficulty ?? 1,
                selectedCategories: data.selectedCategories ? data.selectedCategories.join(';') : null
            },
        });

        // 1. Create teams structure
        await this.createTeams(game.id, data.teamCount);

        // 2. Add Host as a player
        if (data.hostName) {
            await this.prisma.timesUpPlayer.create({
                data: {
                    gameId: game.id,
                    name: data.hostName,
                    avatar: data.hostAvatar || '👑',
                    isHost: true,
                }
            });
        }

        // 3. If SINGLE_DEVICE mode, add manual players
        if (data.mode === 'SINGLE_DEVICE' && data.players && data.players.length > 0) {
            for (const name of data.players) {
                // Skip if name is same as host (already added)
                if (name === data.hostName) continue;

                await this.prisma.timesUpPlayer.create({
                    data: {
                        gameId: game.id,
                        name: name,
                        avatar: '👤', // Default avatar
                        isHost: false
                    }
                });
            }
        }

        return this.getGameByHostId(game.hostId) as any;
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

        // 2. Select Cards based on Difficulty and Categories
        let whereClause: any = {};

        // Difficulty: 0=Kids, 1=Lvl1, 2=Lvl1+2, 3=All (Adults)
        if (game.difficulty === 0) {
            whereClause.level = 0;
        } else if (game.difficulty === 1) {
            whereClause.level = 1;
        } else if (game.difficulty === 2) {
            whereClause.level = { in: [1, 2] };
        } else {
            // Level 3 (Default) -> Everything >= 1
            whereClause.level = { gte: 1 };
        }

        // Fetch all potentially matching cards
        let allCards = await this.prisma.timesUpCard.findMany({
            where: whereClause
        });

        // Filter by Categories (In-Memory because of semicolon separation)
        if (game.selectedCategories && game.selectedCategories.trim().length > 0) {
            const selectedCats = game.selectedCategories.split(';');
            allCards = allCards.filter(card => {
                if (!card.category) return false;
                // Split card categories (e.g. "Osobnosti;Politika;Česko")
                const cardCats = card.category.split(';');
                // Check if there is ANY intersection
                return cardCats.some(c => selectedCats.includes(c));
            });
        }

        // Security check: If selection results in too few cards, create fallback?
        // Or just let it be. If 0 cards, game is instant over or error?
        if (allCards.length < 10) {
            console.warn(`Warning: Only ${allCards.length} cards found for Diff=${game.difficulty}, Cats=${game.selectedCategories}. Fallback to ignores category.`);
            // Fallback - ignore category, keep difficulty
            allCards = await this.prisma.timesUpCard.findMany({
                where: whereClause,
                take: 100 // fallback limit
            });
        }

        const selectedCards = this.shuffleArray(allCards).slice(0, 40);

        for (const card of selectedCards) {
            await this.prisma.timesUpGameCard.create({
                data: {
                    gameId: game.id,
                    value: card.value,
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

    // --- CARD MANAGEMENT (ADMIN) ---
    // --- CARD MANAGEMENT (ADMIN) ---
    async getAllCards() {
        return this.prisma.timesUpCard.findMany({
            orderBy: { id: 'desc' },
            take: 2000
        });
    }

    async getUniqueCategories() {
        // Fetch all categories strings
        const cards = await this.prisma.timesUpCard.findMany({
            select: { category: true }
        });

        // Split and deduplicate
        const unique = new Set<string>();
        for (const c of cards) {
            if (c.category) {
                c.category.split(';').forEach(cat => {
                    const trimmed = cat.trim();
                    if (trimmed) unique.add(trimmed);
                });
            }
        }
        return Array.from(unique).sort();
    }

    async createCard(data: { value: string, category: string, level: number, description?: string }) {
        return this.prisma.timesUpCard.create({ data });
    }

    async updateCard(id: number, data: { value?: string, category?: string, level?: number, description?: string }) {
        return this.prisma.timesUpCard.update({ where: { id }, data });
    }

    async deleteCard(id: number) {
        return this.prisma.timesUpCard.delete({ where: { id } });
    }

    async importCards(cards: { value: string, category: string, level: number, description?: string }[]) {
        return this.prisma.timesUpCard.createMany({
            data: cards,
            skipDuplicates: true
        });
    }
}
