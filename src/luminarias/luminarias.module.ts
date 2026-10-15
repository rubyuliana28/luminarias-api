import { Module } from '@nestjs/common';
import { LuminariasService } from './luminarias.service';
import { LuminariasController } from './luminarias.controller';

@Module({
  controllers: [LuminariasController],
  providers: [LuminariasService],
})
export class LuminariasModule {}
