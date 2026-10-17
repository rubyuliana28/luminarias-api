import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ usuario?: { rol?: string } }>();
    const rol = request.usuario?.rol;
    if (!rol || !rolesRequeridos.includes(rol)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}