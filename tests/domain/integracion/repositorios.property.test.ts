// Feature: cmf-prudential-metrics, Propiedad 4: Nocional obligatorio para derivados y CFD
// Feature: cmf-prudential-metrics, Propiedad 5: Ponderador por defecto para instrumentos sin clasificación crediticia
// Valida: Requerimientos 3.2, 3.4

import * as fc from 'fast-check';
import {
  RepositorioCartera,
  InstrumentoCarteraInput,
} from '../../../src/domain/integracion/repositorios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tabla6Ejemplo: Record<string, number> = {
  AAA: 0.1,
  AA: 0.2,
  A: 0.5,
  BBB: 1.0,
  sinClasificacion: 1.5,
};

function crearRepo(): RepositorioCartera {
  return new RepositorioCartera();
}

// ─── Propiedad 4 ──────────────────────────────────────────────────────────────

describe('Propiedad 4: Nocional obligatorio para derivados y CFD', () => {
  it('derivado o cfd sin montoNocional (o ≤ 0) debe lanzar error CPM-INT-003', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('derivado', 'cfd', 'Derivado', 'CFD'),
        fc.oneof(
          fc.constant(undefined),
          fc.constant(null as unknown as number),
          fc.constant(0),
          fc.float({ min: Math.fround(-1e6), max: Math.fround(-0.001), noNaN: true })
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        (tipo, nocional, intermediarioId) => {
          const repo = crearRepo();
          const input: InstrumentoCarteraInput = {
            intermediarioId,
            tipoInstrumento: tipo,
            montoNocional: nocional as number | undefined,
          };
          let lanzado = false;
          try {
            repo.registrar(input, 'usuario-test', tabla6Ejemplo);
          } catch (err) {
            lanzado = true;
            const mensaje = (err as Error).message;
            if (!mensaje.includes('CPM-INT-003')) {
              throw new Error(
                `Se esperaba código CPM-INT-003 en el error, pero se obtuvo: "${mensaje}"`
              );
            }
          }
          return lanzado;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('derivado o cfd con montoNocional > 0 debe registrarse exitosamente', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('derivado', 'cfd', 'Derivado', 'CFD'),
        fc.float({ min: Math.fround(0.001), max: Math.fround(1e9), noNaN: true }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (tipo, nocional, intermediarioId) => {
          const repo = crearRepo();
          const input: InstrumentoCarteraInput = {
            intermediarioId,
            tipoInstrumento: tipo,
            montoNocional: nocional,
            clasificacionCrediticia: 'AAA',
          };
          const resultado = repo.registrar(input, 'usuario-test', tabla6Ejemplo);
          return (
            typeof resultado.id === 'string' &&
            resultado.id.length > 0 &&
            resultado.montoNocional === nocional
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Propiedad 5 ──────────────────────────────────────────────────────────────

describe('Propiedad 5: Ponderador por defecto para instrumentos sin clasificación crediticia', () => {
  it('instrumento sin clasificacionCrediticia recibe el ponderador máximo de tabla6Ponderadores', () => {
    fc.assert(
      fc.property(
        // tabla6 con al menos 1 entrada
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(2.0), noNaN: true }),
          { minKeys: 1, maxKeys: 10 }
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        // tipo que NO requiere nocional para simplificar
        fc.constantFrom('accion', 'bono', 'fondo'),
        (tabla6, intermediarioId, tipo) => {
          const repo = crearRepo();
          const input: InstrumentoCarteraInput = {
            intermediarioId,
            tipoInstrumento: tipo,
            // sin clasificacionCrediticia
          };
          const resultado = repo.registrar(input, 'usuario-test', tabla6);

          const valorMaximo = Math.max(...Object.values(tabla6));
          return resultado.ponderadorTabla6 === String(valorMaximo);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('instrumento con clasificacionCrediticia no recibe ponderador por defecto', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.constantFrom('accion', 'bono', 'fondo'),
        (clasificacion, intermediarioId, tipo) => {
          const repo = crearRepo();
          const input: InstrumentoCarteraInput = {
            intermediarioId,
            tipoInstrumento: tipo,
            clasificacionCrediticia: clasificacion,
          };
          const resultado = repo.registrar(input, 'usuario-test', tabla6Ejemplo);
          // No debe asignarse ponderador por defecto cuando hay clasificación
          return resultado.ponderadorTabla6 === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });
});
