import { parse } from 'csv-parse/sync';

export interface FilaInventario {
  codigo: string;
  direccion: string | null;
  sector: string;
  potencia: number;
  estado: string;
}

export interface ResultadoLectura {
  filas: FilaInventario[];
  descartadas: number;
}

// Convierte el texto del CSV en filas validadas.
export function leerFilas(texto: string): ResultadoLectura {
  const registros = parse(texto, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[];

  const filas: FilaInventario[] = [];
  let descartadas = 0;

  for (const r of registros) {
    const codigo = (r.codigo ?? '').trim();
    const potencia = Number.parseInt(r.potencia ?? '', 10);
    if (!codigo || !Number.isInteger(potencia) || potencia < 1) {
      descartadas++;
      continue;
    }
    filas.push({
      codigo,
      direccion: (r.direccion ?? '').trim() || null,
      sector: (r.sector ?? '').trim() || 'SIN SECTOR',
      potencia,
      estado: (r.estado ?? '').trim() || 'encendida',
    });
  }
  return { filas, descartadas };
}

// Parte una lista en grupos del tamaño pedido.
export function partirEnLotes<T>(items: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) {
    lotes.push(items.slice(i, i + tamano));
  }
  return lotes;
}