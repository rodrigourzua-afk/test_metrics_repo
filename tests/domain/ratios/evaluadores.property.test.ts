// Feature: cmf-prudential-metrics, Propiedad 13: Umbral de Patrimonio Mínimo
// Feature: cmf-prudential-metrics, Propiedad 14: Índice de garantías aplica solo a Bloque 2 y 3
// Feature: cmf-prudential-metrics, Propiedad 15: Fórmula del Índice de Liquidez
// Feature: cmf-prudential-metrics, Propiedad 16: Fórmula de la Razón de Endeudamiento

import * as fc from 'fast-check';
import {
  EvaluadorPatrimonioMinimo,
  EvaluadorGarantias,
  EvaluadorLiquidez,
  EvaluadorEndeudamiento,
  EntradaPatrimonioMinimo,
  EntradaGarantias,
  EntradaLiquidez,
  EntradaEndeudamiento,
} from '../../../src/domain/ratios/evaluadores';
import { dispatcher } from '../../../src/domain/events';

beforeAll(() => {
  dispatcher.clear();
});

afterAll(() => {
  dispatcher.clear();
});

// ─── Generadores ──────────────────────────────────────────────────────────────

const monto = fc.float({ min: 0, max: Math.fround(1_000_000_000), noNaN: true });
const montoConNegativo = fc.float({ min: Math.fround(-1_000_000_000), max: Math.fround(1_000_000_000), noNaN: true });

const entradaPatrimonioMinimoArb: fc.Arbitrary<EntradaPatrimonioMinimo> = fc.record({
  intermediarioId: fc.uuid(),
  patrimonioAjustado: montoConNegativo,
  aprTotal: monto,
  limiteUF: monto,
  porcentajeAPR: fc.float({ min: 0, max: Math.fround(0.06), noNaN: true }),
});

const bloqueArb = fc.oneof(
  fc.constant('Bloque1'),
  fc.constant('Bloque2'),
  fc.constant('Bloque3')
);

const entradaGarantiasArb: fc.Arbitrary<EntradaGarantias> = fc.record({
  intermediarioId: fc.uuid(),
  bloque: bloqueArb,
  garantiasConstituidas: monto,
  limiteGarantiasUf: monto,
});

const entradaLiquidezArb: fc.Arbitrary<EntradaLiquidez> = fc.record({
  intermediarioId: fc.uuid(),
  activosRealizables7d: monto,
  pasivosExigibles7d: monto,
});

const entradaEndeudamientoArb: fc.Arbitrary<EntradaEndeudamiento> = fc.record({
  intermediarioId: fc.uuid(),
  pasivoExigibleTotal: monto,
  patrimonioLiquido: montoConNegativo,
  limiteRazonEndeudamiento: fc.float({ min: 1, max: Math.fround(100), noNaN: true }),
});

// ─── Propiedad 13: Umbral de Patrimonio Mínimo ───────────────────────────────
// Valida: Requerimientos 14.1

describe('Propiedad 13: Umbral de Patrimonio Mínimo', () => {
  const evaluador = new EvaluadorPatrimonioMinimo();

  it('umbral = max(limiteUF, porcentajeAPR × aprTotal) para cualquier entrada válida', async () => {
    await fc.assert(
      fc.asyncProperty(entradaPatrimonioMinimoArb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);

        const porcentajeEfectivo = Math.min(entrada.porcentajeAPR, 0.06);
        const umbralEsperado = Math.max(entrada.limiteUF, porcentajeEfectivo * entrada.aprTotal);

        const tolerancia = Math.abs(umbralEsperado) * 1e-9 + 1e-6;
        return Math.abs(resultado.umbral - umbralEsperado) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 14: Índice de garantías aplica solo a Bloque 2 y 3 ────────────
// Valida: Requerimientos 15.1

describe('Propiedad 14: Índice de garantías aplica solo a Bloque 2 y 3', () => {
  const evaluador = new EvaluadorGarantias();

  it('Para Bloque1: aplica === false', async () => {
    const entradaBloque1Arb: fc.Arbitrary<EntradaGarantias> = fc.record({
      intermediarioId: fc.uuid(),
      bloque: fc.constant('Bloque1'),
      garantiasConstituidas: monto,
      limiteGarantiasUf: monto,
    });

    await fc.assert(
      fc.asyncProperty(entradaBloque1Arb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);
        return resultado.aplica === false;
      }),
      { numRuns: 100 }
    );
  });

  it('Para Bloque2 y Bloque3: aplica === true', async () => {
    const entradaBloques23Arb: fc.Arbitrary<EntradaGarantias> = fc.record({
      intermediarioId: fc.uuid(),
      bloque: fc.oneof(fc.constant('Bloque2'), fc.constant('Bloque3')),
      garantiasConstituidas: monto,
      limiteGarantiasUf: monto,
    });

    await fc.assert(
      fc.asyncProperty(entradaBloques23Arb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);
        return resultado.aplica === true;
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 15: Fórmula del Índice de Liquidez ────────────────────────────
// Valida: Requerimientos 16.1

describe('Propiedad 15: Fórmula del Índice de Liquidez', () => {
  const evaluador = new EvaluadorLiquidez();

  it('cumple si y solo si pasivosExigibles7d <= activosRealizables7d', async () => {
    await fc.assert(
      fc.asyncProperty(entradaLiquidezArb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);
        const cumpleEsperado = entrada.pasivosExigibles7d <= entrada.activosRealizables7d;
        return resultado.cumple === cumpleEsperado;
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 16: Fórmula de la Razón de Endeudamiento ──────────────────────
// Valida: Requerimientos 17.1

describe('Propiedad 16: Fórmula de la Razón de Endeudamiento', () => {
  const evaluador = new EvaluadorEndeudamiento();

  it('razon = pasivoExigibleTotal / patrimonioLiquido cuando patrimonioLiquido > 0', async () => {
    const entradaPositivaArb: fc.Arbitrary<EntradaEndeudamiento> = fc.record({
      intermediarioId: fc.uuid(),
      pasivoExigibleTotal: monto,
      patrimonioLiquido: fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000_000), noNaN: true }),
      limiteRazonEndeudamiento: fc.float({ min: 1, max: Math.fround(100), noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(entradaPositivaArb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);
        if (resultado.incalculable) return false;

        const razonEsperada = entrada.pasivoExigibleTotal / entrada.patrimonioLiquido;
        const tolerancia = Math.abs(razonEsperada) * 1e-9 + 1e-6;
        return Math.abs((resultado.razon as number) - razonEsperada) <= tolerancia;
      }),
      { numRuns: 100 }
    );
  });

  it('incalculable === true cuando patrimonioLiquido <= 0', async () => {
    const entradaNoPositivaArb: fc.Arbitrary<EntradaEndeudamiento> = fc.record({
      intermediarioId: fc.uuid(),
      pasivoExigibleTotal: monto,
      patrimonioLiquido: fc.float({ min: Math.fround(-1_000_000_000), max: 0, noNaN: true }),
      limiteRazonEndeudamiento: fc.float({ min: 1, max: Math.fround(100), noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(entradaNoPositivaArb, async (entrada) => {
        const resultado = await evaluador.evaluar(entrada);
        return resultado.incalculable === true;
      }),
      { numRuns: 100 }
    );
  });
});
