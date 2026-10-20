import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

// Lo que viaja dentro de cada mensaje de la cola.
export interface MensajeTrabajo {
  trabajoId: string;
  tipo: string;
}

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

  get configurada() {
    return Boolean(this.urlCola);
  }

  async enviar(mensaje: MensajeTrabajo) {
    const respuesta = await this.cliente.send(
      new SendMessageCommand({
        QueueUrl: this.url(),
        MessageBody: JSON.stringify(mensaje),
      }),
    );
    return { messageId: respuesta.MessageId };
  }

  // Long polling: SQS espera hasta 20 s a que llegue un mensaje antes de
  // responder vacío. Así no se hacen miles de consultas a una cola vacía.
  async recibir(abortSignal?: AbortSignal) {
    const respuesta = await this.cliente.send(
      new ReceiveMessageCommand({
        QueueUrl: this.url(),
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }),
      { abortSignal },
    );
    return respuesta.Messages ?? [];
  }

  async borrar(receiptHandle: string) {
    await this.cliente.send(
      new DeleteMessageCommand({
        QueueUrl: this.url(),
        ReceiptHandle: receiptHandle,
      }),
    );
  }

  private url() {
    if (!this.urlCola) {
      throw new Error('SQS_QUEUE_URL no está configurada');
    }
    return this.urlCola;
  }
}
