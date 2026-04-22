// Feature: cmf-prudential-metrics, Propiedad 19: Toda alerta de incumplimiento genera notificación

import * as fc from 'fast-check';
import {
  MotorAlertas,
  RegistroAlertas,
  INotificador,
  IncumplimientoInput,
} from '../../../src/domain/reporteria/alertas';

// ─── Notificador de prueba ────────────────────────────────────────────────────

class NotificadorPrueba implements INotificador {
  readonly tipo = 'test';
  llamadas: Array<{ destinatarios: string[]; mensaje: string; prioridad: string }> = [];

  async enviar(destinatarios: string[], mensaje: string, prioridad: string): Promise<boolean> {
    this.llamadas.push({ destinatarios, mensaje, prioridad });
    return true;
  }
}

// ─── Generadores ──────────────────────────────────────────────────────────────

const indiceArb = fc.oneof(
  fc.constant('patrimonioMinimo'),
  fc.constant('garantias'),
  fc.constant('liquidez'),
  fc.constant('endeudamiento')
);

const incumplimientoArb: fc.Arbitrary<IncumplimientoInput> = fc.record({
  intermediarioId: fc.uuid(),
  indice: indiceArb,
  valorActual: fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true }),
  umbral: fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true }),
});

// ─── Propiedad 19: Toda alerta de incumplimiento genera notificación ──────────
// Valida: Requerimientos 14.2, 15.2, 16.2, 17.2, 19.1

describe('Propiedad 19: Toda alerta de incumplimiento genera notificación', () => {
  it('para cualquier incumplimiento procesado, debe existir al menos una alerta registrada con marca de tiempo, índice afectado y canal', async () => {
    await fc.assert(
      fc.asyncProperty(incumplimientoArb, async (incumplimiento) => {
        const registro = new RegistroAlertas();
        const notificador = new NotificadorPrueba();
        const motor = new MotorAlertas(registro, [notificador]);

        await motor.procesarIncumplimiento(incumplimiento);

        const alertas = registro.obtenerPorIntermediario(incumplimiento.intermediarioId);

        // Debe existir al menos una alerta
        if (alertas.length === 0) return false;

        const alerta = alertas[0];

        // Debe tener marca de tiempo
        if (!(alerta.fechaAlerta instanceof Date)) return false;
        if (isNaN(alerta.fechaAlerta.getTime())) return false;

        // Debe tener índice afectado
        if (alerta.indiceAfectado !== incumplimiento.indice) return false;

        // Debe tener canal configurado
        if (!alerta.canal || alerta.canal.length === 0) return false;

        // El notificador debe haber sido invocado
        if (notificador.llamadas.length === 0) return false;

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
