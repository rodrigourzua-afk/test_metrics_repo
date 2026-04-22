// Feature: cmf-prudential-metrics — Motor_Clasificación: Evaluador de umbrales
// Requerimientos: 6.1, 6.5

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetricasIntermediario {
  ingresosAnuales?: number;
  clientesActivos?: number;
  custodiaTotal?: number;
  transaccionesDiarias?: number;
}

export interface UmbralesBloque {
  bloque2: {
    ingresosAnuales: number;
    clientesActivos: number;
    custodiaTotal: number;
    transaccionesDiarias: number;
  };
  bloque3: {
    ingresosAnuales: number;
    clientesActivos: number;
    custodiaTotal: number;
    transaccionesDiarias: number;
  };
}

export interface ResultadoClasificacion {
  bloque: 'Bloque1' | 'Bloque2' | 'Bloque3' | null;
  incompleto: boolean;
  alertas: string[];
}

// ─── EvaluadorUmbrales ────────────────────────────────────────────────────────

/**
 * Evalúa métricas de un intermediario y determina su bloque de clasificación.
 * Requerimientos: 6.1, 6.5
 */
export class EvaluadorUmbrales {
  /**
   * Clasifica al intermediario en Bloque1, Bloque2 o Bloque3 según umbrales.
   * Si algún campo de métricas es undefined o null, retorna incompleto con alerta CPM-CLS-001.
   * Lógica: Bloque3 si supera umbrales de Bloque3, Bloque2 si supera umbrales de Bloque2, sino Bloque1.
   */
  evaluar(metricas: MetricasIntermediario, umbrales: UmbralesBloque): ResultadoClasificacion {
    const campos: (keyof MetricasIntermediario)[] = [
      'ingresosAnuales',
      'clientesActivos',
      'custodiaTotal',
      'transaccionesDiarias',
    ];

    const incompleto = campos.some(
      (c) => metricas[c] === undefined || metricas[c] === null
    );

    if (incompleto) {
      return {
        bloque: null,
        incompleto: true,
        alertas: ['CPM-CLS-001: Datos insuficientes para clasificación'],
      };
    }

    const m = metricas as Required<MetricasIntermediario>;

    const superaUmbrales = (
      umbral: UmbralesBloque['bloque2'] | UmbralesBloque['bloque3']
    ): boolean =>
      m.ingresosAnuales >= umbral.ingresosAnuales &&
      m.clientesActivos >= umbral.clientesActivos &&
      m.custodiaTotal >= umbral.custodiaTotal &&
      m.transaccionesDiarias >= umbral.transaccionesDiarias;

    if (superaUmbrales(umbrales.bloque3)) {
      return { bloque: 'Bloque3', incompleto: false, alertas: [] };
    }

    if (superaUmbrales(umbrales.bloque2)) {
      return { bloque: 'Bloque2', incompleto: false, alertas: [] };
    }

    return { bloque: 'Bloque1', incompleto: false, alertas: [] };
  }
}
