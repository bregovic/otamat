import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TimesUpService } from './timesup.service';

@WebSocketGateway({ namespace: 'timesup', cors: { origin: '*' } })
export class TimesUpGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly timesupService: TimesUpService) { }

    @SubscribeMessage('timesup:create')
    async handleCreateGame(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        try {
            console.log("TimesUp: Creating game with params:", data);
            const game = await this.timesupService.createGame(data);
            client.join(game.hostId);
            client.join(game.gameCode);
            client.emit('timesup:created', game);
            return { success: true, game };
        } catch (e) {
            console.error("TimesUp create error:", e);
            client.emit('timesup:error', { message: 'Failed to create game', details: e.message });
            return { success: false, error: e.message };
        }
    }

    @SubscribeMessage('timesup:join')
    async handleJoinGame(@MessageBody() data: { code: string, name: string, avatar: string }, @ConnectedSocket() client: Socket) {
        try {
            const player = await this.timesupService.joinGame(data.code, data.name, data.avatar, client.id);
            client.join(data.code);

            this.server.to(data.code).emit('timesup:playerJoined', player);
            return { success: true, playerId: player.id, gameCode: data.code };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @SubscribeMessage('timesup:getHostGame')
    async handleGetHostGame(@MessageBody() data: { hostId: string }, @ConnectedSocket() client: Socket) {
        const game = await this.timesupService.getGameByHostId(data.hostId);
        if (game) {
            client.join(game.gameCode);
            console.log('Sending host game data');
            client.emit('timesup:gameData', game);
            return { success: true, game };
        } else {
            return { success: false, error: 'Hra nenalezena' };
        }
    }
    @SubscribeMessage('timesup:rejoin')
    async handleRejoinGame(@MessageBody() data: { playerId: number }, @ConnectedSocket() client: Socket) {
        try {
            const player = await this.timesupService.getPlayer(data.playerId);
            if (player) {
                client.join(player.game.gameCode);
                return { success: true, gameCode: player.game.gameCode, player };
            }
            return { success: false, error: 'Hráč nenalezen' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @SubscribeMessage('timesup:startGame')
    async handleStartGame(@MessageBody() data: { gameCode: string }, @ConnectedSocket() client: Socket) {
        try {
            console.log("Starting game:", data.gameCode);
            const game = await this.timesupService.startGame(data.gameCode);
            this.server.to(data.gameCode).emit('timesup:gameStarted', game);
            return { success: true };
        } catch (e) {
            console.error("Start game failed:", e);
            return { success: false, error: e.message };
        }
    }
}
