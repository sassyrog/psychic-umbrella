import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { RedisService } from 'src/core/redis/redis.service';

type Nullable<T> = T | undefined | null;

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/socket/users',
})
@Injectable()
export class WebsocketsUsersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketsUsersGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly redisService: RedisService) {}

  afterInit(server: Server) {
    this.logger.log('Socket server initialized');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId as string;
    if (!userId) {
      this.logger.warn('Client attempted to connect without userId');
      client.disconnect();
      return;
    }

    await this.redisService.hset('socket:users', userId, client.id);

    await client.join(`user:${userId}`);

    this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
  }

  async handleDisconnect(client: Socket) {
    const userId: string = client.handshake.auth.userId as string;
    if (userId) await this.redisService.hdel('socket:users', userId);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const recipientId: Nullable<string> = payload.recipientId as string;

    return { status: 'ok' };
  }

  async sendToUser(userId: string, event: string, data: any) {
    const socketId = await this.redisService.hget('socket:users', userId);

    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }

    return false;
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
