// Feature: cmf-prudential-metrics — Bus de eventos interno del sistema CPM

export interface Evento {
  eventId: string;
  timestamp: Date;
  nombre: string;
}

// Motor_Integración
export interface DatosContablesImportados extends Evento {
  nombre: 'DatosContablesImportados';
  intermediarioId: string;
  datosContablesId: string;
  origen: string;
  usuarioResponsable: string;
  cargaManual: boolean;
}

export interface DatosContablesRechazados extends Evento {
  nombre: 'DatosContablesRechazados';
  intermediarioId: string;
  errores: string[];
  origen: string;
  usuarioResponsable: string;
}

export interface ParametroRegulatorioActualizado extends Evento {
  nombre: 'ParametroRegulatorioActualizado';
  parametrosId: string;
  version: number;
  usuarioResponsable: string;
  camposModificados: string[];
}

export interface DatosActualizados extends Evento {
  nombre: 'DatosActualizados';
  intermediarioId: string;
  tipoActualizacion: string;
}

export interface DatosCarteraActualizados extends Evento {
  nombre: 'DatosCarteraActualizados';
  intermediarioId: string;
  instrumentoId: string;
}

// Motor_Clasificación
export interface BloqueAsignado extends Evento {
  nombre: 'BloqueAsignado';
  intermediarioId: string;
  bloque: string;
  bloqueAnterior?: string;
  fechaInicio: Date;
}

export interface AlertaCambioBloqueSuperior extends Evento {
  nombre: 'AlertaCambioBloqueSuperior';
  intermediarioId: string;
  bloqueActual: string;
  bloqueSuperior: string;
  mesesContinuos: number;
}

export interface NotificacionReduccionBloque extends Evento {
  nombre: 'NotificacionReduccionBloque';
  intermediarioId: string;
  bloqueActual: string;
  bloqueInferior: string;
  mesesContinuos: number;
}

// Motor_Patrimonial
export interface PatrimonioAjustadoCalculado extends Evento {
  nombre: 'PatrimonioAjustadoCalculado';
  intermediarioId: string;
  resultadoPatrimonioId: string;
  patrimonioAjustado: number;
  fechaCalculo: Date;
}

export interface PatrimonioLiquidoCalculado extends Evento {
  nombre: 'PatrimonioLiquidoCalculado';
  intermediarioId: string;
  resultadoPatrimonioId: string;
  patrimonioLiquido: number;
  fechaCalculo: Date;
}

export interface PatrimonioAjustadoNegativo extends Evento {
  nombre: 'PatrimonioAjustadoNegativo';
  intermediarioId: string;
  patrimonioAjustado: number;
  codigoError: 'CPM-PAT-001';
}

export interface PatrimonioLiquidoNoPositivo extends Evento {
  nombre: 'PatrimonioLiquidoNoPositivo';
  intermediarioId: string;
  patrimonioLiquido: number;
  codigoError: 'CPM-PAT-002';
}

// Motor_APR
export interface ComponenteRiesgoCalculado extends Evento {
  nombre: 'ComponenteRiesgoCalculado';
  intermediarioId: string;
  tipoRiesgo: 'operacional' | 'mercado' | 'credito' | 'criptoactivos';
  valor: number;
  fechaCalculo: Date;
}

export interface APRTotalCalculado extends Evento {
  nombre: 'APRTotalCalculado';
  intermediarioId: string;
  resultadoAPRId: string;
  aprTotal: number;
  fechaCalculo: Date;
}

// Motor_Ratios
export interface IncumplimientoDetectado extends Evento {
  nombre: 'IncumplimientoDetectado';
  intermediarioId: string;
  indice: 'patrimonioMinimo' | 'garantias' | 'liquidez' | 'endeudamiento';
  valorActual: number;
  umbral: number;
  codigoError: 'CPM-RAT-001';
}

// Tipo unión de todos los eventos
export type EventoCPM =
  | DatosContablesImportados
  | DatosContablesRechazados
  | ParametroRegulatorioActualizado
  | DatosActualizados
  | DatosCarteraActualizados
  | BloqueAsignado
  | AlertaCambioBloqueSuperior
  | NotificacionReduccionBloque
  | PatrimonioAjustadoCalculado
  | PatrimonioLiquidoCalculado
  | PatrimonioAjustadoNegativo
  | PatrimonioLiquidoNoPositivo
  | ComponenteRiesgoCalculado
  | APRTotalCalculado
  | IncumplimientoDetectado;

type Handler = (event: Evento) => void | Promise<void>;

export class EventDispatcher {
  private handlers: Map<string, Set<Handler>> = new Map();

  subscribe(eventName: string, handler: Handler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
  }

  unsubscribe(eventName: string, handler: Handler): void {
    this.handlers.get(eventName)?.delete(handler);
  }

  async publish(event: Evento): Promise<void> {
    const eventHandlers = this.handlers.get(event.nombre);
    if (!eventHandlers) return;
    const promises = Array.from(eventHandlers).map((h) => h(event));
    await Promise.all(promises);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const dispatcher = new EventDispatcher();
