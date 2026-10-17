import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let servicio: AuthService;

  const prismaFalso = {
    usuario: { findUnique: jest.fn(), create: jest.fn() },
  };
  const jwtFalso = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaFalso },
        { provide: JwtService, useValue: jwtFalso },
      ],
    }).compile();

    servicio = module.get<AuthService>(AuthService);
  });

  it('register guarda el hash y no la contraseña', async () => {
    prismaFalso.usuario.findUnique.mockResolvedValue(null);
    prismaFalso.usuario.create.mockResolvedValue({
      id: 1,
      email: 'ana@ejemplo.com',
      rol: 'operador',
    });

    await servicio.register({ email: 'ana@ejemplo.com', password: 'Clave12345' });

    const datos = prismaFalso.usuario.create.mock.calls[0][0].data;
    expect(datos.passwordHash).not.toBe('Clave12345');
    expect(await bcrypt.compare('Clave12345', datos.passwordHash)).toBe(true);
  });

  it('register lanza ConflictException si el correo ya existe', async () => {
    prismaFalso.usuario.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      servicio.register({ email: 'ana@ejemplo.com', password: 'Clave12345' }),
    ).rejects.toThrow(ConflictException);
  });

  it('login devuelve un token si la contraseña es correcta', async () => {
    const passwordHash = await bcrypt.hash('Clave12345', 4);
    prismaFalso.usuario.findUnique.mockResolvedValue({
      id: 1,
      email: 'ana@ejemplo.com',
      passwordHash,
      rol: 'admin',
    });
    jwtFalso.signAsync.mockResolvedValue('token-falso');

    const resultado = await servicio.login({
      email: 'ana@ejemplo.com',
      password: 'Clave12345',
    });

    expect(resultado).toEqual({ access_token: 'token-falso' });
    expect(jwtFalso.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'ana@ejemplo.com',
      rol: 'admin',
    });
  });

  it('login lanza UnauthorizedException si la contraseña es incorrecta', async () => {
    const passwordHash = await bcrypt.hash('Clave12345', 4);
    prismaFalso.usuario.findUnique.mockResolvedValue({
      id: 1,
      email: 'ana@ejemplo.com',
      passwordHash,
      rol: 'operador',
    });

    await expect(
      servicio.login({ email: 'ana@ejemplo.com', password: 'incorrecta' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login lanza UnauthorizedException si el usuario no existe', async () => {
    prismaFalso.usuario.findUnique.mockResolvedValue(null);

    await expect(
      servicio.login({ email: 'nadie@ejemplo.com', password: 'Clave12345' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});