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
        const game = await this.timesupService.createGame(data);
        client.join(game.hostId);
        client.join(game.gameCode);

        // We emit back event 'timesup:gameCreated'
        // The client should listen to this.
        // Note: My previous TimesUp client listened to 'gameCreated' (without prefix). 
        // I should update client code to match, or use 'gameCreated' here.
        // Since we are namespaced to /timesup, 'gameCreated' is fine within that namespace.
        // But consistent naming 'timesup:xxx' is better for debugging.
        // Let's stick to 'timesup:created' to match OtaMat patterns.
        client.emit('timesup:created', game);
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
}
