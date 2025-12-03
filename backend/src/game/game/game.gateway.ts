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

@WebSocketGateway({
  cors: {
    origin: '*', // In production, change this to your frontend URL
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('GameGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: { pin: string; nickname: string; avatar: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} joining game ${data.pin} as ${data.nickname}`);

    // Join the room based on PIN
    client.join(data.pin);

    // Notify everyone in the room (including the host) that a player joined
    this.server.to(data.pin).emit('playerJoined', {
      id: client.id,
      nickname: data.nickname,
      avatar: data.avatar,
    });

    return { success: true, message: 'Joined game successfully' };
  }

  // In-memory storage for games: { pin: { title: string, players: [] } }
  private games = new Map<string, { title: string; players: any[] }>();

  @SubscribeMessage('createGame')
  handleCreateGame(
    @MessageBody() data: { title: string; questions: any[] },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} creating game: ${data.title}`);

    // Generate a random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Store game in memory
    this.games.set(pin, { title: data.title, players: [] });

    // Join the host to the room so they receive updates
    client.join(pin);

    this.logger.log(`Game created with PIN: ${pin}`);

    return { success: true, pin: pin };
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() data: { pin: string; nickname: string; avatar: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} joining game ${data.pin} as ${data.nickname}`);

    const game = this.games.get(data.pin);
    if (!game) {
      return { success: false, message: 'Hra s tímto PINem neexistuje.' };
    }

    // Join the room based on PIN
    client.join(data.pin);

    // Add player to game state
    const player = { id: client.id, nickname: data.nickname, avatar: data.avatar };
    game.players.push(player);

    // Notify everyone in the room (including the host) that a player joined
    this.server.to(data.pin).emit('playerJoined', player);

    // Also send the full list of players to the new joiner (or everyone to be safe)
    this.server.to(data.pin).emit('updatePlayerList', game.players);

    return { success: true, message: 'Joined game successfully' };
  }

  @SubscribeMessage('startGame')
  handleStartGame(@MessageBody() data: { pin: string }) {
    this.logger.log(`Starting game ${data.pin}`);
    this.server.to(data.pin).emit('gameStarted');
    return { success: true };
  }
}
