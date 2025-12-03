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

  @SubscribeMessage('createGame')
  handleCreateGame(
    @MessageBody() data: { title: string; questions: any[] },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} creating game: ${data.title}`);

    // Generate a random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Store game in memory (TODO: Persist to DB)
    // For now, we just join the host to the room so they receive updates
    client.join(pin);

    this.logger.log(`Game created with PIN: ${pin}`);

    return { success: true, pin: pin };
  }
}
