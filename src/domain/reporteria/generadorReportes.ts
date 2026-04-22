// Feature: cmf-prudential-metrics — Motor_Reportería: Generador de Reportes CMF

import { v4 as uuidv4 } from 'uuid';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EntradaReporte {
  intermediarioId: string;
  periodo: string;
  usuarioGenerador: string;
  versionParametrosId: string;
  resultadoPatrimonio: {
    patrimonioAjustado: number;
    patrimonioLiquido: number;
  };
  resultadoAPR: {
    aprTotal: number;
    componentes: Record<string, number>;
  };
  resultadoRatios: {
    patrimonioMinimo: boolean;
    garantias: boolean | null;
    liquidez: boolean;
    endeudamiento: boolean;
  };
}

export interface ReporteCMF {
  id: string;
  intermediarioId: string;
  periodo: string;
  fechaGeneracion: Date;
  usuarioGenerador: string;
  versionParametrosId: string;
  datos: EntradaReporte;
  trazabilidad: string[];
  formato: 'CMF-v1';
}

// ─── GeneradorReportesCMF ─────────────────────────────────────────────────────

export class GeneradorReportesCMF {
  generar(entrada: EntradaReporte): ReporteCMF {
    const fechaGeneracion = new Date();
    const trazabilidad = this._construirTrazabilidad(entrada, fechaGeneracion);

    return {
      id: uuidv4(),
      intermediarioId: entrada.intermediarioId,
      periodo: entrada.periodo,
      fechaGeneracion,
      usuarioGenerador: entrada.usuarioGenerador,
      versionParametrosId: entrada.versionParametrosId,
      datos: entrada,
      trazabilidad,
      formato: 'CMF-v1',
    };
  }

  regenerarHistorico(periodo: string, datos: EntradaReporte): ReporteCMF {
    // Recalcula con los datos históricos provistos para el período solicitado
    const entradaHistorica: EntradaReporte = { ...datos, periodo };
    return this.generar(entradaHistorica);
  }

  private _construirTrazabilidad(entrada: EntradaReporte, fecha: Date): string[] {
    const trazas: string[] = [];

    trazas.push(`Reporte generado: ${fecha.toISOString()}`);
    trazas.push(`Usuario: ${entrada.usuarioGenerador}`);
    trazas.push(`Período: ${entrada.periodo}`);
    trazas.push(`Versión de parámetros: ${entrada.versionParametrosId}`);
    trazas.push(`Intermediario: ${entrada.intermediarioId}`);

    // Datos de entrada — Patrimonio
    trazas.push(
      `Patrimonio Ajustado: ${entrada.resultadoPatrimonio.patrimonioAjustado}`
    );
    trazas.push(
      `Patrimonio Líquido: ${entrada.resultadoPatrimonio.patrimonioLiquido}`
    );

    // Datos de entrada — APR
    trazas.push(`APR Total: ${entrada.resultadoAPR.aprTotal}`);
    for (const [componente, valor] of Object.entries(entrada.resultadoAPR.componentes)) {
      trazas.push(`  APR componente ${componente}: ${valor}`);
    }

    // Fórmula aplicada
    trazas.push('Fórmula APR: APR_Total = 33.3 × (RO + RM + RC + RCripto)');

    // Resultados intermedios — Ratios
    trazas.push(`Ratio patrimonioMinimo: ${entrada.resultadoRatios.patrimonioMinimo}`);
    trazas.push(
      `Ratio garantias: ${entrada.resultadoRatios.garantias === null ? 'N/A (Bloque 1)' : entrada.resultadoRatios.garantias}`
    );
    trazas.push(`Ratio liquidez: ${entrada.resultadoRatios.liquidez}`);
    trazas.push(`Ratio endeudamiento: ${entrada.resultadoRatios.endeudamiento}`);

    trazas.push(`Formato: CMF-v1`);

    return trazas;
  }
}
