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

  it('findAll delega en el servicio con los parámetros de la consulta', async () => {
    const respuesta = { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    servicioFalso.findAll.mockResolvedValue(respuesta);
    const query = { sector: 'COMUNA 5', page: 1, pageSize: 20 };

    const resultado = await controlador.findAll(query);

    expect(resultado).toEqual(respuesta);
    expect(servicioFalso.findAll).toHaveBeenCalledWith(query);
  });
});