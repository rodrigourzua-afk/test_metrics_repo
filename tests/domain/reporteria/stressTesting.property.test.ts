// Feature: cmf-prudential-metrics, Propiedad 17: Aislamiento de la simulación de stress testing

import * as fc from 'fast-check';
import {
  SimuladorStress,
  EscenarioStressInput,
  DatosReales,
  VariablesFicticias,
} from '../../../src/domain/reporteria/stressTesting';

// ─── Generadores ──────────────────────────────────────────────────────────────

const montoArb = fc.float({ min: 0, max: Math.fround(1_000_000_000), noNaN: true });
const montoConNegativoArb = fc.float({
  min: Math.fround(-1_000_000_000),
  max: Math.fround(1_000_000_000),
  noNaN: true,
});
const factorArb = fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true });

const datosRealesArb: fc.Arbitrary<DatosReales> = fc.record({
  patrimonioAjustado: montoConNegativoArb,
  aprTotal: montoArb,
  garantias: montoArb,
  activosRealizables7d: montoArb,
  pasivosExigibles7d: montoArb,
  patrimonioLiquido: montoConNegativoArb,
  pasivoExigibleTotal: montoArb,
});

const variablesFictiiciasArb: fc.Arbitrary<VariablesFicticias> = fc.record({
  tasaInteres: fc.option(factorArb, { nil: undefined }),
  tipoCambio: fc.option(factorArb, { nil: undefined }),
  volatilidad: fc.option(factorArb, { nil: undefined }),
});

const escenarioArb: fc.Arbitrary<EscenarioStressInput> = fc.record({
  nombre: fc.string({ minLength: 1, maxLength: 50 }),
  descripcion: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  variables: variablesFictiiciasArb,
  usuarioCreacion: fc.string({ minLength: 1, maxLength: 50 }),
});

// ─── Propiedad 17: Aislamiento de la simulación de stress testing ─────────────
// Valida: Requerimientos 20.2, 20.5

describe('Propiedad 17: Aislamiento de la simulación de stress testing', () => {
  const simulador = new SimuladorStress();

  it('los datosReales deben ser idénticos antes y después de ejecutar la simulación', () => {
    fc.assert(
      fc.property(escenarioArb, datosRealesArb, (escenario, datosReales) => {
        // Capturar snapshot de los datos reales ANTES de la simulación
        const snapshotAntes: DatosReales = { ...datosReales };

        // Ejecutar simulación
        simulador.ejecutar(escenario, datosReales);

        // Verificar que los datos reales NO fueron modificados
        return (
          datosReales.patrimonioAjustado === snapshotAntes.patrimonioAjustado &&
          datosReales.aprTotal === snapshotAntes.aprTotal &&
          datosReales.garantias === snapshotAntes.garantias &&
          datosReales.activosRealizables7d === snapshotAntes.activosRealizables7d &&
          datosReales.pasivosExigibles7d === snapshotAntes.pasivosExigibles7d &&
          datosReales.patrimonioLiquido === snapshotAntes.patrimonioLiquido &&
          datosReales.pasivoExigibleTotal === snapshotAntes.pasivoExigibleTotal
        );
      }),
      { numRuns: 100 }
    );
  });
});
