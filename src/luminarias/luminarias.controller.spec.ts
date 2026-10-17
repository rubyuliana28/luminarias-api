import { Test, TestingModule } from '@nestjs/testing';
import { LuminariasController } from './luminarias.controller';
import { LuminariasService } from './luminarias.service';

describe('LuminariasController', () => {
  let controlador: LuminariasController;

  const servicioFalso = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LuminariasController],
      providers: [{ provide: LuminariasService, useValue: servicioFalso }],
    }).compile();

    controlador = module.get<LuminariasController>(LuminariasController);
  });

  it('should be defined', () => {
    expect(controlador).toBeDefined();
  });

  it('findAll delega en el servicio', async () => {
    servicioFalso.findAll.mockResolvedValue([]);

    const resultado = await controlador.findAll();

    expect(resultado).toEqual([]);
    expect(servicioFalso.findAll).toHaveBeenCalledTimes(1);
  });
});