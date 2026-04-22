// Feature: cmf-prudential-metrics — Motor_Integración: ImportadorAutomatico y CargadorManual
// Requerimientos: 1.1, 1.2, 2.1, 2.4

import { DatosContablesInput, EsquemaDatosContables, ValidadorEsquema } from './validadores';

export interface ErrorImportacion {
  timestamp: Date;
  codigoError: string;
  origen: string;
  mensaje: string;
}

export type DatosContablesConTrazabilidad = DatosContablesInput & {
  fechaImportacion: Date;
  cargaManual: boolean;
};

export type ResultadoImportacion =
  | { exito: true; datos: DatosContablesConTrazabilidad }
  | { exito: false; error: ErrorImportacion };

/**
 * Importa datos contables automáticamente desde un sistema externo vía API.
 * Requerimientos: 1.1, 1.2, 2.1, 2.4
 */
export class ImportadorAutomatico {
  private readonly validador = new ValidadorEsquema();

  /**
   * @param url             URL base del sistema externo
   * @param intermediarioId Identificador del intermediario
   * @param usuarioResponsable Usuario que solicita la importación
   */
  async importar(
    url: string,
    intermediarioId: string,
    usuarioResponsable: string
  ): Promise<ResultadoImportacion> {
    const origen = url;

    let respuesta: Response;
    try {
      respuesta = await fetch(`${url}/contable/${intermediarioId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return {
        exito: false,
        error: {
          timestamp: new Date(),
          codigoError: 'CPM-INT-001',
          origen,
          mensaje: `Error de conectividad con sistema externo: ${(err as Error).message}`,
        },
      };
    }

    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return {
        exito: false,
        error: {
          timestamp: new Date(),
          codigoError: 'CPM-INT-002',
          origen,
          mensaje: 'Respuesta inválida del sistema externo: no es JSON válido',
        },
      };
    }

    // Enriquecer con campos de trazabilidad antes de validar
    const candidato = {
      ...(cuerpo as object),
      intermediarioId,
      origen,
      usuarioResponsable,
    };

    const validacion = this.validador.validar(candidato);
    if (!validacion.valido) {
      return {
        exito: false,
        error: {
          timestamp: new Date(),
          codigoError: 'CPM-INT-002',
          origen,
          mensaje: `Respuesta inválida del sistema externo: ${validacion.errores.join('; ')}`,
        },
      };
    }

    const parseado = EsquemaDatosContables.parse(candidato);
    const datos: DatosContablesConTrazabilidad = {
      ...parseado,
      fechaImportacion: new Date(),
      cargaManual: false,
    };

    return { exito: true, datos };
  }
}

/**
 * Carga datos contables manualmente desde un objeto ya parseado.
 * Requerimientos: 2.1, 2.4
 */
export class CargadorManual {
  private readonly validador = new ValidadorEsquema();

  /**
   * @param contenido          Objeto con los datos contables
   * @param nombreArchivo      Nombre del archivo fuente (usado como origen)
   * @param intermediarioId    Identificador del intermediario
   * @param usuarioResponsable Usuario que realiza la carga
   */
  cargar(
    contenido: object,
    nombreArchivo: string,
    intermediarioId: string,
    usuarioResponsable: string
  ): ResultadoImportacion {
    const origen = nombreArchivo;

    const candidato = {
      ...contenido,
      intermediarioId,
      origen,
      usuarioResponsable,
    };

    const validacion = this.validador.validar(candidato);
    if (!validacion.valido) {
      return {
        exito: false,
        error: {
          timestamp: new Date(),
          codigoError: 'CPM-INT-003',
          origen,
          mensaje: `Esquema de datos incompleto en "${nombreArchivo}": ${validacion.errores.join('; ')}`,
        },
      };
    }

    const parseado = EsquemaDatosContables.parse(candidato);
    const datos: DatosContablesConTrazabilidad = {
      ...parseado,
      fechaImportacion: new Date(),
      cargaManual: true,
    };

    return { exito: true, datos };
  }
}
