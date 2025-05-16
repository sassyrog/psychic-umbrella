import { Injectable } from '@nestjs/common';
import { WebsocketsUsersGateway } from './websockets.users.gateway';
import { WebsocketsDevicesGateway } from './websockets.devices.gateway';

@Injectable()
export class WebsocketsService {
  constructor(
    private readonly wsUG: WebsocketsUsersGateway,
    private readonly wsDG: WebsocketsDevicesGateway,
  ) {}

  // Send a message to a specific user
  async sendToUser(userId: string, event: string, data: any): Promise<boolean> {
    return this.wsUG.sendToUser(userId, event, data);
  }

  // Send a message to a specific device
  async sendToDevice(
    deviceKey: string,
    event: string,
    data: any,
  ): Promise<boolean> {
    return this.wsDG.sendToDevice(deviceKey, event, data);
  }

  // Broadcast a message to all connected clients
  broadcast(event: string, data: any): void {
    this.wsUG.broadcast(event, data);
  }
}
