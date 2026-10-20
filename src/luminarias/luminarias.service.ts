import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLuminariaDto } from './dto/create-luminaria.dto';
import { UpdateLuminariaDto } from './dto/update-luminaria.dto';
import { ListarLuminariasDto } from './dto/listar-luminarias.dto';
import { MensajeTrabajo, SqsService } from './sqs.service';

@Injectable()
export class LuminariasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqs: SqsService,
  ) {}

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

  // Primero se guarda el trabajo y luego se envía a la cola: así el
  // consumidor siempre encuentra la fila cuando le llega el mensaje.
  async encolarResumenSectores() {
    const trabajo = await this.prisma.trabajo.create({
      data: { tipo: 'resumen-sectores' },
    });
    try {
      await this.sqs.enviar({ trabajoId: trabajo.id, tipo: trabajo.tipo });
    } catch (error) {
      await this.prisma.trabajo.update({
        where: { id: trabajo.id },
        data: { estado: 'fallido', error: 'No se pudo enviar a la cola' },
      });
      throw error;
    }
    return { trabajoId: trabajo.id };
  }

  async estadoResumenSectores(trabajoId: string) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: { id: trabajoId },
    });
    if (!trabajo) {
      throw new NotFoundException(`El trabajo ${trabajoId} no existe`);
    }
    return {
      trabajoId: trabajo.id,
      estado: trabajo.estado,
      resultado: trabajo.resultado,
      error: trabajo.error,
    };
  }

  // Lo llama el consumidor de SQS. Es idempotente: SQS puede entregar el
  // mismo mensaje más de una vez, y un trabajo completado no se repite.
  async procesarTrabajo({ trabajoId }: MensajeTrabajo) {
    const trabajo = await this.prisma.trabajo.findUnique({
      where: { id: trabajoId },
    });
    if (!trabajo) {
      throw new Error(`El trabajo ${trabajoId} no existe`);
    }
    if (trabajo.estado === 'completado') {
      return;
    }

    await this.prisma.trabajo.update({
      where: { id: trabajoId },
      data: { estado: 'procesando' },
    });
    try {
      if (trabajo.tipo !== 'resumen-sectores') {
        throw new Error(`Trabajo desconocido: ${trabajo.tipo}`);
      }
      const resultado = await this.resumenSectores();
      await this.prisma.trabajo.update({
        where: { id: trabajoId },
        data: { estado: 'completado', resultado, error: null },
      });
    } catch (error) {
      await this.prisma.trabajo.update({
        where: { id: trabajoId },
        data: { estado: 'fallido', error: (error as Error).message },
      });
      throw error;
    }
  }

  async resumenSectores() {
    const grupos = await this.prisma.luminaria.groupBy({
      by: ['sector'],
      _count: { _all: true },
      orderBy: { sector: 'asc' },
    });
    return grupos.map((g) => ({ sector: g.sector, luminarias: g._count._all }));
  }
}