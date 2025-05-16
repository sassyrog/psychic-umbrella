import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisSubscriberService } from './redis-subscriber.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, RedisSubscriberService],
  exports: [RedisService, RedisSubscriberService],
})
export class RedisModule {}
