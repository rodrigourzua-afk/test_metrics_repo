// Feature: cmf-prudential-metrics, Propiedad 7: Fórmula del Patrimonio Ajustado
// Feature: cmf-prudential-metrics, Propiedad 8: Fórmula del Patrimonio Líquido

import * as fc from 'fast-check';
import {
  CalculadorPatrimonioAjustado,
  CalculadorPatrimonioLiquido,
  EntradaPatrimonioAjustado,
  EntradaPatrimonioLiquido,
} from '../../../src/domain/patrimonial/calculadores';
import { dispatcher } from '../../../src/domain/events';

// Silenciar eventos durante los tests
beforeAll(() => {
  dispatcher.clear();
});

afterAll(() => {
  dispatcher.clear();
});

// ─── Generadores ──────────────────────────────────────────────────────────────

const montoFinanciero = fc.float({ min: 0, max: 1_000_000_000, noNaN: true });
const montoFinancieroConNegativo = fc.float({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true });

const entradaPatrimonioAjustadoArb: fc.Arbitrary<EntradaPatrimonioAjustado> = fc.record({
  intermediarioId: fc.uuid(),
  patrimonioContable: montoFinancieroConNegativo,
  intangibles: montoFinanciero,
  personasRelacionadas: montoFinanciero,
  garantiasTerceros: montoFinanciero,
  gastosAnticipados: montoFinanciero,
  impuestosDiferidos: montoFinanciero,
  activosImpagos: montoFinanciero,
});

const entradaPatrimonioLiquidoArb: fc.Arbitrary<EntradaPatrimonioLiquido> = fc.record({
  intermediarioId: fc.uuid(),
  patrimonioAjustado: montoFinancieroConNegativo,
  inversionesSociedades: montoFinanciero,
  propiedadesPlantaEquipo: montoFinanciero,
});

// ─── Propiedad 7: Fórmula del Patrimonio Ajustado ────────────────────────────
// Valida: Requerimientos 7.1, 7.2

describe('Propiedad 7: Fórmula del Patrimonio Ajustado', () => {
  const calculador = new CalculadorPatrimonioAjustado();

  it('PA = patrimonioContable − suma(deducciones) para cualquier entrada válida', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioAjustadoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);

        const sumaEsperada =
          entrada.intangibles +
          entrada.personasRelacionadas +
          entrada.garantiasTerceros +
          entrada.gastosAnticipados +
          entrada.impuestosDiferidos +
          entrada.activosImpagos;

        const paEsperado = entrada.patrimonioContable - sumaEsperada;

        // Verificar fórmula (tolerancia por aritmética de punto flotante)
        const tolerancia = Math.abs(paEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.patrimonioAjustado - paEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('totalDeducciones = suma de todos los componentes deducidos', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioAjustadoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);

        const sumaEsperada =
          resultado.deducciones.intangibles +
          resultado.deducciones.personasRelacionadas +
          resultado.deducciones.garantiasTerceros +
          resultado.deducciones.gastosAnticipados +
          resultado.deducciones.impuestosDiferidos +
          resultado.deducciones.activosImpagos;

        const tolerancia = Math.abs(sumaEsperada) * 1e-9 + 1e-6;
        return Math.abs(resultado.totalDeducciones - sumaEsperada) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('si PA < 0, negativo === true; si PA >= 0, negativo === false', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioAjustadoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);
        if (resultado.patrimonioAjustado < 0) {
          return resultado.negativo === true;
        } else {
          return resultado.negativo === false;
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 8: Fórmula del Patrimonio Líquido ─────────────────────────────
// Valida: Requerimientos 8.1

describe('Propiedad 8: Fórmula del Patrimonio Líquido', () => {
  const calculador = new CalculadorPatrimonioLiquido();

  it('PL = PA − inversionesSociedades − (0.5 × propiedadesPlantaEquipo) para cualquier entrada válida', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioLiquidoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);

        const plEsperado =
          entrada.patrimonioAjustado -
          entrada.inversionesSociedades -
          0.5 * entrada.propiedadesPlantaEquipo;

        const tolerancia = Math.abs(plEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.patrimonioLiquido - plEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('cincuentaPctPropiedades = 0.5 × propiedadesPlantaEquipo', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioLiquidoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);
        const esperado = 0.5 * entrada.propiedadesPlantaEquipo;
        const tolerancia = Math.abs(esperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.ajustes.cincuentaPctPropiedades - esperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('si PL <= 0, noPositivo === true; si PL > 0, noPositivo === false', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioLiquidoArb, async (entrada) => {
        const resultado = await calculador.calcular(entrada);
        if (resultado.patrimonioLiquido <= 0) {
          return resultado.noPositivo === true;
        } else {
          return resultado.noPositivo === false;
        }
      }),
      { numRuns: 100 }
    );
  });
});
