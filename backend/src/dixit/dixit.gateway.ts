import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DixitService } from './dixit.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class DixitGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly dixitService: DixitService) { }

    afterInit(server: Server) {
        this.dixitService.setServer(server);
    }

    @SubscribeMessage('dixit:create')
    async handleCreateGame(
        @MessageBody() data: { hostId?: string; guestInfo?: { nickname: string; avatar: string } },
        @ConnectedSocket() client: Socket,
    ) {
        const game = await this.dixitService.createGame(data.hostId, data.guestInfo);
        client.join(game.pinCode);
        return { event: 'dixit:created', data: game };
    }

    @SubscribeMessage('dixit:join')
    async handleJoinGame(
        @MessageBody() data: { pin: string; nickname: string; avatar: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const { game, player } = await this.dixitService.joinGame(
                data.pin,
                data.nickname,
                data.avatar,
            );
            client.join(data.pin);
            // Emit update to room
            const gameState = await this.dixitService.getGameState(game.id);
            this.server.to(data.pin).emit('dixit:update', gameState);
            return { success: true, playerId: player.id };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Watch game (for host/screen)
    @SubscribeMessage('dixit:watch')
    async handleWatchGame(
        @MessageBody() data: { pin: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.join(data.pin);
        // Send current state
        // We need gameId from pin
        // We don't have getGameByPin exposed efficiently without joining, but let's assume ...
        // Actually we can just wait for next update or fetch it.
        // Better: find game by pin
        // const game = ... 
        // For now, client will just receive updates.
        return { success: true };
    }

    @SubscribeMessage('dixit:start')
    async handleStartGame(@MessageBody() data: { pin: string }) {
        const gameState = await this.dixitService.startGame(data.pin);
        this.server.to(data.pin).emit('dixit:update', gameState);
    }

    @SubscribeMessage('dixit:setClue')
    async handleSetClue(
        @MessageBody() data: { pin: string; playerId: string; clue: string; cardId: string },
    ) {
        const gameState = await this.dixitService.setClueAndCard(
            data.pin,
            data.playerId,
            data.clue,
            data.cardId,
        );
        this.server.to(data.pin).emit('dixit:update', gameState);
    }

    @SubscribeMessage('dixit:submitCard')
    async handleSubmitCard(
        @MessageBody() data: { pin: string; playerId: string; cardId: string },
    ) {
        const gameState = await this.dixitService.submitPlayerCard(
            data.pin,
            data.playerId,
            data.cardId
        );
        this.server.to(data.pin).emit('dixit:update', gameState);
    }

    @SubscribeMessage('dixit:vote')
    async handleVote(
        @MessageBody() data: { pin: string; playerId: string; targetCardOwnerId: string },
    ) {
        const gameState = await this.dixitService.submitVote(
            data.pin,
            data.playerId,
            data.targetCardOwnerId
        );
        this.server.to(data.pin).emit('dixit:update', gameState);
    }

    @SubscribeMessage('dixit:nextRound')
    async handleNextRound(
        @MessageBody() data: { pin: string }
    ) {
        const gameState = await this.dixitService.nextRound(data.pin);
        this.server.to(data.pin).emit('dixit:update', gameState);
    }
}
