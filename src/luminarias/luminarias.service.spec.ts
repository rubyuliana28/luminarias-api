import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LuminariasService } from './luminarias.service';

describe('LuminariasService', () => {
  let servicio: LuminariasService;

  // Prisma falso: solo tiene los métodos que usa el servicio.
  const prismaFalso = {
    luminaria: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

    // Cola falsa: solo tiene el método que usa el servicio.
  const colaFalsa = { add: jest.fn(), getJob: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
        providers: [
        LuminariasService,
        { provide: PrismaService, useValue: prismaFalso },
        { provide: getQueueToken('inventario'), useValue: colaFalsa },
      ],
    }).compile();

    servicio = module.get<LuminariasService>(LuminariasService);
  });

  it('should be defined', () => {
    expect(servicio).toBeDefined();
  });

  it('findAll devuelve la página pedida con el total', async () => {
    const lista = [{ id: 1, sector: 'COMUNA 5', potencia: 70, estado: 'encendida' }];
    prismaFalso.luminaria.findMany.mockResolvedValue(lista);
    prismaFalso.luminaria.count.mockResolvedValue(45);

    const resultado = await servicio.findAll({ page: 2, pageSize: 20 });

    expect(resultado).toEqual({
      data: lista,
      total: 45,
      page: 2,
      pageSize: 20,
      totalPages: 3,
    });
    expect(prismaFalso.luminaria.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { id: 'asc' },
      skip: 20,
      take: 20,
    });
  });

  it('findAll filtra por sector y cuenta solo ese sector', async () => {
    prismaFalso.luminaria.findMany.mockResolvedValue([]);
    prismaFalso.luminaria.count.mockResolvedValue(0);

    await servicio.findAll({ sector: 'COMUNA 5', page: 1, pageSize: 20 });

    expect(prismaFalso.luminaria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sector: 'COMUNA 5' } }),
    );
    expect(prismaFalso.luminaria.count).toHaveBeenCalledWith({
      where: { sector: 'COMUNA 5' },
    });
  });

  it('findOne devuelve la luminaria si existe', async () => {
    const luminaria = { id: 1, sector: 'Norte', potencia: 70, estado: 'encendida' };
    prismaFalso.luminaria.findUnique.mockResolvedValue(luminaria);

    const resultado = await servicio.findOne(1);

    expect(resultado).toEqual(luminaria);
    expect(prismaFalso.luminaria.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    prismaFalso.luminaria.findUnique.mockResolvedValue(null);

    await expect(servicio.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create guarda los datos recibidos', async () => {
    const dto = { sector: 'Norte', potencia: 70 };
    prismaFalso.luminaria.create.mockResolvedValue({ id: 1, ...dto, estado: 'encendida' });

    const resultado = await servicio.create(dto);

    expect(prismaFalso.luminaria.create).toHaveBeenCalledWith({ data: dto });
    expect(resultado.id).toBe(1);
  });

  it('encolarResumenSectores deja el trabajo en la cola y devuelve el jobId', async () => {
    colaFalsa.add.mockResolvedValue({ id: '7' });

    const resultado = await servicio.encolarResumenSectores();

    expect(colaFalsa.add).toHaveBeenCalledWith('resumen-sectores', {});
    expect(resultado).toEqual({ jobId: '7' });
  });

    it('estadoResumenSectores devuelve el estado y el resultado del trabajo', async () => {
    const resultado = [{ sector: 'COMUNA 1', luminarias: 976 }];
    colaFalsa.getJob.mockResolvedValue({
      id: '4',
      getState: jest.fn().mockResolvedValue('completed'),
      returnvalue: resultado,
    });

    await expect(servicio.estadoResumenSectores('4')).resolves.toEqual({
      jobId: '4',
      estado: 'completed',
      resultado,
    });
  });

  it('estadoResumenSectores lanza NotFoundException si el trabajo no existe', async () => {
    colaFalsa.getJob.mockResolvedValue(undefined);

    await expect(servicio.estadoResumenSectores('99')).rejects.toThrow(
      NotFoundException,
    );
  });
});