import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('Ese correo ya está registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: { email: dto.email, passwordHash },
    });
    return { id: usuario.id, email: usuario.email, rol: usuario.rol };
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    const coincide = usuario
      ? await bcrypt.compare(dto.password, usuario.passwordHash)
      : false;
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}