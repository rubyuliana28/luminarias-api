import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { SqsService } from './sqs.service';

describe('SqsService', () => {
  const url = 'https://sqs.us-east-2.amazonaws.com/123/cola';
  let enviarAws: jest.SpyInstance;

  // Config falsa: devuelve los valores de este objeto o el valor por defecto.
  const crearServicio = (valores: Record<string, string>) =>
    new SqsService({
      get: (clave: string, porDefecto?: string) => valores[clave] ?? porDefecto,
    } as unknown as ConfigService);

  beforeEach(() => {
    // Se espía el cliente de AWS para que ninguna prueba salga a internet.
    enviarAws = jest.spyOn(SQSClient.prototype, 'send').mockImplementation();
  });

  afterEach(() => {
    enviarAws.mockRestore();
  });

  it('enviar manda el mensaje como JSON a la cola', async () => {
    enviarAws.mockResolvedValue({ MessageId: 'm1' });
    const servicio = crearServicio({ SQS_QUEUE_URL: url });

    const resultado = await servicio.enviar({ trabajoId: 't1', tipo: 'resumen-sectores' });

    const comando = enviarAws.mock.calls[0][0] as SendMessageCommand;
    expect(comando.input).toEqual({
      QueueUrl: url,
      MessageBody: '{"trabajoId":"t1","tipo":"resumen-sectores"}',
    });
    expect(resultado).toEqual({ messageId: 'm1' });
  });

  it('recibir usa long polling de 20 segundos', async () => {
    enviarAws.mockResolvedValue({ Messages: [{ MessageId: 'm1' }] });
    const servicio = crearServicio({ SQS_QUEUE_URL: url });

    const mensajes = await servicio.recibir();

    const comando = enviarAws.mock.calls[0][0] as ReceiveMessageCommand;
    expect(comando.input).toEqual({
      QueueUrl: url,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });
    expect(mensajes).toEqual([{ MessageId: 'm1' }]);
  });

  it('recibir devuelve una lista vacía si no llegó nada', async () => {
    enviarAws.mockResolvedValue({});
    const servicio = crearServicio({ SQS_QUEUE_URL: url });

    await expect(servicio.recibir()).resolves.toEqual([]);
  });

  it('borrar elimina el mensaje usando su ReceiptHandle', async () => {
    const servicio = crearServicio({ SQS_QUEUE_URL: url });

    await servicio.borrar('recibo-1');

    const comando = enviarAws.mock.calls[0][0] as DeleteMessageCommand;
    expect(comando.input).toEqual({ QueueUrl: url, ReceiptHandle: 'recibo-1' });
  });

  it('falla con un mensaje claro si SQS_QUEUE_URL no está configurada', async () => {
    const servicio = crearServicio({});

    expect(servicio.configurada).toBe(false);
    await expect(servicio.borrar('recibo-1')).rejects.toThrow(
      'SQS_QUEUE_URL no está configurada',
    );
  });
});
