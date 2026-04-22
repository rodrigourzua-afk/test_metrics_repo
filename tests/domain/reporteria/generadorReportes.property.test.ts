// Feature: cmf-prudential-metrics, Propiedad 18: Trazabilidad completa en reportes regulatorios

import * as fc from 'fast-check';
import {
  GeneradorReportesCMF,
  EntradaReporte,
} from '../../../src/domain/reporteria/generadorReportes';

// ─── Generadores ──────────────────────────────────────────────────────────────

const montoArb = fc.float({ min: Math.fround(-1_000_000_000), max: Math.fround(1_000_000_000), noNaN: true });
const montoPositivoArb = fc.float({ min: 0, max: Math.fround(1_000_000_000), noNaN: true });

const componentesAPRArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  montoPositivoArb,
  { minKeys: 1, maxKeys: 5 }
);

const entradaReporteArb: fc.Arbitrary<EntradaReporte> = fc.record({
  intermediarioId: fc.uuid(),
  periodo: fc.string({ minLength: 4, maxLength: 10 }),
  usuarioGenerador: fc.string({ minLength: 1, maxLength: 50 }),
  versionParametrosId: fc.uuid(),
  resultadoPatrimonio: fc.record({
    patrimonioAjustado: montoArb,
    patrimonioLiquido: montoArb,
  }),
  resultadoAPR: fc.record({
    aprTotal: montoPositivoArb,
    componentes: componentesAPRArb,
  }),
  resultadoRatios: fc.record({
    patrimonioMinimo: fc.boolean(),
    garantias: fc.oneof(fc.boolean(), fc.constant(null)),
    liquidez: fc.boolean(),
    endeudamiento: fc.boolean(),
  }),
});

// ─── Propiedad 18: Trazabilidad completa en reportes regulatorios ─────────────
// Valida: Requerimientos 18.2

describe('Propiedad 18: Trazabilidad completa en reportes regulatorios', () => {
  const generador = new GeneradorReportesCMF();

  it('para cualquier reporte generado, debe contener datos de entrada, versionParametrosId, trazabilidad no vacía y fechaGeneracion', () => {
    fc.assert(
      fc.property(entradaReporteArb, (entrada) => {
        const reporte = generador.generar(entrada);

        // Debe tener fechaGeneracion válida
        if (!(reporte.fechaGeneracion instanceof Date)) return false;
        if (isNaN(reporte.fechaGeneracion.getTime())) return false;

        // Debe tener versionParametrosId igual al de la entrada
        if (reporte.versionParametrosId !== entrada.versionParametrosId) return false;

        // Debe tener trazabilidad no vacía
        if (!Array.isArray(reporte.trazabilidad)) return false;
        if (reporte.trazabilidad.length === 0) return false;

        // Debe contener los datos de entrada
        if (reporte.datos !== entrada) return false;

        // Debe tener id único (no vacío)
        if (!reporte.id || reporte.id.length === 0) return false;

        // Debe tener formato CMF-v1
        if (reporte.formato !== 'CMF-v1') return false;

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
