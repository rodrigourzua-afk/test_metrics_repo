// Feature: cmf-prudential-metrics, Propiedad 6: Consistencia de clasificación por bloques
// Valida: Requerimientos 6.1, 4.2

import * as fc from 'fast-check';
import { EvaluadorUmbrales, UmbralesBloque } from '../../../src/domain/clasificacion/evaluador';

const evaluador = new EvaluadorUmbrales();

// Umbrales fijos de referencia para los tests
const umbralesBase: UmbralesBloque = {
  bloque2: {
    ingresosAnuales: 1_000_000,
    clientesActivos: 500,
    custodiaTotal: 5_000_000,
    transaccionesDiarias: 100,
  },
  bloque3: {
    ingresosAnuales: 10_000_000,
    clientesActivos: 5_000,
    custodiaTotal: 50_000_000,
    transaccionesDiarias: 1_000,
  },
};

describe('Propiedad 6: Consistencia de clasificación por bloques', () => {
  it('métricas que superan umbrales de Bloque3 → resultado es Bloque3', () => {
    fc.assert(
      fc.property(
        // Generamos métricas que superan todos los umbrales de Bloque3
        fc.record({
          ingresosAnuales: fc.integer({ min: 10_000_000, max: 100_000_000 }),
          clientesActivos: fc.integer({ min: 5_000, max: 50_000 }),
          custodiaTotal: fc.integer({ min: 50_000_000, max: 500_000_000 }),
          transaccionesDiarias: fc.integer({ min: 1_000, max: 10_000 }),
        }),
        fc.record({
          bloque2: fc.record({
            ingresosAnuales: fc.integer({ min: 100_000, max: 999_999 }),
            clientesActivos: fc.integer({ min: 50, max: 499 }),
            custodiaTotal: fc.integer({ min: 500_000, max: 4_999_999 }),
            transaccionesDiarias: fc.integer({ min: 10, max: 99 }),
          }),
          bloque3: fc.record({
            ingresosAnuales: fc.integer({ min: 1_000_000, max: 9_999_999 }),
            clientesActivos: fc.integer({ min: 500, max: 4_999 }),
            custodiaTotal: fc.integer({ min: 5_000_000, max: 49_999_999 }),
            transaccionesDiarias: fc.integer({ min: 100, max: 999 }),
          }),
        }),
        (metricas, umbrales) => {
          // Asegurar que las métricas superan los umbrales de bloque3 generados
          const metricasAjustadas = {
            ingresosAnuales: umbrales.bloque3.ingresosAnuales + metricas.ingresosAnuales,
            clientesActivos: umbrales.bloque3.clientesActivos + metricas.clientesActivos,
            custodiaTotal: umbrales.bloque3.custodiaTotal + metricas.custodiaTotal,
            transaccionesDiarias: umbrales.bloque3.transaccionesDiarias + metricas.transaccionesDiarias,
          };
          const resultado = evaluador.evaluar(metricasAjustadas, umbrales);
          return resultado.bloque === 'Bloque3' && !resultado.incompleto;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('métricas que superan umbrales de Bloque2 pero no Bloque3 → resultado es Bloque2', () => {
    fc.assert(
      fc.property(
        fc.record({
          ingresosAnuales: fc.integer({ min: 1, max: 999_999 }),
          clientesActivos: fc.integer({ min: 1, max: 499 }),
          custodiaTotal: fc.integer({ min: 1, max: 4_999_999 }),
          transaccionesDiarias: fc.integer({ min: 1, max: 99 }),
        }),
        (delta) => {
          // Métricas: superan bloque2 pero NO bloque3
          const metricas = {
            ingresosAnuales: umbralesBase.bloque2.ingresosAnuales + delta.ingresosAnuales,
            clientesActivos: umbralesBase.bloque2.clientesActivos + delta.clientesActivos,
            custodiaTotal: umbralesBase.bloque2.custodiaTotal + delta.custodiaTotal,
            transaccionesDiarias: umbralesBase.bloque2.transaccionesDiarias + delta.transaccionesDiarias,
          };
          // Verificar que efectivamente no superan bloque3
          const superaBloque3 =
            metricas.ingresosAnuales >= umbralesBase.bloque3.ingresosAnuales &&
            metricas.clientesActivos >= umbralesBase.bloque3.clientesActivos &&
            metricas.custodiaTotal >= umbralesBase.bloque3.custodiaTotal &&
            metricas.transaccionesDiarias >= umbralesBase.bloque3.transaccionesDiarias;

          if (superaBloque3) return true; // skip: no aplica a este caso

          const resultado = evaluador.evaluar(metricas, umbralesBase);
          return resultado.bloque === 'Bloque2' && !resultado.incompleto;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('métricas que no superan umbrales de Bloque2 → resultado es Bloque1', () => {
    fc.assert(
      fc.property(
        fc.record({
          ingresosAnuales: fc.integer({ min: 0, max: 999_999 }),
          clientesActivos: fc.integer({ min: 0, max: 499 }),
          custodiaTotal: fc.integer({ min: 0, max: 4_999_999 }),
          transaccionesDiarias: fc.integer({ min: 0, max: 99 }),
        }),
        (metricas) => {
          const resultado = evaluador.evaluar(metricas, umbralesBase);
          return resultado.bloque === 'Bloque1' && !resultado.incompleto;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('datos incompletos (campo undefined) → incompleto=true y alerta CPM-CLS-001', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'ingresosAnuales',
          'clientesActivos',
          'custodiaTotal',
          'transaccionesDiarias'
        ) as fc.Arbitrary<keyof import('../../../src/domain/clasificacion/evaluador').MetricasIntermediario>,
        (campoFaltante) => {
          const metricas = {
            ingresosAnuales: 100,
            clientesActivos: 100,
            custodiaTotal: 100,
            transaccionesDiarias: 100,
          } as Record<string, number | undefined>;
          delete metricas[campoFaltante];
          const resultado = evaluador.evaluar(metricas, umbralesBase);
          return (
            resultado.bloque === null &&
            resultado.incompleto === true &&
            resultado.alertas.includes('CPM-CLS-001: Datos insuficientes para clasificación')
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
