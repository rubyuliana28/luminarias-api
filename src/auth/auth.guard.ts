import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
type RequestConUsuario = Request & { usuario?: unknown };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublica) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = this.extraerToken(request);
    if (!token) {
      throw new UnauthorizedException('Falta el token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.usuario = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }
    return true;
  }

  private extraerToken(request: Request): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}