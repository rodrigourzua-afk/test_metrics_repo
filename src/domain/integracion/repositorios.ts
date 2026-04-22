// Feature: cmf-prudential-metrics — Motor_Integración: Repositorios de cartera, parámetros y personas relacionadas
// Requerimientos: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5

import { v4 as uuidv4 } from 'uuid';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface InstrumentoCarteraInput {
  intermediarioId: string;
  tipoInstrumento: string;
  valorCustodia?: number;
  volumenCompra?: number;
  volumenVenta?: number;
  montoNocional?: number;
  plazoVencimiento?: Date;
  moneda?: string;
  tipoTasa?: string;
  subyacente?: string;
  clasificacionCrediticia?: string;
}

export interface InstrumentoCartera extends InstrumentoCarteraInput {
  id: string;
  ponderadorTabla6?: string;
  fechaRegistro: Date;
  usuarioResponsable: string;
}

export interface ParametrosInput {
  tabla6Ponderadores: Record<string, number>;
  limitePatrimonioMinimoUf: number;
  porcentajeAprDefecto: number;
  porcentajeAprMaximo: number;
  limiteGarantiasUf: number;
  limiteRazonEndeudamiento: number;
  canastasMonedas: Record<string, unknown>;
  tablaAntiguedadImpagos: Record<string, number>;
  descuentosSegurosGarantias: Record<string, number>;
}

export interface ParametrosRegulatorios extends ParametrosInput {
  id: string;
  version: number;
  fechaVigenciaInicio: Date;
  fechaVigenciaFin?: Date;
  usuarioResponsable: string;
}

export interface CambioParametro {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  fecha: Date;
  usuarioResponsable: string;
}

export interface PersonaInput {
  intermediarioId: string;
  nombre: string;
  tipoRelacion: string;
  saldoPorCobrar: number;
}

export interface PersonaRelacionada extends PersonaInput {
  id: string;
  fechaRegistro: Date;
  fechaModificacion: Date;
}

// ─── Tipos de derivados/CFD que requieren nocional ────────────────────────────

const TIPOS_REQUIEREN_NOCIONAL = new Set(['derivado', 'cfd']);

// ─── RepositorioCartera ───────────────────────────────────────────────────────

/**
 * Gestiona instrumentos de cartera en memoria.
 * Requerimientos: 3.1, 3.2, 3.3, 3.4
 */
export class RepositorioCartera {
  private readonly _instrumentos: Map<string, InstrumentoCartera> = new Map();

  /**
   * Registra un instrumento de cartera.
   * - Derivados y CFD deben tener montoNocional > 0 (CPM-INT-003).
   * - Sin clasificacionCrediticia → ponderadorTabla6 = máximo de tabla6Ponderadores.
   */
  registrar(
    instrumento: InstrumentoCarteraInput,
    usuarioResponsable: string,
    tabla6Ponderadores: Record<string, number> = {}
  ): InstrumentoCartera {
    const tipo = instrumento.tipoInstrumento.toLowerCase();

    // Validación: nocional obligatorio para derivados y CFD
    if (TIPOS_REQUIEREN_NOCIONAL.has(tipo)) {
      if (
        instrumento.montoNocional === undefined ||
        instrumento.montoNocional === null ||
        instrumento.montoNocional <= 0
      ) {
        throw new Error(
          `CPM-INT-003: El instrumento de tipo '${instrumento.tipoInstrumento}' requiere montoNocional no nulo y mayor a cero.`
        );
      }
    }

    // Asignar ponderador por defecto si no hay clasificación crediticia
    let ponderadorTabla6: string | undefined;
    if (
      instrumento.clasificacionCrediticia === undefined ||
      instrumento.clasificacionCrediticia === null ||
      instrumento.clasificacionCrediticia === ''
    ) {
      const valores = Object.values(tabla6Ponderadores);
      if (valores.length > 0) {
        const maximo = Math.max(...valores);
        ponderadorTabla6 = String(maximo);
      }
    }

    const nuevo: InstrumentoCartera = {
      ...instrumento,
      id: uuidv4(),
      ponderadorTabla6,
      fechaRegistro: new Date(),
      usuarioResponsable,
    };

    this._instrumentos.set(nuevo.id, nuevo);
    return nuevo;
  }

  obtenerPorIntermediario(intermediarioId: string): InstrumentoCartera[] {
    return Array.from(this._instrumentos.values()).filter(
      (i) => i.intermediarioId === intermediarioId
    );
  }

  obtenerTodos(): InstrumentoCartera[] {
    return Array.from(this._instrumentos.values());
  }
}

// ─── RepositorioParametros ────────────────────────────────────────────────────

/**
 * Gestiona parámetros regulatorios con versionado e historial de cambios.
 * Requerimientos: 5.2, 5.3, 5.4, 5.5
 */
export class RepositorioParametros {
  private readonly _parametros: Map<string, ParametrosRegulatorios> = new Map();
  private readonly _historial: Map<string, CambioParametro[]> = new Map();
  private _versionActual = 0;

  crear(params: ParametrosInput, usuarioResponsable: string): ParametrosRegulatorios {
    this._versionActual += 1;

    // Cerrar vigencia del parámetro vigente anterior
    const vigente = this.obtenerVigente();
    if (vigente) {
      const actualizado: ParametrosRegulatorios = {
        ...vigente,
        fechaVigenciaFin: new Date(),
      };
      this._parametros.set(vigente.id, actualizado);
    }

    const nuevo: ParametrosRegulatorios = {
      ...params,
      id: uuidv4(),
      version: this._versionActual,
      fechaVigenciaInicio: new Date(),
      usuarioResponsable,
    };

    this._parametros.set(nuevo.id, nuevo);
    this._historial.set(nuevo.id, []);
    return nuevo;
  }

  actualizar(
    id: string,
    cambios: Partial<ParametrosInput>,
    usuarioResponsable: string
  ): ParametrosRegulatorios {
    const existente = this._parametros.get(id);
    if (!existente) {
      throw new Error(`CPM-INT-005: Parámetro con id '${id}' no encontrado.`);
    }

    const fecha = new Date();
    const historialId = this._historial.get(id) ?? [];

    // Registrar cada campo modificado en el historial
    for (const campo of Object.keys(cambios) as (keyof ParametrosInput)[]) {
      historialId.push({
        campo,
        valorAnterior: existente[campo],
        valorNuevo: cambios[campo],
        fecha,
        usuarioResponsable,
      });
    }
    this._historial.set(id, historialId);

    const actualizado: ParametrosRegulatorios = {
      ...existente,
      ...cambios,
      usuarioResponsable,
    };
    this._parametros.set(id, actualizado);
    return actualizado;
  }

  eliminar(id: string): void {
    const existente = this._parametros.get(id);
    if (!existente) {
      throw new Error(`CPM-INT-005: Parámetro con id '${id}' no encontrado.`);
    }

    // Verificar si está en uso: es el vigente (sin fechaVigenciaFin)
    if (!existente.fechaVigenciaFin) {
      throw new Error(
        `CPM-INT-005: No se puede eliminar el parámetro '${id}' porque está actualmente en uso (vigente).`
      );
    }

    this._parametros.delete(id);
    this._historial.delete(id);
  }

  obtenerVigente(): ParametrosRegulatorios | null {
    for (const p of this._parametros.values()) {
      if (!p.fechaVigenciaFin) return p;
    }
    return null;
  }

  obtenerPorId(id: string): ParametrosRegulatorios | null {
    return this._parametros.get(id) ?? null;
  }

  obtenerHistorial(id: string): CambioParametro[] {
    return this._historial.get(id) ?? [];
  }
}

// ─── RepositorioPersonasRelacionadas ─────────────────────────────────────────

/**
 * CRUD de personas relacionadas en memoria.
 * Requerimientos: 4.1, 4.3
 */
export class RepositorioPersonasRelacionadas {
  private readonly _personas: Map<string, PersonaRelacionada> = new Map();

  crear(persona: PersonaInput, usuarioResponsable: string): PersonaRelacionada {
    const ahora = new Date();
    const nueva: PersonaRelacionada = {
      ...persona,
      id: uuidv4(),
      fechaRegistro: ahora,
      fechaModificacion: ahora,
    };
    this._personas.set(nueva.id, nueva);
    return nueva;
  }

  actualizar(id: string, cambios: Partial<PersonaInput>): PersonaRelacionada {
    const existente = this._personas.get(id);
    if (!existente) {
      throw new Error(`Persona relacionada con id '${id}' no encontrada.`);
    }
    const actualizada: PersonaRelacionada = {
      ...existente,
      ...cambios,
      fechaModificacion: new Date(),
    };
    this._personas.set(id, actualizada);
    return actualizada;
  }

  eliminar(id: string): void {
    if (!this._personas.has(id)) {
      throw new Error(`Persona relacionada con id '${id}' no encontrada.`);
    }
    this._personas.delete(id);
  }

  obtenerPorIntermediario(intermediarioId: string): PersonaRelacionada[] {
    return Array.from(this._personas.values()).filter(
      (p) => p.intermediarioId === intermediarioId
    );
  }

  obtenerPorId(id: string): PersonaRelacionada | null {
    return this._personas.get(id) ?? null;
  }
}
