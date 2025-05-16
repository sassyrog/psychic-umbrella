import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'production') {
      const params = Object.keys(req.params || {}).length
        ? ` Params: ${JSON.stringify(req.params)}`
        : '';
      this.logger.log(`${req.method} ${req.url}${params}`);
    }
    next();
  }
}
