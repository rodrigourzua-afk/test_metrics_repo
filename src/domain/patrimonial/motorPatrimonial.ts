// Feature: cmf-prudential-metrics — Motor_Patrimonial: Suscripción a eventos

import { dispatcher, Evento } from '../events';
import { CalculadorPatrimonioAjustado, CalculadorPatrimonioLiquido } from './calculadores';

/**
 * Suscribe el Motor_Patrimonial a los eventos que desencadenan recálculo:
 * - DatosContablesActualizados (alias de DatosActualizados con datos contables)
 * - ParametroRegulatorioActualizado
 *
 * En un sistema real, los handlers recuperarían los datos del repositorio y
 * ejecutarían el recálculo completo. Aquí se registra la suscripción y se
 * delega la lógica de recálculo al callback proporcionado.
 */
export function suscribirMotorPatrimonial(
  onRecalcular: (intermediarioId: string, motivo: string) => Promise<void>
): void {
  const handleDatosContables = async (evento: Evento) => {
    const ev = evento as { intermediarioId?: string };
    if (ev.intermediarioId) {
      await onRecalcular(ev.intermediarioId, 'DatosContablesActualizados');
    }
  };

  const handleParametros = async (evento: Evento) => {
    // Al cambiar parámetros regulatorios, todos los intermediarios deben recalcularse.
    // En producción se iteraría sobre todos; aquí se emite el evento genérico.
    await onRecalcular('*', 'ParametroRegulatorioActualizado');
  };

  dispatcher.subscribe('DatosActualizados', handleDatosContables);
  dispatcher.subscribe('DatosContablesImportados', handleDatosContables);
  dispatcher.subscribe('ParametroRegulatorioActualizado', handleParametros);
}

export { CalculadorPatrimonioAjustado, CalculadorPatrimonioLiquido };
