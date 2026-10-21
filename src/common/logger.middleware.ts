import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const inicio = Date.now();

    // 'finish' se dispara cuando la respuesta ya se envió:
    // en ese momento ya se conoce el código de estado.
    res.on('finish', () => {
      const ms = Date.now() - inicio;
      this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms} ms`);
    });

    next(); // sin esto, la petición se queda colgada
  }
}