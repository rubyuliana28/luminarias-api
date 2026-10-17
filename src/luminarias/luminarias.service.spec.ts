import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LuminariasService } from './luminarias.service';

describe('LuminariasService', () => {
  let servicio: LuminariasService;

  // Prisma falso: solo tiene los métodos que usa el servicio.
  // jest.fn() crea una función falsa que recuerda cómo la llamaron.
  const prismaFalso = {
    luminaria: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks(); // cada prueba empieza limpia
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LuminariasService,
        { provide: PrismaService, useValue: prismaFalso },
      ],
    }).compile();

    servicio = module.get<LuminariasService>(LuminariasService);
  });

  it('should be defined', () => {
    expect(servicio).toBeDefined();
  });

  it('findAll devuelve la lista de luminarias', async () => {
    // Preparar
    const lista = [{ id: 1, sector: 'Norte', potencia: 70, estado: 'encendida' }];
    prismaFalso.luminaria.findMany.mockResolvedValue(lista);
    // Ejecutar
    const resultado = await servicio.findAll();
    // Comprobar
    expect(resultado).toEqual(lista);
    expect(prismaFalso.luminaria.findMany).toHaveBeenCalledTimes(1);
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
});