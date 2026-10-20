import { Message } from '@aws-sdk/client-sqs';
import { LuminariasService } from './luminarias.service';
import { SqsConsumer } from './sqs.consumer';
import { SqsService } from './sqs.service';

describe('SqsConsumer', () => {
  let consumidor: SqsConsumer;

  const sqsFalso = { configurada: true, recibir: jest.fn(), borrar: jest.fn() };
  const servicioFalso = { procesarTrabajo: jest.fn() };

  const mensaje: Message = {
    MessageId: 'm1',
    ReceiptHandle: 'recibo-1',
    Body: JSON.stringify({ trabajoId: 't1', tipo: 'resumen-sectores' }),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    sqsFalso.configurada = true;
    consumidor = new SqsConsumer(
      sqsFalso as unknown as SqsService,
      servicioFalso as unknown as LuminariasService,
    );
  });

  it('procesa el mensaje y lo borra de la cola si salió bien', async () => {
    await consumidor.procesar(mensaje);

    expect(servicioFalso.procesarTrabajo).toHaveBeenCalledWith({
      trabajoId: 't1',
      tipo: 'resumen-sectores',
    });
    expect(sqsFalso.borrar).toHaveBeenCalledWith('recibo-1');
  });

  it('no borra el mensaje si el procesamiento falla (SQS lo reintentará)', async () => {
    servicioFalso.procesarTrabajo.mockRejectedValue(new Error('base caída'));

    await consumidor.procesar(mensaje);

    expect(sqsFalso.borrar).not.toHaveBeenCalled();
  });

  it('no borra un mensaje con un cuerpo que no es JSON', async () => {
    await consumidor.procesar({ ...mensaje, Body: 'esto no es json' });

    expect(servicioFalso.procesarTrabajo).not.toHaveBeenCalled();
    expect(sqsFalso.borrar).not.toHaveBeenCalled();
  });

  it('no arranca si SQS_QUEUE_URL no está configurada', () => {
    sqsFalso.configurada = false;

    consumidor.onApplicationBootstrap();

    expect(sqsFalso.recibir).not.toHaveBeenCalled();
  });

  it('escucha la cola al arrancar y se detiene al apagar la app', async () => {
    // recibir espera hasta que se aborte, como hace el long polling real.
    sqsFalso.recibir.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_, rechazar) =>
          signal.addEventListener('abort', () => rechazar(new Error('abortado'))),
        ),
    );

    consumidor.onApplicationBootstrap();
    await consumidor.onApplicationShutdown();

    expect(sqsFalso.recibir).toHaveBeenCalledTimes(1);
  });
});
