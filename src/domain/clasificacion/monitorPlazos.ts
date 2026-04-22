// Feature: cmf-prudential-metrics — Motor_Clasificación: Monitor de plazos
// Requerimientos: 6.2, 6.3

import { MetricasIntermediario, UmbralesBloque, EvaluadorUmbrales } from './evaluador';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AlertaPlazos {
  tipo: 'cambio_superior' | 'reduccion';
  intermediarioId: string;
  bloqueActual: string;
  mesesContinuos: number;
  mensaje: string;
}

interface Medicion {
  bloque: string;
  fecha: Date;
}

// ─── MonitorPlazos ────────────────────────────────────────────────────────────

/**
 * Rastrea períodos continuos sobre umbral superior (9 meses → alerta)
 * y períodos continuos bajo umbral actual (6 meses → alerta).
 * Requerimientos: 6.2, 6.3
 */
export class MonitorPlazos {
  private readonly _mediciones: Map<string, Medicion[]> = new Map();
  private readonly _evaluador = new EvaluadorUmbrales();

  /**
   * Registra una medición mensual para un intermediario.
   */
  registrarMedicion(intermediarioId: string, bloque: string, fecha: Date): void {
    if (!this._mediciones.has(intermediarioId)) {
      this._mediciones.set(intermediarioId, []);
    }
    this._mediciones.get(intermediarioId)!.push({ bloque, fecha });
  }

  /**
   * Retorna alerta si el intermediario lleva 9 meses consecutivos sobre el umbral superior (Bloque3).
   */
  evaluarCambioSuperior(
    intermediarioId: string,
    bloqueActual: string,
    umbrales: UmbralesBloque,
    metricas: MetricasIntermediario
  ): AlertaPlazos | null {
    const resultado = this._evaluador.evaluar(metricas, umbrales);
    if (resultado.incompleto || resultado.bloque !== 'Bloque3') return null;

    const meses = this._contarMesesConsecutivos(intermediarioId, 'Bloque3');
    if (meses >= 9) {
      return {
        tipo: 'cambio_superior',
        intermediarioId,
        bloqueActual,
        mesesContinuos: meses,
        mensaje: `Intermediario ${intermediarioId} lleva ${meses} meses consecutivos sobre umbral superior (Bloque3). Se requiere reclasificación.`,
      };
    }
    return null;
  }

  /**
   * Retorna alerta si el intermediario lleva 6 meses consecutivos bajo el umbral del bloque actual.
   */
  evaluarReduccion(
    intermediarioId: string,
    bloqueActual: string,
    umbrales: UmbralesBloque,
    metricas: MetricasIntermediario
  ): AlertaPlazos | null {
    const resultado = this._evaluador.evaluar(metricas, umbrales);
    if (resultado.incompleto) return null;

    const bloqueCalculado = resultado.bloque!;
    const esBajoUmbralActual = this._esBloqueInferior(bloqueCalculado, bloqueActual);
    if (!esBajoUmbralActual) return null;

    const meses = this._contarMesesConsecutivosInferiores(intermediarioId, bloqueActual);
    if (meses >= 6) {
      return {
        tipo: 'reduccion',
        intermediarioId,
        bloqueActual,
        mesesContinuos: meses,
        mensaje: `Intermediario ${intermediarioId} lleva ${meses} meses consecutivos bajo umbral del ${bloqueActual}. Se requiere reducción de bloque.`,
      };
    }
    return null;
  }

  private _contarMesesConsecutivos(intermediarioId: string, bloque: string): number {
    const mediciones = this._mediciones.get(intermediarioId) ?? [];
    let count = 0;
    for (let i = mediciones.length - 1; i >= 0; i--) {
      if (mediciones[i].bloque === bloque) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private _contarMesesConsecutivosInferiores(
    intermediarioId: string,
    bloqueActual: string
  ): number {
    const mediciones = this._mediciones.get(intermediarioId) ?? [];
    let count = 0;
    for (let i = mediciones.length - 1; i >= 0; i--) {
      if (this._esBloqueInferior(mediciones[i].bloque, bloqueActual)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private _esBloqueInferior(bloqueCalculado: string, bloqueActual: string): boolean {
    const orden: Record<string, number> = { Bloque1: 1, Bloque2: 2, Bloque3: 3 };
    return (orden[bloqueCalculado] ?? 0) < (orden[bloqueActual] ?? 0);
  }
}
