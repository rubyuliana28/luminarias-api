import { Module } from '@nestjs/common';
import { LuminariasService } from './luminarias.service';
import { LuminariasController } from './luminarias.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LuminariasController],
  providers: [LuminariasService],
})
export class LuminariasModule {}