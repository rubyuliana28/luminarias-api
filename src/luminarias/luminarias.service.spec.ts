import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LuminariasService } from './luminarias.service';
import { SqsService } from './sqs.service';

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
      groupBy: jest.fn(),
    },
    trabajo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  // SQS falso: solo tiene el método que usa el servicio.
  const sqsFalso = { enviar: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LuminariasService,
        { provide: PrismaService, useValue: prismaFalso },
        { provide: SqsService, useValue: sqsFalso },
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

  describe('trabajos con SQS', () => {
    const resumen = [{ sector: 'COMUNA 1', luminarias: 976 }];

    beforeEach(() => {
      prismaFalso.luminaria.groupBy.mockResolvedValue([
        { sector: 'COMUNA 1', _count: { _all: 976 } },
      ]);
    });

    it('encolarResumenSectores guarda el trabajo, lo envía a SQS y devuelve el trabajoId', async () => {
      prismaFalso.trabajo.create.mockResolvedValue({ id: 't1', tipo: 'resumen-sectores' });

      const resultado = await servicio.encolarResumenSectores();

      expect(prismaFalso.trabajo.create).toHaveBeenCalledWith({
        data: { tipo: 'resumen-sectores' },
      });
      expect(sqsFalso.enviar).toHaveBeenCalledWith({
        trabajoId: 't1',
        tipo: 'resumen-sectores',
      });
      expect(resultado).toEqual({ trabajoId: 't1' });
    });

    it('encolarResumenSectores marca el trabajo como fallido si SQS no responde', async () => {
      prismaFalso.trabajo.create.mockResolvedValue({ id: 't1', tipo: 'resumen-sectores' });
      sqsFalso.enviar.mockRejectedValue(new Error('sin conexión'));

      await expect(servicio.encolarResumenSectores()).rejects.toThrow('sin conexión');
      expect(prismaFalso.trabajo.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { estado: 'fallido', error: 'No se pudo enviar a la cola' },
      });
    });

    it('estadoResumenSectores devuelve el estado y el resultado del trabajo', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        estado: 'completado',
        resultado: resumen,
        error: null,
      });

      await expect(servicio.estadoResumenSectores('t1')).resolves.toEqual({
        trabajoId: 't1',
        estado: 'completado',
        resultado: resumen,
        error: null,
      });
    });

    it('estadoResumenSectores lanza NotFoundException si el trabajo no existe', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue(null);

      await expect(servicio.estadoResumenSectores('t99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('procesarTrabajo calcula el resumen y deja el trabajo completado', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        tipo: 'resumen-sectores',
        estado: 'pendiente',
      });

      await servicio.procesarTrabajo({ trabajoId: 't1', tipo: 'resumen-sectores' });

      expect(prismaFalso.trabajo.update).toHaveBeenLastCalledWith({
        where: { id: 't1' },
        data: { estado: 'completado', resultado: resumen, error: null },
      });
    });

    it('procesarTrabajo es idempotente: un trabajo completado no se vuelve a calcular', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        tipo: 'resumen-sectores',
        estado: 'completado',
      });

      await servicio.procesarTrabajo({ trabajoId: 't1', tipo: 'resumen-sectores' });

      expect(prismaFalso.luminaria.groupBy).not.toHaveBeenCalled();
      expect(prismaFalso.trabajo.update).not.toHaveBeenCalled();
    });

    it('procesarTrabajo reintenta un trabajo que había fallado', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        tipo: 'resumen-sectores',
        estado: 'fallido',
      });

      await servicio.procesarTrabajo({ trabajoId: 't1', tipo: 'resumen-sectores' });

      expect(prismaFalso.luminaria.groupBy).toHaveBeenCalled();
    });

    it('procesarTrabajo marca fallido y relanza el error si el cálculo falla', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        tipo: 'resumen-sectores',
        estado: 'pendiente',
      });
      prismaFalso.luminaria.groupBy.mockRejectedValue(new Error('base caída'));

      await expect(
        servicio.procesarTrabajo({ trabajoId: 't1', tipo: 'resumen-sectores' }),
      ).rejects.toThrow('base caída');
      expect(prismaFalso.trabajo.update).toHaveBeenLastCalledWith({
        where: { id: 't1' },
        data: { estado: 'fallido', error: 'base caída' },
      });
    });

    it('procesarTrabajo rechaza un tipo de trabajo desconocido', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue({
        id: 't1',
        tipo: 'otro',
        estado: 'pendiente',
      });

      await expect(
        servicio.procesarTrabajo({ trabajoId: 't1', tipo: 'otro' }),
      ).rejects.toThrow('Trabajo desconocido: otro');
    });

    it('procesarTrabajo lanza un error si el trabajo no existe', async () => {
      prismaFalso.trabajo.findUnique.mockResolvedValue(null);

      await expect(
        servicio.procesarTrabajo({ trabajoId: 't99', tipo: 'resumen-sectores' }),
      ).rejects.toThrow('El trabajo t99 no existe');
    });
  });
});