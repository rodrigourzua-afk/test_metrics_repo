// Feature: cmf-prudential-metrics — Motor_APR: Agregador APR Total

import { v4 as uuidv4 } from 'uuid';
import { dispatcher } from '../events';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ComponentesRiesgo {
  intermediarioId: string;
  riesgoOperacional: number;
  riesgoMercado: number;
  riesgoCredito: number;
  riesgoCriptoactivos: number;
}

export interface ResultadoAPR {
  intermediarioId: string;
  componentes: ComponentesRiesgo;
  aprTotal: number;
  fechaCalculo: Date;
}

// ─── AgregadorAPR ─────────────────────────────────────────────────────────────

export class AgregadorAPR {
  /**
   * APR_Total = 33.3 × (RO + RM + RC + RCripto)
   */
  async calcular(componentes: ComponentesRiesgo): Promise<ResultadoAPR> {
    const sumaRiesgos =
      componentes.riesgoOperacional +
      componentes.riesgoMercado +
      componentes.riesgoCredito +
      componentes.riesgoCriptoactivos;

    const aprTotal = 33.3 * sumaRiesgos;
    const fechaCalculo = new Date();

    const resultado: ResultadoAPR = {
      intermediarioId: componentes.intermediarioId,
      componentes,
      aprTotal,
      fechaCalculo,
    };

    // Emitir evento APRTotalCalculado
    const evento: import('../events').APRTotalCalculado = {
      eventId: uuidv4(),
      timestamp: fechaCalculo,
      nombre: 'APRTotalCalculado',
      intermediarioId: componentes.intermediarioId,
      resultadoAPRId: uuidv4(),
      aprTotal,
      fechaCalculo,
    };
    await dispatcher.publish(evento);

    return resultado;
  }
}
