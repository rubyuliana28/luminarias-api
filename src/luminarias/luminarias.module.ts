import { Module } from '@nestjs/common';
import { LuminariasService } from './luminarias.service';
import { LuminariasController } from './luminarias.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SqsService } from './sqs.service';
import { SqsConsumer } from './sqs.consumer';

@Module({
  imports: [PrismaModule],
  controllers: [LuminariasController],
  providers: [LuminariasService, SqsService, SqsConsumer],
})
export class LuminariasModule {}
