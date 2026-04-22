// Feature: cmf-prudential-metrics — Motor_Reportería: Simulador de Stress Testing

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface VariablesFicticias {
  tasaInteres?: number;
  tipoCambio?: number;
  volatilidad?: number;
}

export interface EscenarioStressInput {
  nombre: string;
  descripcion?: string;
  variables: VariablesFicticias;
  usuarioCreacion: string;
}

export interface DatosReales {
  patrimonioAjustado: number;
  aprTotal: number;
  garantias: number;
  activosRealizables7d: number;
  pasivosExigibles7d: number;
  patrimonioLiquido: number;
  pasivoExigibleTotal: number;
}

export interface ResultadoStress {
  escenario: EscenarioStressInput;
  ratiosActuales: Record<string, number | boolean>;
  ratiosProyectados: Record<string, number | boolean>;
  impactoPorRatio: Record<string, number>;
  fechaEjecucion: Date;
  advertencias: string[];
}

export interface RangosPermitidos {
  tasaInteres?: { min: number; max: number };
  tipoCambio?: { min: number; max: number };
  volatilidad?: { min: number; max: number };
}

// ─── SimuladorStress ──────────────────────────────────────────────────────────

export class SimuladorStress {
  /**
   * Ejecuta la simulación sobre una copia aislada de los datos reales.
   * Los datos reales NO se modifican. Requerimientos: 20.1, 20.2
   */
  ejecutar(escenario: EscenarioStressInput, datosReales: DatosReales): ResultadoStress {
    // Copia aislada — los datos reales nunca se tocan
    const copia: DatosReales = { ...datosReales };

    // Calcular ratios actuales (sobre datos reales sin modificar)
    const ratiosActuales = this._calcularRatios(datosReales);

    // Aplicar variables ficticias sobre la copia
    const copiaModificada = this._aplicarVariables(copia, escenario.variables);

    // Calcular ratios proyectados (sobre la copia modificada)
    const ratiosProyectados = this._calcularRatios(copiaModificada);

    // Calcular impacto numérico por ratio
    const impactoPorRatio = this._calcularImpacto(ratiosActuales, ratiosProyectados);

    return {
      escenario,
      ratiosActuales,
      ratiosProyectados,
      impactoPorRatio,
      fechaEjecucion: new Date(),
      advertencias: [],
    };
  }

  /**
   * Retorna advertencias si las variables ficticias están fuera de los rangos permitidos.
   * Requerimientos: 20.6
   */
  advertirFueraDeRango(variables: VariablesFicticias, rangos: RangosPermitidos): string[] {
    const advertencias: string[] = [];

    if (variables.tasaInteres !== undefined && rangos.tasaInteres) {
      const { min, max } = rangos.tasaInteres;
      if (variables.tasaInteres < min || variables.tasaInteres > max) {
        advertencias.push(
          `tasaInteres=${variables.tasaInteres} está fuera del rango permitido [${min}, ${max}]`
        );
      }
    }

    if (variables.tipoCambio !== undefined && rangos.tipoCambio) {
      const { min, max } = rangos.tipoCambio;
      if (variables.tipoCambio < min || variables.tipoCambio > max) {
        advertencias.push(
          `tipoCambio=${variables.tipoCambio} está fuera del rango permitido [${min}, ${max}]`
        );
      }
    }

    if (variables.volatilidad !== undefined && rangos.volatilidad) {
      const { min, max } = rangos.volatilidad;
      if (variables.volatilidad < min || variables.volatilidad > max) {
        advertencias.push(
          `volatilidad=${variables.volatilidad} está fuera del rango permitido [${min}, ${max}]`
        );
      }
    }

    return advertencias;
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  private _aplicarVariables(datos: DatosReales, variables: VariablesFicticias): DatosReales {
    const resultado = { ...datos };

    // Tasa de interés: afecta APR y patrimonio ajustado proporcionalmente
    if (variables.tasaInteres !== undefined) {
      const factor = 1 + variables.tasaInteres;
      resultado.aprTotal = resultado.aprTotal * factor;
      resultado.patrimonioAjustado = resultado.patrimonioAjustado * (1 - variables.tasaInteres * 0.1);
      resultado.patrimonioLiquido = resultado.patrimonioLiquido * (1 - variables.tasaInteres * 0.1);
    }

    // Tipo de cambio: afecta activos y pasivos en moneda extranjera
    if (variables.tipoCambio !== undefined) {
      const factor = 1 + variables.tipoCambio;
      resultado.activosRealizables7d = resultado.activosRealizables7d * factor;
      resultado.pasivosExigibles7d = resultado.pasivosExigibles7d * factor;
      resultado.pasivoExigibleTotal = resultado.pasivoExigibleTotal * factor;
    }

    // Volatilidad: afecta garantías y APR
    if (variables.volatilidad !== undefined) {
      const factor = 1 + variables.volatilidad;
      resultado.garantias = resultado.garantias * (1 - variables.volatilidad * 0.5);
      resultado.aprTotal = resultado.aprTotal * factor;
    }

    return resultado;
  }

  private _calcularRatios(datos: DatosReales): Record<string, number | boolean> {
    const LIMITE_UF_DEFAULT = 5000;
    const PORCENTAJE_APR_DEFAULT = 0.03;
    const LIMITE_GARANTIAS = 6000;
    const LIMITE_ENDEUDAMIENTO = 20;

    const umbralPatrimonio = Math.max(LIMITE_UF_DEFAULT, PORCENTAJE_APR_DEFAULT * datos.aprTotal);
    const patrimonioMinimo = datos.patrimonioAjustado >= umbralPatrimonio;
    const garantias = datos.garantias >= LIMITE_GARANTIAS;
    const liquidez = datos.pasivosExigibles7d <= datos.activosRealizables7d;
    const razonEndeudamiento =
      datos.patrimonioLiquido > 0
        ? datos.pasivoExigibleTotal / datos.patrimonioLiquido
        : Infinity;
    const endeudamiento = razonEndeudamiento <= LIMITE_ENDEUDAMIENTO;

    return {
      patrimonioMinimo,
      garantias,
      liquidez,
      endeudamiento,
      umbralPatrimonio,
      razonEndeudamiento: isFinite(razonEndeudamiento) ? razonEndeudamiento : -1,
    };
  }

  private _calcularImpacto(
    actuales: Record<string, number | boolean>,
    proyectados: Record<string, number | boolean>
  ): Record<string, number> {
    const impacto: Record<string, number> = {};

    for (const key of Object.keys(actuales)) {
      const actual = actuales[key];
      const proyectado = proyectados[key];

      if (typeof actual === 'number' && typeof proyectado === 'number') {
        impacto[key] = proyectado - actual;
      } else if (typeof actual === 'boolean' && typeof proyectado === 'boolean') {
        // 1 = mejoró, -1 = empeoró, 0 = sin cambio
        impacto[key] = proyectado === actual ? 0 : proyectado ? 1 : -1;
      }
    }

    return impacto;
  }
}
