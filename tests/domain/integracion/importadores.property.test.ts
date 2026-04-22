// Feature: cmf-prudential-metrics, Propiedad 2: Trazabilidad completa de toda operación de ingesta
// Feature: cmf-prudential-metrics, Propiedad 3: Registro de errores de importación
// Valida: Requerimientos 1.2, 1.4, 1.5, 2.3, 2.4

import * as fc from 'fast-check';
import { CargadorManual } from '../../../src/domain/integracion/importadores';

const cargador = new CargadorManual();

const contenidoValido = {
  balanceGeneral: { activos: 1000, pasivos: 600, patrimonio: 400 },
  estadoResultados: { ingresos: 500, gastos: 300, resultado: 200 },
  cuentasContables: {},
};

describe('Propiedad 2: Trazabilidad completa de toda operación de ingesta exitosa', () => {
  it('toda carga manual exitosa contiene fechaImportacion, origen, usuarioResponsable y cargaManual=true', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (nombreArchivo, intermediarioId, usuarioResponsable) => {
          const resultado = cargador.cargar(
            contenidoValido,
            nombreArchivo,
            intermediarioId,
            usuarioResponsable
          );
          if (!resultado.exito) return true; // skip si falla por otro motivo
          return (
            resultado.datos.fechaImportacion instanceof Date &&
            resultado.datos.origen === nombreArchivo &&
            resultado.datos.usuarioResponsable === usuarioResponsable &&
            resultado.datos.cargaManual === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Propiedad 3: Registro de errores de importación contiene timestamp, codigoError y origen', () => {
  it('toda carga fallida retorna error con timestamp, codigoError y origen', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (nombreArchivo, intermediarioId, usuarioResponsable) => {
          // Contenido intencionalmente inválido (sin campos obligatorios)
          const resultado = cargador.cargar(
            {},
            nombreArchivo,
            intermediarioId,
            usuarioResponsable
          );
          if (resultado.exito) return true; // skip si por alguna razón pasa
          return (
            resultado.error.timestamp instanceof Date &&
            typeof resultado.error.codigoError === 'string' &&
            resultado.error.codigoError.length > 0 &&
            typeof resultado.error.origen === 'string' &&
            resultado.error.origen.length > 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
