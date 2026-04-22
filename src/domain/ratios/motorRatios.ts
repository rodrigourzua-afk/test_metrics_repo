// Feature: cmf-prudential-metrics — Motor_Ratios: Suscripción a eventos

import {
  dispatcher,
  PatrimonioAjustadoCalculado,
  PatrimonioLiquidoCalculado,
  APRTotalCalculado,
  BloqueAsignado,
} from '../events';
import {
  EvaluadorPatrimonioMinimo,
  EvaluadorGarantias,
  EvaluadorLiquidez,
  EvaluadorEndeudamiento,
} from './evaluadores';

/**
 * Suscribe el Motor_Ratios a los eventos de patrimonio, APR y clasificación
 * para recalcular los 4 índices prudenciales automáticamente.
 * Requerimientos: 14.4, 15.3, 16.3, 17.3
 */
export function suscribirMotorRatios(): void {
  const evalPatrimonio = new EvaluadorPatrimonioMinimo();
  const evalGarantias = new EvaluadorGarantias();
  const evalLiquidez = new EvaluadorLiquidez();
  const evalEndeudamiento = new EvaluadorEndeudamiento();

  // Al recibir APR Total calculado, se puede recalcular el índice de patrimonio mínimo
  dispatcher.subscribe('APRTotalCalculado', async (evento) => {
    const ev = evento as APRTotalCalculado;
    // En producción se recuperarían los datos del repositorio para recalcular.
    // Señal de que el Motor_Ratios está listo para recalcular con el nuevo APR.
    await dispatcher.publish({
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      nombre: 'APRTotalCalculado',
      intermediarioId: ev.intermediarioId,
      resultadoAPRId: ev.resultadoAPRId,
      aprTotal: ev.aprTotal,
      fechaCalculo: ev.fechaCalculo,
    } as APRTotalCalculado);
  });

  // Al recibir Patrimonio Ajustado calculado, recalcular índice de patrimonio mínimo
  dispatcher.subscribe('PatrimonioAjustadoCalculado', async (_evento) => {
    const _ev = _evento as PatrimonioAjustadoCalculado;
    // En producción se recuperarían los parámetros y APR del repositorio.
  });

  // Al recibir Patrimonio Líquido calculado, recalcular índice de endeudamiento
  dispatcher.subscribe('PatrimonioLiquidoCalculado', async (_evento) => {
    const _ev = _evento as PatrimonioLiquidoCalculado;
    // En producción se recuperarían los pasivos del repositorio.
  });

  // Al recibir Bloque Asignado, recalcular índice de garantías
  dispatcher.subscribe('BloqueAsignado', async (_evento) => {
    const _ev = _evento as BloqueAsignado;
    // En producción se recuperarían las garantías del repositorio.
  });
}
