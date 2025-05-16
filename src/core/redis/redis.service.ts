import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger: Logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      db: this.configService.get<number>('REDIS_DB', 0),
      keyPrefix: this.configService.get<string>('REDIS_PREFIX', ''),
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected successfully');
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Set a key-value pair with optional expiration
   * @param key Redis key
   * @param value Value to store
   * @param ttl Time to live in seconds (optional)
   */
  async set(
    key: string,
    value: string | number | Buffer,
    ttl?: number,
  ): Promise<'OK'> {
    if (ttl) {
      return this.redisClient.set(key, value, 'EX', ttl);
    }
    return this.redisClient.set(key, value);
  }

  /**
   * Get a value by key
   * @param key Redis key
   */
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  /**
   * Delete a key
   * @param key Redis key
   */
  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.redisClient.del(...key);
    }
    return this.redisClient.del(key);
  }

  /**
   * Check if a key exists
   * @param key Redis key
   */
  async exists(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.redisClient.exists(...key);
    }
    return this.redisClient.exists(key);
  }

  /**
   * Set expiration on a key
   * @param key Redis key
   * @param seconds TTL in seconds
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.redisClient.expire(key, seconds);
  }

  /**
   * Get the remaining time to live of a key in seconds
   * @param key Redis key to check the TTL for
   * @returns A Promise that resolves to the TTL in seconds, or -2 if the key doesn't exist,
   *          or -1 if the key exists but has no associated expiration time
   */
  async ttl(key: string): Promise<number | null> {
    return this.redisClient.ttl(key);
  }

  /**
   * Set a hash field
   * @param key Redis key
   * @param field Hash field
   * @param value Value to store
   */
  async hset(
    key: string,
    field: string,
    value: string | number,
  ): Promise<number> {
    return this.redisClient.hset(key, field, value);
  }

  /**
   * Get a hash field
   * @param key Redis key
   * @param field Hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.redisClient.hget(key, field);
  }

  /**
   * Get all hash fields and values
   * @param key Redis key
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(key);
  }

  /**
   * Increment a key by 1 or the given amount
   * @param key Redis key
   * @param increment Amount to increment by (default: 1)
   */
  async incr(key: string, increment = 1): Promise<number> {
    if (increment === 1) {
      return this.redisClient.incr(key);
    }
    return this.redisClient.incrby(key, increment);
  }

  /**
   * Add members to a set
   * @param key Redis key
   * @param members Members to add
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.sadd(key, ...members);
  }

  /**
   * Get all members of a set
   * @param key Redis key
   */
  async smembers(key: string): Promise<string[]> {
    return this.redisClient.smembers(key);
  }

  /**
   * Remove a field from a hash
   * @param key Redis key
   * @param field Hash field
   */
  async hdel(key: string, field: string): Promise<number> {
    return this.redisClient.hdel(key, field);
  }

  /**
   * Push a value to the end of a list
   * @param key Redis key
   * @param value Value to push
   */
  async rpush(key: string, value: string): Promise<number> {
    return this.redisClient.rpush(key, value);
  }

  /**
   * Get all values from a list
   * @param key Redis key
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redisClient.lrange(key, start, stop);
  }

  /**
   * Remove and get the first element of a list
   * @param key Redis key
   */
  async lpop(key: string): Promise<string | null> {
    return this.redisClient.lpop(key);
  }

  /**
   * Execute a Redis transaction
   * @param commands Array of command arrays to execute in the transaction
   */

  async transaction(commands: string[][]): Promise<any[]> {
    const multi = this.redisClient.multi();
    commands.forEach((command) => {
      const [cmd, ...args] = command;
      multi.call(cmd, ...args);
    });
    const result = await multi.exec();
    return result === null
      ? []
      : result.map(([error, value]) => {
          if (error) throw error;
          return value;
        });
  }

  /**
   * Execute a Lua script
   * @param script Lua script
   * @param keys Array of keys
   * @param args Array of arguments
   */
  async eval(script: string, keys: string[], args: any[]): Promise<any> {
    return this.redisClient.eval(script, keys.length, ...keys, ...args);
  }

  /**
   * Publish message to a channel
   * @param channel Channel name
   * @param message Message to publish
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.redisClient.publish(channel, message);
  }

  /**
   * Subscribe to a channel
   * @param channel Channel name
   * @param callback Function to call when a message is received
   */
  async subscribe(
    channel: string,
    callback: (channel: string, message: string) => void,
  ): Promise<void> {
    await this.redisClient.subscribe(channel);
    this.redisClient.on('message', callback);
  }
}
