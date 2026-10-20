import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Message } from '@aws-sdk/client-sqs';
import { setTimeout as esperar } from 'node:timers/promises';
import { LuminariasService } from './luminarias.service';
import { MensajeTrabajo, SqsService } from './sqs.service';

@Injectable()
export class SqsConsumer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SqsConsumer.name);
  private readonly detener = new AbortController();
  private bucle?: Promise<void>;

  constructor(
    private readonly sqs: SqsService,
    private readonly luminarias: LuminariasService,
  ) {}

  // Arranca cuando la app ya está lista. No se espera (no hay await): el
  // bucle corre en segundo plano mientras la API atiende peticiones.
  onApplicationBootstrap() {
    if (!this.sqs.configurada) {
      this.logger.warn('SQS_QUEUE_URL no está configurada: el consumidor no arranca');
      return;
    }
    this.bucle = this.escuchar();
  }

  // Al apagar: corta la espera de SQS y deja terminar el mensaje en curso.
  async onApplicationShutdown() {
    this.detener.abort();
    await this.bucle;
  }

  private async escuchar() {
    this.logger.log('Escuchando la cola de SQS');
    while (!this.detener.signal.aborted) {
      try {
        const mensajes = await this.sqs.recibir(this.detener.signal);
        for (const mensaje of mensajes) {
          await this.procesar(mensaje);
        }
      } catch (error) {
        if (this.detener.signal.aborted) {
          break;
        }
        // Por ejemplo, sin internet o sin credenciales: se espera antes de
        // reintentar para no llenar el log con errores seguidos.
        this.logger.error(`No se pudo leer la cola: ${(error as Error).message}`);
        await esperar(5000, undefined, { signal: this.detener.signal }).catch(() => {});
      }
    }
    this.logger.log('Consumidor detenido');
  }

  async procesar(mensaje: Message) {
    try {
      const cuerpo = JSON.parse(mensaje.Body ?? '') as MensajeTrabajo;
      await this.luminarias.procesarTrabajo(cuerpo);
      // Solo se borra si salió bien. Si no, SQS lo vuelve a entregar cuando
      // vence el visibility timeout (y tras varios intentos, a la DLQ).
      await this.sqs.borrar(mensaje.ReceiptHandle!);
    } catch (error) {
      this.logger.error(
        `Falló el mensaje ${mensaje.MessageId}: ${(error as Error).message}`,
      );
    }
  }
}
