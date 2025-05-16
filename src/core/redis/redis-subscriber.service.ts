import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private subscriberClient: Redis;
  private redisDb: number;
  private messageSubject = new Subject<{ channel: string; message: string }>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.redisDb = this.configService.get<number>('REDIS_DB', 0);
    this.subscriberClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      db: this.redisDb,
    });

    await this.subscriberClient.config('SET', 'notify-keyspace-events', 'Ex');
    const expiredChannel = `__keyevent@${this.redisDb}__:expired`;
    await this.subscriberClient.subscribe(expiredChannel);

    this.subscriberClient.on('message', (channel, message) => {
      this.messageSubject.next({ channel, message });
    });
  }

  get expiredKeys$(): Observable<string> {
    return this.messageSubject.pipe(
      filter(
        ({ channel }) => channel === `__keyevent@${this.redisDb}__:expired`,
      ),
      map(({ message }) => message),
    );
  }

  onModuleDestroy() {
    this.subscriberClient?.disconnect();
  }
}
