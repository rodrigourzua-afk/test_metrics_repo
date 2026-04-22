// Feature: cmf-prudential-metrics — Motor_Ratios: Evaluadores de índices prudenciales

import { v4 as uuidv4 } from 'uuid';
import { dispatcher } from '../events';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EntradaPatrimonioMinimo {
  intermediarioId: string;
  patrimonioAjustado: number;
  aprTotal: number;
  limiteUF: number;
  porcentajeAPR: number;
}

export interface ResultadoPatrimonioMinimo {
  intermediarioId: string;
  umbral: number;
  patrimonioAjustado: number;
  cumple: boolean;
  excesoDeficit: number;
  fechaCalculo: Date;
}

export interface EntradaGarantias {
  intermediarioId: string;
  bloque: string;
  garantiasConstituidas: number;
  limiteGarantiasUf: number;
}

export interface ResultadoGarantias {
  intermediarioId: string;
  aplica: boolean;
  garantiasConstituidas: number;
  limiteGarantiasUf: number;
  cumple: boolean;
  fechaCalculo: Date;
}

export interface EntradaLiquidez {
  intermediarioId: string;
  activosRealizables7d: number;
  pasivosExigibles7d: number;
}

export interface ResultadoLiquidez {
  intermediarioId: string;
  activosRealizables7d: number;
  pasivosExigibles7d: number;
  cumple: boolean;
  fechaCalculo: Date;
}

export interface EntradaEndeudamiento {
  intermediarioId: string;
  pasivoExigibleTotal: number;
  patrimonioLiquido: number;
  limiteRazonEndeudamiento: number;
}

export interface ResultadoEndeudamiento {
  intermediarioId: string;
  pasivoExigibleTotal: number;
  patrimonioLiquido: number;
  razon: number | null;
  cumple: boolean;
  incalculable: boolean;
  fechaCalculo: Date;
}

// ─── EvaluadorPatrimonioMinimo ────────────────────────────────────────────────

export class EvaluadorPatrimonioMinimo {
  private static readonly PORCENTAJE_APR_DEFAULT = 0.03;
  private static readonly PORCENTAJE_APR_MAX = 0.06;

  async evaluar(entrada: EntradaPatrimonioMinimo): Promise<ResultadoPatrimonioMinimo> {
    const porcentajeAPR = Math.min(
      entrada.porcentajeAPR ?? EvaluadorPatrimonioMinimo.PORCENTAJE_APR_DEFAULT,
      EvaluadorPatrimonioMinimo.PORCENTAJE_APR_MAX
    );

    const umbral = Math.max(entrada.limiteUF, porcentajeAPR * entrada.aprTotal);
    const cumple = entrada.patrimonioAjustado > umbral;
    const excesoDeficit = entrada.patrimonioAjustado - umbral;
    const fechaCalculo = new Date();

    if (!cumple) {
      await dispatcher.publish({
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'IncumplimientoDetectado',
        intermediarioId: entrada.intermediarioId,
        indice: 'patrimonioMinimo',
        valorActual: entrada.patrimonioAjustado,
        umbral,
        codigoError: 'CPM-RAT-001',
      } as import('../events').IncumplimientoDetectado);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      umbral,
      patrimonioAjustado: entrada.patrimonioAjustado,
      cumple,
      excesoDeficit,
      fechaCalculo,
    };
  }
}

// ─── EvaluadorGarantias ───────────────────────────────────────────────────────

export class EvaluadorGarantias {
  async evaluar(entrada: EntradaGarantias): Promise<ResultadoGarantias> {
    const fechaCalculo = new Date();
    const aplica = entrada.bloque === 'Bloque2' || entrada.bloque === 'Bloque3';

    if (!aplica) {
      return {
        intermediarioId: entrada.intermediarioId,
        aplica: false,
        garantiasConstituidas: entrada.garantiasConstituidas,
        limiteGarantiasUf: entrada.limiteGarantiasUf,
        cumple: true,
        fechaCalculo,
      };
    }

    const cumple = entrada.garantiasConstituidas >= entrada.limiteGarantiasUf;

    if (!cumple) {
      await dispatcher.publish({
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'IncumplimientoDetectado',
        intermediarioId: entrada.intermediarioId,
        indice: 'garantias',
        valorActual: entrada.garantiasConstituidas,
        umbral: entrada.limiteGarantiasUf,
        codigoError: 'CPM-RAT-001',
      } as import('../events').IncumplimientoDetectado);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      aplica: true,
      garantiasConstituidas: entrada.garantiasConstituidas,
      limiteGarantiasUf: entrada.limiteGarantiasUf,
      cumple,
      fechaCalculo,
    };
  }
}

// ─── EvaluadorLiquidez ────────────────────────────────────────────────────────

export class EvaluadorLiquidez {
  async evaluar(entrada: EntradaLiquidez): Promise<ResultadoLiquidez> {
    const cumple = entrada.pasivosExigibles7d <= entrada.activosRealizables7d;
    const fechaCalculo = new Date();

    if (!cumple) {
      await dispatcher.publish({
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'IncumplimientoDetectado',
        intermediarioId: entrada.intermediarioId,
        indice: 'liquidez',
        valorActual: entrada.activosRealizables7d,
        umbral: entrada.pasivosExigibles7d,
        codigoError: 'CPM-RAT-001',
      } as import('../events').IncumplimientoDetectado);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      activosRealizables7d: entrada.activosRealizables7d,
      pasivosExigibles7d: entrada.pasivosExigibles7d,
      cumple,
      fechaCalculo,
    };
  }
}

// ─── EvaluadorEndeudamiento ───────────────────────────────────────────────────

export class EvaluadorEndeudamiento {
  private static readonly LIMITE_RAZON_DEFAULT = 20;

  async evaluar(entrada: EntradaEndeudamiento): Promise<ResultadoEndeudamiento> {
    const fechaCalculo = new Date();

    if (entrada.patrimonioLiquido <= 0) {
      return {
        intermediarioId: entrada.intermediarioId,
        pasivoExigibleTotal: entrada.pasivoExigibleTotal,
        patrimonioLiquido: entrada.patrimonioLiquido,
        razon: null,
        cumple: false,
        incalculable: true,
        fechaCalculo,
      };
    }

    const limite =
      entrada.limiteRazonEndeudamiento ?? EvaluadorEndeudamiento.LIMITE_RAZON_DEFAULT;
    const razon = entrada.pasivoExigibleTotal / entrada.patrimonioLiquido;
    const cumple = razon <= limite;

    if (!cumple) {
      await dispatcher.publish({
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'IncumplimientoDetectado',
        intermediarioId: entrada.intermediarioId,
        indice: 'endeudamiento',
        valorActual: razon,
        umbral: limite,
        codigoError: 'CPM-RAT-001',
      } as import('../events').IncumplimientoDetectado);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      pasivoExigibleTotal: entrada.pasivoExigibleTotal,
      patrimonioLiquido: entrada.patrimonioLiquido,
      razon,
      cumple,
      incalculable: false,
      fechaCalculo,
    };
  }
}
