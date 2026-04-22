// Feature: cmf-prudential-metrics — Motor_Integración: ValidadorEsquema y ValidadorConsistencia
// Requerimentos: 1.3, 1.4, 2.1, 2.2

import { z } from 'zod';

// Schema Zod para datos contables — incluye todos los campos obligatorios
export const EsquemaDatosContables = z.object({
  balanceGeneral: z.object({
    activos: z.number(),
    pasivos: z.number(),
    patrimonio: z.number(),
  }),
  estadoResultados: z.object({
    ingresos: z.number(),
    gastos: z.number(),
    resultado: z.number(),
  }),
  cuentasContables: z.object({}).passthrough(),
  intermediarioId: z.string().min(1),
  origen: z.string().min(1),
  usuarioResponsable: z.string().min(1),
});

// Tipo inferido del schema
export type DatosContablesInput = z.infer<typeof EsquemaDatosContables>;

/**
 * Valida que los datos contables cumplan el esquema obligatorio.
 * Campos obligatorios: balanceGeneral, estadoResultados, cuentasContables,
 *                      intermediarioId, origen, usuarioResponsable.
 * Requerimientos: 1.3, 1.4, 2.1, 2.2
 */
export class ValidadorEsquema {
  validar(datos: unknown): { valido: boolean; errores: string[] } {
    const resultado = EsquemaDatosContables.safeParse(datos);
    if (resultado.success) {
      return { valido: true, errores: [] };
    }
    const errores = resultado.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );
    return { valido: false, errores };
  }
}

/**
 * Valida la consistencia contable: activos === pasivos + patrimonio (tolerancia 0.01).
 * Requerimientos: 1.4, 2.2
 */
export class ValidadorConsistencia {
  private readonly TOLERANCIA = 0.01;

  validar(datos: DatosContablesInput): { valido: boolean; errores: string[] } {
    const { activos, pasivos, patrimonio } = datos.balanceGeneral;
    const diferencia = Math.abs(activos - (pasivos + patrimonio));

    if (diferencia > this.TOLERANCIA) {
      return {
        valido: false,
        errores: [
          `CPM-INT-004: Inconsistencia de cuadre contable. ` +
            `activos (${activos}) ≠ pasivos + patrimonio (${pasivos + patrimonio}). ` +
            `Diferencia: ${diferencia.toFixed(4)}`,
        ],
      };
    }

    return { valido: true, errores: [] };
  }
}
