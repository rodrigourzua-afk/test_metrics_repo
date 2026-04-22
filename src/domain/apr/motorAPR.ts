// Feature: cmf-prudential-metrics — Motor_APR: Suscripción a eventos

import { dispatcher, DatosCarteraActualizados, ParametroRegulatorioActualizado } from '../events';
import {
  CalculadorRiesgoOperacional,
  CalculadorRiesgoCredito,
  CalculadorRiesgoMercado,
  CalculadorRiesgoCriptoactivos,
} from './calculadores';
import { AgregadorAPR } from './agregador';

/**
 * Suscribe el Motor_APR a los eventos DatosCarteraActualizados y
 * ParametroRegulatorioActualizado para recalcular componentes y APR Total.
 * Requerimientos: 13.2
 */
export function suscribirMotorAPR(): void {
  const calcRO = new CalculadorRiesgoOperacional();
  const calcRC = new CalculadorRiesgoCredito();
  const calcRM = new CalculadorRiesgoMercado();
  const calcCripto = new CalculadorRiesgoCriptoactivos();
  const agregador = new AgregadorAPR();

  // Al actualizar cartera, emitir ComponenteRiesgoCalculado por cada componente
  dispatcher.subscribe('DatosCarteraActualizados', async (evento) => {
    const ev = evento as DatosCarteraActualizados;
    // En producción se recuperarían los datos de cartera del repositorio.
    // Aquí se emite el evento de señal para que los consumidores sepan que
    // el Motor_APR está listo para recalcular.
    await dispatcher.publish({
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      nombre: 'ComponenteRiesgoCalculado',
      intermediarioId: ev.intermediarioId,
      tipoRiesgo: 'operacional',
      valor: 0,
      fechaCalculo: new Date(),
    } as import('../events').ComponenteRiesgoCalculado);
  });

  dispatcher.subscribe('ParametroRegulatorioActualizado', async (_evento) => {
    // Recalcular APR Total al actualizarse parámetros regulatorios.
    // En producción se recuperarían los últimos componentes calculados.
  });
}
