// Feature: cmf-prudential-metrics — Adaptador: NotificadorEmail

import { INotificador } from '../../domain/reporteria/alertas';

const MAX_REINTENTOS = 3;

export class NotificadorEmail implements INotificador {
  readonly tipo = 'email';

  async enviar(destinatarios: string[], mensaje: string, prioridad: string): Promise<boolean> {
    let intentos = 0;

    while (intentos < MAX_REINTENTOS) {
      try {
        // Simulación de envío por email
        console.log(
          `[NotificadorEmail] Enviando email (prioridad: ${prioridad}) a [${destinatarios.join(', ')}]: ${mensaje}`
        );
        return true;
      } catch (err) {
        intentos++;
        const detalle = err instanceof Error ? err.message : String(err);
        console.error(`[CPM-REP-001] Error al enviar email (intento ${intentos}): ${detalle}`);
        if (intentos >= MAX_REINTENTOS) {
          throw new Error(`[CPM-REP-001] Fallo definitivo al enviar email tras ${MAX_REINTENTOS} intentos: ${detalle}`);
        }
      }
    }

    return false;
  }
}
