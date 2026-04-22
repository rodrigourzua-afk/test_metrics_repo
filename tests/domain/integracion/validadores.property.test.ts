// Feature: cmf-prudential-metrics, Propiedad 1: Validación de esquema rechaza datos incompletos
// Valida: Requerimientos 1.3, 1.4, 2.1, 2.2

import * as fc from 'fast-check';
import { ValidadorEsquema, ValidadorConsistencia } from '../../../src/domain/integracion/validadores';

const validadorEsquema = new ValidadorEsquema();
const validadorConsistencia = new ValidadorConsistencia();

// Objeto contable válido base
const datosValidos = {
  balanceGeneral: { activos: 1000, pasivos: 600, patrimonio: 400 },
  estadoResultados: { ingresos: 500, gastos: 300, resultado: 200 },
  cuentasContables: {},
  intermediarioId: 'int-001',
  origen: 'sistema-contable',
  usuarioResponsable: 'operador1',
};

describe('Propiedad 1: ValidadorEsquema rechaza datos incompletos', () => {
  it('rechaza cualquier objeto con campo obligatorio faltante', () => {
    const camposObligatorios = [
      'balanceGeneral',
      'estadoResultados',
      'cuentasContables',
      'intermediarioId',
      'origen',
      'usuarioResponsable',
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...camposObligatorios),
        (campoEliminado) => {
          const datosIncompletos = { ...datosValidos };
          delete (datosIncompletos as Record<string, unknown>)[campoEliminado];
          const resultado = validadorEsquema.validar(datosIncompletos);
          return resultado.valido === false && resultado.errores.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('acepta datos completos y válidos', () => {
    const resultado = validadorEsquema.validar(datosValidos);
    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('rechaza objeto vacío', () => {
    const resultado = validadorEsquema.validar({});
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.length).toBeGreaterThan(0);
  });

  it('rechaza null y undefined', () => {
    expect(validadorEsquema.validar(null).valido).toBe(false);
    expect(validadorEsquema.validar(undefined).valido).toBe(false);
  });
});

describe('Propiedad 1 (extensión): ValidadorConsistencia detecta descuadre contable', () => {
  it('rechaza cualquier balance donde activos ≠ pasivos + patrimonio (diferencia > 0.01)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.02, max: 1e6, noNaN: true }),
        (descuadre) => {
          const datos = {
            ...datosValidos,
            balanceGeneral: {
              activos: 1000 + descuadre,
              pasivos: 600,
              patrimonio: 400,
            },
          };
          const resultado = validadorConsistencia.validar(datos);
          return resultado.valido === false && resultado.errores.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('acepta balance cuadrado exactamente', () => {
    const resultado = validadorConsistencia.validar(datosValidos);
    expect(resultado.valido).toBe(true);
  });
});
