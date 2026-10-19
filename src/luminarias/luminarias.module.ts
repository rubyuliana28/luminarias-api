import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LuminariasService } from './luminarias.service';
import { LuminariasController } from './luminarias.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'inventario' })],
  controllers: [LuminariasController],
  providers: [LuminariasService],
})
export class LuminariasModule {}