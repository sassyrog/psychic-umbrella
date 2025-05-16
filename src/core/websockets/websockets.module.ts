import { Module } from '@nestjs/common';
import { WebsocketsUsersGateway } from './websockets.users.gateway';
import { RedisModule } from 'src/core/redis/redis.module';
import { WebsocketsDevicesGateway } from './websockets.devices.gateway';

@Module({
  imports: [RedisModule],
  providers: [WebsocketsUsersGateway, WebsocketsDevicesGateway],
  exports: [WebsocketsUsersGateway, WebsocketsDevicesGateway],
})
export class WebsocketsModule {}
