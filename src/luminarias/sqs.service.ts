import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
  private readonly cliente: SQSClient;
  private readonly urlCola?: string;

  constructor(config: ConfigService) {
    this.cliente = new SQSClient({
      region: config.get<string>('AWS_REGION', 'us-east-2'),
    });
    this.urlCola = config.get<string>('SQS_QUEUE_URL');
  }

  async enviar(tipo: string) {
    if (!this.urlCola) {
      throw new Error('SQS_QUEUE_URL no está configurada');
    }
    const respuesta = await this.cliente.send(
      new SendMessageCommand({
        QueueUrl: this.urlCola,
        MessageBody: JSON.stringify({ tipo }),
      }),
    );
    return { messageId: respuesta.MessageId };
  }
}