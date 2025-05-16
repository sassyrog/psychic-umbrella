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
  namespace: '/socket/devices',
})
@Injectable()
export class WebsocketsDevicesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketsDevicesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly redisService: RedisService) {}

  afterInit(server: Server) {
    this.logger.log('Socket server initialized');
  }

  async handleConnection(client: Socket) {
    const deviceKey = client.handshake.auth.deviceKey as string;

    if (!deviceKey) {
      this.logger.warn('Client attempted to connect without deviceKey');
      client.disconnect();
      return;
    }

    await this.redisService.hset('socket:devices', deviceKey, client.id);

    await client.join(`device:${deviceKey}`);

    this.logger.log(`Client connected: ${client.id}, deviceKey: ${deviceKey}`);
  }

  async handleDisconnect(client: Socket) {
    const deviceKey: string = client.handshake.auth.deviceKey as string;
    if (deviceKey) await this.redisService.hdel('socket:devices', deviceKey);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    this.logger.log(`Message received: ${JSON.stringify(payload)}`);
    const recipientId: Nullable<string> = payload.recipientId as string;

    return { status: 'ok' };
  }

  async sendToDevice(deviceKey: string, event: string, data: any) {
    const socketId = await this.redisService.hget('socket:devices', deviceKey);

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
