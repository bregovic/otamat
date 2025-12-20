import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DixitService } from './dixit.service';

@WebSocketGateway({ namespace: 'dixit', cors: { origin: '*' } })
export class DixitGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('dixit:ping')
    handlePing() {
        return { message: 'pong' };
    }

    constructor(private readonly dixitService: DixitService) { }

    afterInit(server: Server) {
        this.dixitService.setServer(server);
    }

    @SubscribeMessage('dixit:create')
    async handleCreateGame(
        @MessageBody() data: { hostId?: string; guestInfo?: { nickname: string; avatar: string } },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            console.log('Received dixit:create request', { hasHostId: !!data.hostId, hasGuest: !!data.guestInfo });

            // Pass the progress callback
            const { game, playerId } = await this.dixitService.createGame(
                data.hostId,
                data.guestInfo,
                (msg) => client.emit('dixit:debug_log', msg) // Send debug logs to client
            );

            console.log('Game created successfully:', game?.id, 'Player:', playerId);
            if (game) {
                client.join(game.pinCode);
                // Emit to room so all spectators get the update
                this.server.to(game.pinCode).emit('dixit:update', game);
            }
            return { success: true, event: 'dixit:created', game, playerId, pinCode: game?.pinCode };
        } catch (e) {
            console.error('Error in dixit:create:', e);
            client.emit('dixit:debug_log', 'CRITICAL ERROR: ' + e.message);
            return { success: false, error: e.message || 'Unknown backend error' };
        }
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

    // Watch/Spectate game (for Board/TV screen)
    @SubscribeMessage('dixit:watch')
    async handleWatchGame(
        @MessageBody() data: { pin: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const gameState = await this.dixitService.getGameStateByPin(data.pin);
            if (!gameState) {
                return { success: false, error: 'Hra nenalezena' };
            }
            client.join(data.pin);
            client.emit('dixit:update', gameState);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @SubscribeMessage('dixit:spectate')
    async handleSpectateGame(
        @MessageBody() data: { pin: string },
        @ConnectedSocket() client: Socket,
    ) {
        return this.handleWatchGame(data, client);
    }

    @SubscribeMessage('dixit:start')
    async handleStartGame(@MessageBody() data: { pin: string; storytellerId?: string }) {
        const gameState = await this.dixitService.startGame(data.pin, data.storytellerId);
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
        @MessageBody() data: { pin: string; playerId: string; targetCardId: string },
    ) {
        const gameState = await this.dixitService.submitVote(
            data.pin,
            data.playerId,
            data.targetCardId
        );
        this.server.to(data.pin).emit('dixit:update', gameState);
    }

    @SubscribeMessage('dixit:claimStoryteller')
    async handleClaimStoryteller(
        @MessageBody() data: { pin: string; playerId: string }
    ) {
        const gameState = await this.dixitService.claimStoryteller(data.pin, data.playerId);
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
