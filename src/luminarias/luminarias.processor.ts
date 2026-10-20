import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('inventario')
export class LuminariasProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'resumen-sectores') {
      const grupos = await this.prisma.luminaria.groupBy({
        by: ['sector'],
        _count: { _all: true },
        orderBy: { sector: 'asc' },
      });
      return grupos.map((g) => ({ sector: g.sector, luminarias: g._count._all }));
    }
    throw new Error(`Trabajo desconocido: ${job.name}`);
  }
}