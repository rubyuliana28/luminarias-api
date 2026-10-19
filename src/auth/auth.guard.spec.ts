import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

function crearContexto(headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = { headers };
  const contexto = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { contexto, request };
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    jwtService = { verifyAsync: jest.fn() };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('deja pasar una ruta pública sin token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { contexto } = crearContexto();

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza con 401 si falta el token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { contexto } = crearContexto();

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza con 401 si el token es inválido o vencido', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const { contexto } = crearContexto({
      authorization: 'Bearer token-falso',
    });

    await expect(guard.canActivate(contexto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-falso');
  });

  it('deja pasar con un token válido y guarda el usuario en la petición', async () => {
    const payload = { id: 1, email: 'ana@ejemplo.com', rol: 'admin' };
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { contexto, request } = crearContexto({
      authorization: 'Bearer token-bueno',
    });

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.usuario).toEqual(payload);
  });
});