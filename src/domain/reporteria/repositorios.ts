// Feature: cmf-prudential-metrics — Motor_Reportería: Repositorio de Escenarios de Stress

import { v4 as uuidv4 } from 'uuid';
import { EscenarioStressInput, ResultadoStress } from './stressTesting';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EscenarioGuardado {
  id: string;
  intermediarioId: string;
  escenario: EscenarioStressInput;
  resultado: ResultadoStress;
  fechaGuardado: Date;
}

// ─── RepositorioEscenarios ────────────────────────────────────────────────────

export class RepositorioEscenarios {
  private escenarios: EscenarioGuardado[] = [];

  guardar(escenario: EscenarioStressInput, resultado: ResultadoStress): EscenarioGuardado {
    const guardado: EscenarioGuardado = {
      id: uuidv4(),
      intermediarioId: escenario.usuarioCreacion, // se usa como clave de agrupación
      escenario,
      resultado,
      fechaGuardado: new Date(),
    };
    this.escenarios.push(guardado);
    return guardado;
  }

  obtenerPorId(id: string): EscenarioGuardado | null {
    return this.escenarios.find((e) => e.id === id) ?? null;
  }

  listarPorIntermediario(intermediarioId: string): EscenarioGuardado[] {
    return this.escenarios.filter((e) => e.intermediarioId === intermediarioId);
  }
}
