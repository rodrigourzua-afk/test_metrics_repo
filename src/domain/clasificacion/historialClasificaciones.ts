// Feature: cmf-prudential-metrics — Motor_Clasificación: Historial de clasificaciones
// Requerimientos: 6.4, 4.2

import { v4 as uuidv4 } from 'uuid';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ClasificacionRegistro {
  id: string;
  intermediarioId: string;
  bloque: string;
  fechaInicio: Date;
  fechaFin?: Date;
  motivoCambio?: string;
}

// ─── HistorialClasificaciones ─────────────────────────────────────────────────

/**
 * Persiste el historial de clasificaciones por bloque de cada intermediario.
 * Requerimientos: 6.4, 4.2
 */
export class HistorialClasificaciones {
  private readonly _registros: Map<string, ClasificacionRegistro[]> = new Map();

  /**
   * Registra una nueva clasificación para el intermediario con fechaInicio = ahora.
   */
  registrar(intermediarioId: string, bloque: string, motivo?: string): ClasificacionRegistro {
    const registro: ClasificacionRegistro = {
      id: uuidv4(),
      intermediarioId,
      bloque,
      fechaInicio: new Date(),
      motivoCambio: motivo,
    };

    if (!this._registros.has(intermediarioId)) {
      this._registros.set(intermediarioId, []);
    }
    this._registros.get(intermediarioId)!.push(registro);
    return registro;
  }

  /**
   * Cierra el registro vigente del intermediario asignando fechaFin = ahora.
   */
  cerrarVigente(intermediarioId: string): void {
    const historial = this._registros.get(intermediarioId) ?? [];
    const vigente = historial.find((r) => !r.fechaFin);
    if (vigente) {
      vigente.fechaFin = new Date();
    }
  }

  /**
   * Retorna todos los registros del intermediario ordenados por fechaInicio ascendente.
   */
  obtenerHistorial(intermediarioId: string): ClasificacionRegistro[] {
    return [...(this._registros.get(intermediarioId) ?? [])].sort(
      (a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime()
    );
  }

  /**
   * Retorna el registro vigente (sin fechaFin) del intermediario, o null si no existe.
   */
  obtenerVigente(intermediarioId: string): ClasificacionRegistro | null {
    const historial = this._registros.get(intermediarioId) ?? [];
    return historial.find((r) => !r.fechaFin) ?? null;
  }
}
