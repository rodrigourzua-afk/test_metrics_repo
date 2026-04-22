// Feature: cmf-prudential-metrics — Motor_Patrimonial: Calculadores de Patrimonio

import { v4 as uuidv4 } from 'uuid';
import { dispatcher } from '../events';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EntradaPatrimonioAjustado {
  intermediarioId: string;
  patrimonioContable: number;
  intangibles: number;
  personasRelacionadas: number;
  garantiasTerceros: number;
  gastosAnticipados: number;
  impuestosDiferidos: number;
  activosImpagos: number; // ya calculado por AplicadorTablaAntiguedad
}

export interface ResultadoPatrimonioAjustado {
  intermediarioId: string;
  patrimonioContable: number;
  deducciones: {
    intangibles: number;
    personasRelacionadas: number;
    garantiasTerceros: number;
    gastosAnticipados: number;
    impuestosDiferidos: number;
    activosImpagos: number;
  };
  totalDeducciones: number;
  patrimonioAjustado: number;
  negativo: boolean;
  fechaCalculo: Date;
}

export interface EntradaPatrimonioLiquido {
  intermediarioId: string;
  patrimonioAjustado: number;
  inversionesSociedades: number;
  propiedadesPlantaEquipo: number;
}

export interface ResultadoPatrimonioLiquido {
  intermediarioId: string;
  patrimonioAjustado: number;
  ajustes: {
    inversionesSociedades: number;
    cincuentaPctPropiedades: number;
  };
  patrimonioLiquido: number;
  noPositivo: boolean;
  fechaCalculo: Date;
}

// ─── CalculadorPatrimonioAjustado ─────────────────────────────────────────────

export class CalculadorPatrimonioAjustado {
  /**
   * PA = patrimonioContable − (intangibles + personasRelacionadas + garantiasTerceros
   *       + gastosAnticipados + impuestosDiferidos + activosImpagos)
   */
  async calcular(entrada: EntradaPatrimonioAjustado): Promise<ResultadoPatrimonioAjustado> {
    const deducciones = {
      intangibles: entrada.intangibles,
      personasRelacionadas: entrada.personasRelacionadas,
      garantiasTerceros: entrada.garantiasTerceros,
      gastosAnticipados: entrada.gastosAnticipados,
      impuestosDiferidos: entrada.impuestosDiferidos,
      activosImpagos: entrada.activosImpagos,
    };

    const totalDeducciones =
      deducciones.intangibles +
      deducciones.personasRelacionadas +
      deducciones.garantiasTerceros +
      deducciones.gastosAnticipados +
      deducciones.impuestosDiferidos +
      deducciones.activosImpagos;

    const patrimonioAjustado = entrada.patrimonioContable - totalDeducciones;
    const negativo = patrimonioAjustado < 0;
    const fechaCalculo = new Date();

    if (negativo) {
      const evento: import('../events').PatrimonioAjustadoNegativo = {
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'PatrimonioAjustadoNegativo',
        intermediarioId: entrada.intermediarioId,
        patrimonioAjustado,
        codigoError: 'CPM-PAT-001',
      };
      await dispatcher.publish(evento);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      patrimonioContable: entrada.patrimonioContable,
      deducciones,
      totalDeducciones,
      patrimonioAjustado,
      negativo,
      fechaCalculo,
    };
  }
}

// ─── CalculadorPatrimonioLiquido ──────────────────────────────────────────────

export class CalculadorPatrimonioLiquido {
  /**
   * PL = patrimonioAjustado − inversionesSociedades − (0.5 × propiedadesPlantaEquipo)
   */
  async calcular(entrada: EntradaPatrimonioLiquido): Promise<ResultadoPatrimonioLiquido> {
    const cincuentaPctPropiedades = 0.5 * entrada.propiedadesPlantaEquipo;
    const ajustes = {
      inversionesSociedades: entrada.inversionesSociedades,
      cincuentaPctPropiedades,
    };

    const patrimonioLiquido =
      entrada.patrimonioAjustado - ajustes.inversionesSociedades - ajustes.cincuentaPctPropiedades;

    const noPositivo = patrimonioLiquido <= 0;
    const fechaCalculo = new Date();

    if (noPositivo) {
      const evento: import('../events').PatrimonioLiquidoNoPositivo = {
        eventId: uuidv4(),
        timestamp: fechaCalculo,
        nombre: 'PatrimonioLiquidoNoPositivo',
        intermediarioId: entrada.intermediarioId,
        patrimonioLiquido,
        codigoError: 'CPM-PAT-002',
      };
      await dispatcher.publish(evento);
    }

    return {
      intermediarioId: entrada.intermediarioId,
      patrimonioAjustado: entrada.patrimonioAjustado,
      ajustes,
      patrimonioLiquido,
      noPositivo,
      fechaCalculo,
    };
  }
}
