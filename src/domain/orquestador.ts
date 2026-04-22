// Feature: cmf-prudential-metrics — Orquestador de motores
// Requerimientos: 1.1, 6.1, 7.5, 13.2, 14.4

import { suscribirMotorPatrimonial } from './patrimonial/motorPatrimonial';
import { suscribirMotorRatios } from './ratios/motorRatios';
import { suscribirMotorReporteria } from './reporteria/motorReporteria';
import { MotorAlertas, RegistroAlertas } from './reporteria/alertas';

/**
 * Orquestador conecta todos los motores a través del bus de eventos.
 * Actúa como punto de arranque de las suscripciones del sistema CPM.
 */
export class Orquestador {
  private inicializado = false;

  inicializar(): void {
    if (this.inicializado) return;

    // Motor_Patrimonial: recalcula PA y PL ante cambios contables o de parámetros
    suscribirMotorPatrimonial(async (_intermediarioId: string, _motivo: string) => {
      // En producción: recuperar datos del repositorio y recalcular
    });

    // Motor_Ratios: recalcula los 4 índices ante eventos de patrimonio, APR y clasificación
    suscribirMotorRatios();

    // Motor_Reportería: procesa incumplimientos y patrimonio negativo
    const registroAlertas = new RegistroAlertas();
    const motorAlertas = new MotorAlertas(registroAlertas, []);
    suscribirMotorReporteria(motorAlertas);

    this.inicializado = true;
  }
}

export const orquestador = new Orquestador();
