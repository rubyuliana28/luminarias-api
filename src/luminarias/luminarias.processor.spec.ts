import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LuminariasProcessor } from './luminarias.processor';

describe('LuminariasProcessor', () => {
  const prismaFalso = { luminaria: { groupBy: jest.fn() } };
  let processor: LuminariasProcessor;

  beforeEach(() => {
    jest.resetAllMocks();
    processor = new LuminariasProcessor(
      prismaFalso as unknown as PrismaService,
    );
  });

  it('resumen-sectores cuenta las luminarias por sector', async () => {
    prismaFalso.luminaria.groupBy.mockResolvedValue([
      { sector: 'COMUNA 1', _count: { _all: 976 } },
      { sector: 'ZARAGOZA', _count: { _all: 837 } },
    ]);

    const resultado = await processor.process({
      name: 'resumen-sectores',
    } as unknown as Job);

    expect(resultado).toEqual([
      { sector: 'COMUNA 1', luminarias: 976 },
      { sector: 'ZARAGOZA', luminarias: 837 },
    ]);
  });

  it('falla si el trabajo es desconocido', async () => {
    await expect(
      processor.process({ name: 'otro' } as unknown as Job),
    ).rejects.toThrow('Trabajo desconocido');
  });
});