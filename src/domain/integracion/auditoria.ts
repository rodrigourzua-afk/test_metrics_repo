// Feature: cmf-prudential-metrics — Motor_Integración: AuditoriaLogger
// Requerimientos: 1.5, 2.3, 2.4

export interface EntradaAuditoria {
  tipo: 'automatica' | 'manual';
  origen: string;
  usuarioResponsable: string;
  intermediarioId: string;
  exitoso: boolean;
  errores?: string[];
}

export interface EntradaError {
  codigoError: string;
  origen: string;
  detalle: string;
}

export interface RegistroAuditoria {
  id: string;
  fecha: Date;
  tipo: 'automatica' | 'manual';
  origen: string;
  usuarioResponsable: string;
  intermediarioId: string;
  exitoso: boolean;
  errores?: string[];
}

export interface RegistroError {
  id: string;
  timestamp: Date;
  codigoError: string;
  origen: string;
  detalle: string;
}

function generarId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Registra trazabilidad de todas las operaciones de ingesta y errores de importación.
 * Almacena en memoria (la persistencia en BD se hará en la tarea de repositorios).
 * Requerimientos: 1.5, 2.3, 2.4
 */
export class AuditoriaLogger {
  private readonly _registros: RegistroAuditoria[] = [];
  private readonly _errores: RegistroError[] = [];

  /**
   * Registra una operación de ingesta (exitosa o fallida).
   */
  registrar(entrada: EntradaAuditoria): void {
    const registro: RegistroAuditoria = {
      id: generarId(),
      fecha: new Date(),
      tipo: entrada.tipo,
      origen: entrada.origen,
      usuarioResponsable: entrada.usuarioResponsable,
      intermediarioId: entrada.intermediarioId,
      exitoso: entrada.exitoso,
      errores: entrada.errores,
    };
    this._registros.push(registro);
  }

  /**
   * Registra un error de importación con timestamp, código y origen.
   */
  registrarError(entrada: EntradaError): void {
    const registro: RegistroError = {
      id: generarId(),
      timestamp: new Date(),
      codigoError: entrada.codigoError,
      origen: entrada.origen,
      detalle: entrada.detalle,
    };
    this._errores.push(registro);
  }

  /** Retorna todos los registros de auditoría almacenados. */
  obtenerRegistros(): ReadonlyArray<RegistroAuditoria> {
    return this._registros;
  }

  /** Retorna todos los registros de error almacenados. */
  obtenerErrores(): ReadonlyArray<RegistroError> {
    return this._errores;
  }
}
