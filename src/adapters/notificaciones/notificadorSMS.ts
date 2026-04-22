// Feature: cmf-prudential-metrics — Adaptador: NotificadorSMS

import { INotificador } from '../../domain/reporteria/alertas';

const MAX_REINTENTOS = 3;

export class NotificadorSMS implements INotificador {
  readonly tipo = 'sms';

  async enviar(destinatarios: string[], mensaje: string, prioridad: string): Promise<boolean> {
    let intentos = 0;

    while (intentos < MAX_REINTENTOS) {
      try {
        // Simulación de envío por SMS
        console.log(
          `[NotificadorSMS] Enviando SMS (prioridad: ${prioridad}) a [${destinatarios.join(', ')}]: ${mensaje}`
        );
        return true;
      } catch (err) {
        intentos++;
        const detalle = err instanceof Error ? err.message : String(err);
        console.error(`[CPM-REP-001] Error al enviar SMS (intento ${intentos}): ${detalle}`);
        if (intentos >= MAX_REINTENTOS) {
          throw new Error(`[CPM-REP-001] Fallo definitivo al enviar SMS tras ${MAX_REINTENTOS} intentos: ${detalle}`);
        }
      }
    }

    return false;
  }
}
