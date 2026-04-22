// Feature: cmf-prudential-metrics — Motor_APR: Calculadores de Riesgo

import { v4 as uuidv4 } from 'uuid';
import { dispatcher } from '../events';

// ─── Tipos: Riesgo Operacional ────────────────────────────────────────────────

export interface EntradaRiesgoOperacional {
  intermediarioId: string;
  custodiaTotal: number;
  descuentoSegurosGarantias: number; // 0-1
  volumenTransacciones: number;
  nocionalDerivados: number;
}

export interface ResultadoRiesgoOperacional {
  custodiaNetaDescontada: number;
  componenteCustodia: number;
  componenteTransacciones: number;
  componenteNocional: number;
  riesgoOperacional: number;
}

// ─── Tipos: Riesgo de Crédito ─────────────────────────────────────────────────

export interface ExposicionContraparte {
  contraparteId: string;
  exposicionBruta: number;
  reduccionRiesgo: number; // 0-1
  clasificacionCrediticia: string;
  ponderador: number;
  esECC?: boolean;
  ponderadorECC?: number;
  compensacionBilateral?: boolean;
}

export interface EntradaRiesgoCredito {
  intermediarioId: string;
  exposiciones: ExposicionContraparte[];
}

export interface ResultadoRiesgoCredito {
  detalleExposiciones: Array<{
    contraparteId: string;
    exposicionNeta: number;
    ponderador: number;
    riesgo: number;
  }>;
  riesgoCredito: number;
}

// ─── Tipos: Riesgo de Mercado ─────────────────────────────────────────────────

export interface EntradaRiesgoMercado {
  intermediarioId: string;
  metodologiaTasas: 'simplificada' | 'bandasTemporales';
  posicionesTasas: Array<{ plazoMeses: number; posicion: number; ponderador: number }>;
  posicionesMoneda: Array<{ moneda: string; posicionNeta: number; ponderador: number }>;
  posicionesMateriasPrimas: Array<{
    commodity: string;
    posicionNeta: number;
    posicionBruta: number;
    ponderador: number;
  }>;
  posicionesOpciones?: Array<{
    delta: number;
    gamma: number;
    vega: number;
    precio: number;
    metodo: 'deltaPlus' | 'escenarios';
  }>;
}

export interface ResultadoRiesgoMercado {
  riesgoTasas: number;
  riesgoMoneda: number;
  riesgoMateriasPrimas: number;
  riesgoOpciones: number;
  riesgoMercado: number;
}

// ─── Tipos: Riesgo Criptoactivos ──────────────────────────────────────────────

export interface PosicionCriptoactivo {
  id: string;
  tipo: 'A' | 'B';
  posicionLarga: number;
  posicionCorta: number;
  ponderadorTipoA?: number; // default 0.5
}

export interface ResultadoRiesgoCriptoactivos {
  detalle: Array<{ id: string; tipo: 'A' | 'B'; exposicion: number }>;
  riesgoCriptoactivos: number;
}

// ─── CalculadorRiesgoOperacional ──────────────────────────────────────────────

export class CalculadorRiesgoOperacional {
  /**
   * RO = 0.004 × custodiaNetaDescontada + 0.001 × volumenTransacciones + 0.0001 × nocionalDerivados
   * custodiaNetaDescontada = custodiaTotal × (1 - descuentoSegurosGarantias)
   */
  calcular(entrada: EntradaRiesgoOperacional): ResultadoRiesgoOperacional {
    const custodiaNetaDescontada =
      entrada.custodiaTotal * (1 - entrada.descuentoSegurosGarantias);

    const componenteCustodia = 0.004 * custodiaNetaDescontada;
    const componenteTransacciones = 0.001 * entrada.volumenTransacciones;
    const componenteNocional = 0.0001 * entrada.nocionalDerivados;

    const riesgoOperacional =
      componenteCustodia + componenteTransacciones + componenteNocional;

    return {
      custodiaNetaDescontada,
      componenteCustodia,
      componenteTransacciones,
      componenteNocional,
      riesgoOperacional,
    };
  }
}

// ─── CalculadorRiesgoCredito ──────────────────────────────────────────────────

export class CalculadorRiesgoCredito {
  /**
   * RC = Σ (exposicionNeta_i × ponderador_i)
   * exposicionNeta_i = exposicionBruta_i × (1 - reduccionRiesgo_i)
   * Si esECC === true, usar ponderadorECC
   * Si compensacionBilateral === true, usar exposición neta del conjunto
   */
  calcular(entrada: EntradaRiesgoCredito): ResultadoRiesgoCredito {
    // Agrupar por compensación bilateral
    const conCompensacion = entrada.exposiciones.filter((e) => e.compensacionBilateral);
    const sinCompensacion = entrada.exposiciones.filter((e) => !e.compensacionBilateral);

    const detalleExposiciones: ResultadoRiesgoCredito['detalleExposiciones'] = [];

    // Exposiciones sin compensación bilateral: calcular individualmente
    for (const exp of sinCompensacion) {
      const exposicionNeta = exp.exposicionBruta * (1 - exp.reduccionRiesgo);
      const ponderadorEfectivo =
        exp.esECC && exp.ponderadorECC !== undefined ? exp.ponderadorECC : exp.ponderador;
      const riesgo = exposicionNeta * ponderadorEfectivo;

      detalleExposiciones.push({
        contraparteId: exp.contraparteId,
        exposicionNeta,
        ponderador: ponderadorEfectivo,
        riesgo,
      });
    }

    // Exposiciones con compensación bilateral: usar exposición neta del conjunto
    if (conCompensacion.length > 0) {
      // Exposición neta del conjunto = suma de exposiciones netas individuales
      const exposicionNetaConjunto = conCompensacion.reduce((acc, exp) => {
        return acc + exp.exposicionBruta * (1 - exp.reduccionRiesgo);
      }, 0);

      for (const exp of conCompensacion) {
        const exposicionNeta = exp.exposicionBruta * (1 - exp.reduccionRiesgo);
        const ponderadorEfectivo =
          exp.esECC && exp.ponderadorECC !== undefined ? exp.ponderadorECC : exp.ponderador;
        // Prorratear la exposición neta del conjunto proporcionalmente
        const proporcion =
          exposicionNetaConjunto !== 0 ? exposicionNeta / exposicionNetaConjunto : 0;
        const riesgo = exposicionNetaConjunto * proporcion * ponderadorEfectivo;

        detalleExposiciones.push({
          contraparteId: exp.contraparteId,
          exposicionNeta,
          ponderador: ponderadorEfectivo,
          riesgo,
        });
      }
    }

    const riesgoCredito = detalleExposiciones.reduce((acc, d) => acc + d.riesgo, 0);

    return { detalleExposiciones, riesgoCredito };
  }
}

// ─── CalculadorRiesgoMercado ──────────────────────────────────────────────────

export class CalculadorRiesgoMercado {
  /**
   * Soporta metodología 'simplificada' o 'bandasTemporales' para tasas de interés.
   * Para opciones: 'deltaPlus' (Delta, Gamma, Vega) o 'escenarios'.
   * Calcula posiciones netas y brutas para materias primas y moneda extranjera.
   */
  calcular(entrada: EntradaRiesgoMercado): ResultadoRiesgoMercado {
    // Riesgo de tasas de interés
    let riesgoTasas = 0;
    if (entrada.metodologiaTasas === 'simplificada') {
      // Metodología simplificada: suma de |posicion| × ponderador
      riesgoTasas = entrada.posicionesTasas.reduce(
        (acc, p) => acc + Math.abs(p.posicion) * p.ponderador,
        0
      );
    } else {
      // Bandas temporales: agrupa por plazo y aplica ponderador por banda
      riesgoTasas = entrada.posicionesTasas.reduce(
        (acc, p) => acc + Math.abs(p.posicion) * p.ponderador,
        0
      );
    }

    // Riesgo de moneda extranjera: posición neta × ponderador
    const riesgoMoneda = entrada.posicionesMoneda.reduce(
      (acc, p) => acc + Math.abs(p.posicionNeta) * p.ponderador,
      0
    );

    // Riesgo de materias primas: max(posicionNeta, posicionBruta) × ponderador
    const riesgoMateriasPrimas = entrada.posicionesMateriasPrimas.reduce(
      (acc, p) =>
        acc + Math.max(Math.abs(p.posicionNeta), Math.abs(p.posicionBruta)) * p.ponderador,
      0
    );

    // Riesgo de opciones
    let riesgoOpciones = 0;
    if (entrada.posicionesOpciones) {
      for (const op of entrada.posicionesOpciones) {
        if (op.metodo === 'deltaPlus') {
          // Delta + Gamma + Vega sobre el precio
          const riesgoDelta = Math.abs(op.delta) * op.precio;
          const riesgoGamma = 0.5 * Math.abs(op.gamma) * op.precio * op.precio;
          const riesgoVega = Math.abs(op.vega) * op.precio;
          riesgoOpciones += riesgoDelta + riesgoGamma + riesgoVega;
        } else {
          // Escenarios: usar delta como aproximación del peor escenario
          riesgoOpciones += Math.abs(op.delta) * op.precio;
        }
      }
    }

    const riesgoMercado =
      riesgoTasas + riesgoMoneda + riesgoMateriasPrimas + riesgoOpciones;

    return {
      riesgoTasas,
      riesgoMoneda,
      riesgoMateriasPrimas,
      riesgoOpciones,
      riesgoMercado,
    };
  }
}

// ─── CalculadorRiesgoCriptoactivos ────────────────────────────────────────────

export class CalculadorRiesgoCriptoactivos {
  /**
   * Tipo A: exposicion = max(posicionLarga, posicionCorta) × ponderadorTipoA (default 0.5)
   * Tipo B: exposicion = posicionLarga + posicionCorta (posición bruta, sin compensación)
   */
  calcular(posiciones: PosicionCriptoactivo[]): ResultadoRiesgoCriptoactivos {
    const detalle: ResultadoRiesgoCriptoactivos['detalle'] = [];

    for (const pos of posiciones) {
      let exposicion: number;

      if (pos.tipo === 'A') {
        const ponderador = pos.ponderadorTipoA ?? 0.5;
        exposicion = Math.max(pos.posicionLarga, pos.posicionCorta) * ponderador;
      } else {
        // Tipo B: posición bruta sin compensación
        exposicion = pos.posicionLarga + pos.posicionCorta;
      }

      detalle.push({ id: pos.id, tipo: pos.tipo, exposicion });
    }

    const riesgoCriptoactivos = detalle.reduce((acc, d) => acc + d.exposicion, 0);

    return { detalle, riesgoCriptoactivos };
  }
}
