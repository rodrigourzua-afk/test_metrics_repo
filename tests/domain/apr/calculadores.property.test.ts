// Feature: cmf-prudential-metrics, Propiedad 9: Fórmula del Riesgo Operacional
// Feature: cmf-prudential-metrics, Propiedad 10: Fórmula del Riesgo de Crédito con ponderadores Tabla 6
// Feature: cmf-prudential-metrics, Propiedad 11: Cálculo de criptoactivos Tipo B es siempre posición bruta
// Feature: cmf-prudential-metrics, Propiedad 12: Fórmula del APR Total

import * as fc from 'fast-check';
import {
  CalculadorRiesgoOperacional,
  CalculadorRiesgoCredito,
  CalculadorRiesgoCriptoactivos,
  EntradaRiesgoOperacional,
  EntradaRiesgoCredito,
  ExposicionContraparte,
  PosicionCriptoactivo,
} from '../../../src/domain/apr/calculadores';
import { AgregadorAPR, ComponentesRiesgo } from '../../../src/domain/apr/agregador';
import { dispatcher } from '../../../src/domain/events';

// Silenciar eventos durante los tests
beforeAll(() => {
  dispatcher.clear();
});

afterAll(() => {
  dispatcher.clear();
});

// ─── Generadores ──────────────────────────────────────────────────────────────

const monto = fc.float({ min: 0, max: 1_000_000_000, noNaN: true });
const descuento = fc.float({ min: 0, max: 1, noNaN: true });
const ponderador = fc.float({ min: 0, max: 2, noNaN: true });

const entradaROArb: fc.Arbitrary<EntradaRiesgoOperacional> = fc.record({
  intermediarioId: fc.uuid(),
  custodiaTotal: monto,
  descuentoSegurosGarantias: descuento,
  volumenTransacciones: monto,
  nocionalDerivados: monto,
});

const exposicionArb: fc.Arbitrary<ExposicionContraparte> = fc.record({
  contraparteId: fc.uuid(),
  exposicionBruta: monto,
  reduccionRiesgo: descuento,
  clasificacionCrediticia: fc.constantFrom('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'sin-clasificacion'),
  ponderador: ponderador,
  esECC: fc.boolean(),
  ponderadorECC: fc.option(ponderador, { nil: undefined }),
  compensacionBilateral: fc.constant(false), // sin compensación para probar fórmula base
});

const entradaRCArb: fc.Arbitrary<EntradaRiesgoCredito> = fc.record({
  intermediarioId: fc.uuid(),
  exposiciones: fc.array(exposicionArb, { minLength: 1, maxLength: 10 }),
});

const posicionCriptoTipoBArb: fc.Arbitrary<PosicionCriptoactivo> = fc.record({
  id: fc.uuid(),
  tipo: fc.constant('B' as const),
  posicionLarga: monto,
  posicionCorta: monto,
});

const componentesRiesgoArb: fc.Arbitrary<ComponentesRiesgo> = fc.record({
  intermediarioId: fc.uuid(),
  riesgoOperacional: monto,
  riesgoMercado: monto,
  riesgoCredito: monto,
  riesgoCriptoactivos: monto,
});

// ─── Propiedad 9: Fórmula del Riesgo Operacional ─────────────────────────────
// Valida: Requerimientos 9.1, 9.2

describe('Propiedad 9: Fórmula del Riesgo Operacional', () => {
  const calculador = new CalculadorRiesgoOperacional();

  it('RO = 0.004 × custodiaNetaDescontada + 0.001 × volumenTransacciones + 0.0001 × nocionalDerivados', () => {
    fc.assert(
      fc.property(entradaROArb, (entrada) => {
        const resultado = calculador.calcular(entrada);

        const custodiaNetaEsperada =
          entrada.custodiaTotal * (1 - entrada.descuentoSegurosGarantias);
        const roEsperado =
          0.004 * custodiaNetaEsperada +
          0.001 * entrada.volumenTransacciones +
          0.0001 * entrada.nocionalDerivados;

        const tolerancia = Math.abs(roEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.riesgoOperacional - roEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('custodiaNetaDescontada = custodiaTotal × (1 - descuentoSegurosGarantias)', () => {
    fc.assert(
      fc.property(entradaROArb, (entrada) => {
        const resultado = calculador.calcular(entrada);
        const esperado = entrada.custodiaTotal * (1 - entrada.descuentoSegurosGarantias);
        const tolerancia = Math.abs(esperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.custodiaNetaDescontada - esperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('componenteCustodia = 0.004 × custodiaNetaDescontada', () => {
    fc.assert(
      fc.property(entradaROArb, (entrada) => {
        const resultado = calculador.calcular(entrada);
        const esperado = 0.004 * resultado.custodiaNetaDescontada;
        const tolerancia = Math.abs(esperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.componenteCustodia - esperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 10: Fórmula del Riesgo de Crédito con ponderadores Tabla 6 ────
// Valida: Requerimientos 11.1, 11.2

describe('Propiedad 10: Fórmula del Riesgo de Crédito con ponderadores Tabla 6', () => {
  const calculador = new CalculadorRiesgoCredito();

  it('RC = Σ (exposicionNeta_i × ponderador_i) para exposiciones sin compensación bilateral', () => {
    fc.assert(
      fc.property(entradaRCArb, (entrada) => {
        const resultado = calculador.calcular(entrada);

        // Calcular RC esperado manualmente
        let rcEsperado = 0;
        for (const exp of entrada.exposiciones) {
          const exposicionNeta = exp.exposicionBruta * (1 - exp.reduccionRiesgo);
          const ponderadorEfectivo =
            exp.esECC && exp.ponderadorECC !== undefined ? exp.ponderadorECC : exp.ponderador;
          rcEsperado += exposicionNeta * ponderadorEfectivo;
        }

        const tolerancia = Math.abs(rcEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.riesgoCredito - rcEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('exposicionNeta_i = exposicionBruta_i × (1 - reduccionRiesgo_i)', () => {
    fc.assert(
      fc.property(entradaRCArb, (entrada) => {
        const resultado = calculador.calcular(entrada);

        return resultado.detalleExposiciones.every((detalle) => {
          const exp = entrada.exposiciones.find(
            (e) => e.contraparteId === detalle.contraparteId
          );
          if (!exp) return false;
          const esperado = exp.exposicionBruta * (1 - exp.reduccionRiesgo);
          const tolerancia = Math.abs(esperado) * 1e-9 + 1e-6;
          return Math.abs(detalle.exposicionNeta - esperado) <= tolerancia;
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 11: Criptoactivos Tipo B es siempre posición bruta ─────────────
// Valida: Requerimientos 12.3

describe('Propiedad 11: Cálculo de criptoactivos Tipo B es siempre posición bruta', () => {
  const calculador = new CalculadorRiesgoCriptoactivos();

  it('Para Tipo B: exposicion = posicionLarga + posicionCorta (sin compensación)', () => {
    fc.assert(
      fc.property(fc.array(posicionCriptoTipoBArb, { minLength: 1, maxLength: 10 }), (posiciones) => {
        const resultado = calculador.calcular(posiciones);

        return resultado.detalle.every((detalle) => {
          const pos = posiciones.find((p) => p.id === detalle.id);
          if (!pos) return false;
          const esperado = pos.posicionLarga + pos.posicionCorta;
          const tolerancia = Math.abs(esperado) * 1e-9 + 1e-6;
          return Math.abs(detalle.exposicion - esperado) <= tolerancia;
        });
      }),
      { numRuns: 100 }
    );
  });

  it('Para Tipo B: la exposicion es siempre >= posicionLarga y >= posicionCorta', () => {
    fc.assert(
      fc.property(fc.array(posicionCriptoTipoBArb, { minLength: 1, maxLength: 10 }), (posiciones) => {
        const resultado = calculador.calcular(posiciones);

        return resultado.detalle.every((detalle) => {
          const pos = posiciones.find((p) => p.id === detalle.id);
          if (!pos) return false;
          return detalle.exposicion >= pos.posicionLarga && detalle.exposicion >= pos.posicionCorta;
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 12: Fórmula del APR Total ─────────────────────────────────────
// Valida: Requerimientos 13.1

describe('Propiedad 12: Fórmula del APR Total', () => {
  const agregador = new AgregadorAPR();

  it('APR_Total = 33.3 × (RO + RM + RC + RCripto) para cualquier conjunto de componentes', async () => {
    await fc.assert(
      fc.asyncProperty(componentesRiesgoArb, async (componentes) => {
        const resultado = await agregador.calcular(componentes);

        const sumaEsperada =
          componentes.riesgoOperacional +
          componentes.riesgoMercado +
          componentes.riesgoCredito +
          componentes.riesgoCriptoactivos;
        const aprEsperado = 33.3 * sumaEsperada;

        const tolerancia = Math.abs(aprEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.aprTotal - aprEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('APR_Total >= 0 cuando todos los componentes son no negativos', async () => {
    await fc.assert(
      fc.asyncProperty(componentesRiesgoArb, async (componentes) => {
        const resultado = await agregador.calcular(componentes);
        return resultado.aprTotal >= 0;
      }),
      { numRuns: 100 }
    );
  });
});
