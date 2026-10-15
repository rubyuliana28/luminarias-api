import { Test, TestingModule } from '@nestjs/testing';
import { LuminariasController } from './luminarias.controller';
import { LuminariasService } from './luminarias.service';

describe('LuminariasController', () => {
  let controller: LuminariasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LuminariasController],
      providers: [LuminariasService],
    }).compile();

    controller = module.get<LuminariasController>(LuminariasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
