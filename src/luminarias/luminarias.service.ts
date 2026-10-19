import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLuminariaDto } from './dto/create-luminaria.dto';
import { UpdateLuminariaDto } from './dto/update-luminaria.dto';
import { ListarLuminariasDto } from './dto/listar-luminarias.dto';

@Injectable()
export class LuminariasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLuminariaDto) {
    return this.prisma.luminaria.create({ data: dto });
  }

  async findAll({ sector, page, pageSize }: ListarLuminariasDto) {
    const where = sector ? { sector } : {};
    const [data, total] = await Promise.all([
      this.prisma.luminaria.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.luminaria.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: number) {
    const luminaria = await this.prisma.luminaria.findUnique({ where: { id } });
    if (!luminaria) {
      throw new NotFoundException(`La luminaria ${id} no existe`);
    }
    return luminaria;
  }

  async update(id: number, dto: UpdateLuminariaDto) {
    await this.findOne(id);
    return this.prisma.luminaria.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.luminaria.delete({ where: { id } });
  }
}