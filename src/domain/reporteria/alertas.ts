// Feature: cmf-prudential-metrics — Motor_Reportería: Alertas y notificaciones

import { v4 as uuidv4 } from 'uuid';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AlertaInput {
  intermediarioId: string;
  tipoAlerta: string;
  indiceAfectado?: string;
  valorEnAlerta?: number;
  prioridad: 'alta' | 'media' | 'baja';
  canal: string;
  destinatarios: string[];
}

export interface AlertaRegistro extends AlertaInput {
  id: string;
  fechaAlerta: Date;
  enviada: boolean;
  intentosEnvio: number;
  detalleError?: string;
}

export interface IncumplimientoInput {
  intermediarioId: string;
  indice: string;
  valorActual: number;
  umbral: number;
}

export interface INotificador {
  enviar(destinatarios: string[], mensaje: string, prioridad: string): Promise<boolean>;
  tipo: string;
}

// ─── RegistroAlertas ─────────────────────────────────────────────────────────

export class RegistroAlertas {
  private alertas: AlertaRegistro[] = [];

  registrar(alerta: AlertaInput): AlertaRegistro {
    const registro: AlertaRegistro = {
      ...alerta,
      id: uuidv4(),
      fechaAlerta: new Date(),
      enviada: false,
      intentosEnvio: 0,
    };
    this.alertas.push(registro);
    return registro;
  }

  obtenerPorIntermediario(intermediarioId: string): AlertaRegistro[] {
    return this.alertas.filter((a) => a.intermediarioId === intermediarioId);
  }

  obtenerTodas(): AlertaRegistro[] {
    return [...this.alertas];
  }

  /** Actualiza el estado de envío de una alerta existente */
  actualizarEnvio(id: string, enviada: boolean, intentos: number, detalleError?: string): void {
    const alerta = this.alertas.find((a) => a.id === id);
    if (alerta) {
      alerta.enviada = enviada;
      alerta.intentosEnvio = intentos;
      if (detalleError !== undefined) alerta.detalleError = detalleError;
    }
  }
}

// ─── MotorAlertas ─────────────────────────────────────────────────────────────

export class MotorAlertas {
  private umbrales: Map<string, number> = new Map();

  constructor(
    private readonly registro: RegistroAlertas,
    private readonly notificadores: INotificador[]
  ) {}

  configurarUmbral(indice: string, umbral: number): void {
    this.umbrales.set(indice, umbral);
  }

  async procesarIncumplimiento(evento: IncumplimientoInput): Promise<void> {
    const alertaInput: AlertaInput = {
      intermediarioId: evento.intermediarioId,
      tipoAlerta: 'incumplimiento',
      indiceAfectado: evento.indice,
      valorEnAlerta: evento.valorActual,
      prioridad: 'alta',
      canal: this.notificadores.map((n) => n.tipo).join(',') || 'email',
      destinatarios: [],
    };

    const alertaRegistro = this.registro.registrar(alertaInput);
    await this._enviarNotificaciones(alertaRegistro);
  }

  async procesarPatrimonioNegativo(intermediarioId: string, valor: number): Promise<void> {
    const alertaInput: AlertaInput = {
      intermediarioId,
      tipoAlerta: 'patrimonioNegativo',
      indiceAfectado: 'patrimonioAjustado',
      valorEnAlerta: valor,
      prioridad: 'alta',
      canal: this.notificadores.map((n) => n.tipo).join(',') || 'email',
      destinatarios: [],
    };

    const alertaRegistro = this.registro.registrar(alertaInput);
    await this._enviarNotificaciones(alertaRegistro);
  }

  private async _enviarNotificaciones(alerta: AlertaRegistro): Promise<void> {
    const mensaje = this._construirMensaje(alerta);
    let enviada = false;
    let intentos = 0;
    let detalleError: string | undefined;

    for (const notificador of this.notificadores) {
      try {
        const ok = await notificador.enviar(alerta.destinatarios, mensaje, alerta.prioridad);
        if (ok) enviada = true;
      } catch (err) {
        detalleError = err instanceof Error ? err.message : String(err);
      }
      intentos++;
    }

    this.registro.actualizarEnvio(alerta.id, enviada, intentos, detalleError);
  }

  private _construirMensaje(alerta: AlertaRegistro): string {
    return (
      `[${alerta.prioridad.toUpperCase()}] Alerta ${alerta.tipoAlerta} ` +
      `para intermediario ${alerta.intermediarioId}` +
      (alerta.indiceAfectado ? ` — índice: ${alerta.indiceAfectado}` : '') +
      (alerta.valorEnAlerta !== undefined ? ` — valor: ${alerta.valorEnAlerta}` : '')
    );
  }
}
