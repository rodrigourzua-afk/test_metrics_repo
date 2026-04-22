// Feature: cmf-prudential-metrics — Motor_Reportería: Suscripción a eventos

import {
  dispatcher,
  IncumplimientoDetectado,
  PatrimonioAjustadoNegativo,
  PatrimonioLiquidoNoPositivo,
} from '../events';
import { MotorAlertas } from './alertas';

/**
 * Suscribe el Motor_Reportería a eventos de incumplimiento y patrimonio negativo.
 * Requerimientos: 7.3, 8.3, 14.2, 15.2, 16.2, 17.2
 */
export function suscribirMotorReporteria(motorAlertas: MotorAlertas): void {
  dispatcher.subscribe('IncumplimientoDetectado', async (evento) => {
    const ev = evento as IncumplimientoDetectado;
    await motorAlertas.procesarIncumplimiento({
      intermediarioId: ev.intermediarioId,
      indice: ev.indice,
      valorActual: ev.valorActual,
      umbral: ev.umbral,
    });
  });

  dispatcher.subscribe('PatrimonioAjustadoNegativo', async (evento) => {
    const ev = evento as PatrimonioAjustadoNegativo;
    await motorAlertas.procesarPatrimonioNegativo(ev.intermediarioId, ev.patrimonioAjustado);
  });

  dispatcher.subscribe('PatrimonioLiquidoNoPositivo', async (evento) => {
    const ev = evento as PatrimonioLiquidoNoPositivo;
    await motorAlertas.procesarPatrimonioNegativo(ev.intermediarioId, ev.patrimonioLiquido);
  });
}
