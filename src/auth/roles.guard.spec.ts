import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function crearContexto(usuario?: { rol?: string }) {
  const request = { usuario };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('deja pasar si la ruta no exige ningún rol', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(crearContexto())).toBe(true);
  });

  it('rechaza con 403 si la ruta exige rol y no hay usuario', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(crearContexto())).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza con 403 si el rol del usuario no está permitido', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(crearContexto({ rol: 'operador' }))).toThrow(
      ForbiddenException,
    );
  });

  it('deja pasar si el rol del usuario está permitido', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(crearContexto({ rol: 'admin' }))).toBe(true);
  });
});