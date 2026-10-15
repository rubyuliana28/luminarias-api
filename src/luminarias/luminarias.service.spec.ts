import { Test, TestingModule } from '@nestjs/testing';
import { LuminariasService } from './luminarias.service';

describe('LuminariasService', () => {
  let service: LuminariasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LuminariasService],
    }).compile();

    service = module.get<LuminariasService>(LuminariasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
