import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { LuminariasController } from './luminarias.controller';
import { LuminariasService } from './luminarias.service';
import { RolesGuard } from '../auth/roles.guard';

describe('LuminariasController', () => {
  let controlador: LuminariasController;

  const servicioFalso = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    encolarResumenSectores: jest.fn(),
    estadoResumenSectores: jest.fn(),
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

  it('resumenSectores encola el trabajo y devuelve el trabajoId', async () => {
    servicioFalso.encolarResumenSectores.mockResolvedValue({ trabajoId: 'abc' });

    const resultado = await controlador.resumenSectores();

    expect(servicioFalso.encolarResumenSectores).toHaveBeenCalled();
    expect(resultado).toEqual({ trabajoId: 'abc' });
  });

  // Estas pruebas levantan el controlador como app HTTP para que los pipes de
  // @Param se ejecuten (llamando el método directo, el pipe no corre).
  describe('validación del :id', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
      // Los guards corren antes que los pipes: se deja pasar el de roles para
      // que estas pruebas lleguen a la validación de los parámetros.
      const module: TestingModule = await Test.createTestingModule({
        controllers: [LuminariasController],
        providers: [{ provide: LuminariasService, useValue: servicioFalso }],
      })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();
      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('GET /luminarias/7 llega al servicio como número', async () => {
      servicioFalso.findOne.mockResolvedValue({ id: 7 });

      await request(app.getHttpServer()).get('/luminarias/7').expect(200);

      expect(servicioFalso.findOne).toHaveBeenCalledWith(7);
    });

    it('GET /luminarias/abc responde 400 sin llamar al servicio', async () => {
      await request(app.getHttpServer()).get('/luminarias/abc').expect(400);

      expect(servicioFalso.findOne).not.toHaveBeenCalled();
    });

    it('PATCH /luminarias/1.5 responde 400', async () => {
      await request(app.getHttpServer())
        .patch('/luminarias/1.5')
        .send({ estado: 'apagada' })
        .expect(400);

      expect(servicioFalso.update).not.toHaveBeenCalled();
    });

    it('GET /luminarias/resumen-sectores/123 responde 400: el trabajoId debe ser un UUID', async () => {
      await request(app.getHttpServer())
        .get('/luminarias/resumen-sectores/123')
        .expect(400);

      expect(servicioFalso.estadoResumenSectores).not.toHaveBeenCalled();
    });
  });
});