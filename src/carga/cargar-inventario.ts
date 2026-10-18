import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { leerFilas, partirEnLotes } from './inventario';

const TAMANO_LOTE = 1000;

// Un módulo mínimo: solo lo que la carga necesita (configuración y base de datos).
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule] })
class CargaModule {}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    throw new Error(
      'Indica la ruta del CSV: npm run cargar:inventario -- "ruta\\luminarias_para_cargar.csv"',
    );
  }

  const { filas, descartadas } = leerFilas(readFileSync(ruta, 'utf-8'));
  console.log(`Filas leídas: ${filas.length} (descartadas: ${descartadas})`);

  // Aplicación de Nest sin servidor web: sirve para scripts y tareas.
  const app = await NestFactory.createApplicationContext(CargaModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const url = new URL(app.get(ConfigService).getOrThrow<string>('DATABASE_URL'));
    console.log(`Base de datos: ${url.hostname}:${url.port}${url.pathname}`);

    const lotes = partirEnLotes(filas, TAMANO_LOTE);
    const inicio = Date.now();

    // Todo o nada: si un lote falla, se deshace todo (rollback).
    await prisma.$transaction([
      prisma.luminaria.deleteMany({ where: { codigo: { not: null } } }),
      ...lotes.map((lote) => prisma.luminaria.createMany({ data: lote })),
    ]);

    console.log(
      `Cargadas ${filas.length} luminarias en ${lotes.length} lotes: ${Date.now() - inicio} ms`,
    );

    const porSector = await prisma.luminaria.groupBy({
      by: ['sector'],
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
    });
    console.table(
      porSector.map((s) => ({ sector: s.sector, luminarias: s._count._all })),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});