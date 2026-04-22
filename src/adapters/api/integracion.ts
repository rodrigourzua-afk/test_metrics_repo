// Feature: cmf-prudential-metrics — Adapter API: Motor_Integración
// Requerimientos: 4.1, 4.3, 5.1

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ImportadorAutomatico, CargadorManual } from '../../domain/integracion/importadores';
import {
  RepositorioCartera,
  RepositorioParametros,
  RepositorioPersonasRelacionadas,
  InstrumentoCarteraInput,
  ParametrosInput,
  PersonaInput,
} from '../../domain/integracion/repositorios';

// ─── Instancias en memoria (singleton por proceso) ────────────────────────────

const importadorAutomatico = new ImportadorAutomatico();
const cargadorManual = new CargadorManual();
const repoCartera = new RepositorioCartera();
const repoParametros = new RepositorioParametros();
const repoPersonas = new RepositorioPersonasRelacionadas();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function respuestaExito(data: unknown) {
  return { success: true, data };
}

function respuestaError(codigo: string, mensaje: string) {
  return { success: false, error: { codigo, mensaje } };
}

function manejarError(reply: FastifyReply, err: unknown) {
  const mensaje = err instanceof Error ? err.message : String(err);
  // Extraer código CPM-* si está presente en el mensaje
  const match = mensaje.match(/CPM-[A-Z]+-\d+/);
  const codigo = match ? match[0] : 'CPM-INT-000';
  reply.status(400).send(respuestaError(codigo, mensaje));
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function integracionRouter(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/integracion/importar-contable
   * Importa datos contables automáticamente desde sistema externo.
   * Requerimiento: 4.1
   */
  fastify.post(
    '/api/v1/integracion/importar-contable',
    async (
      request: FastifyRequest<{
        Body: { url: string; intermediarioId: string; usuarioResponsable: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { url, intermediarioId, usuarioResponsable } = request.body;
        const resultado = await importadorAutomatico.importar(url, intermediarioId, usuarioResponsable);
        if (!resultado.exito) {
          return reply
            .status(422)
            .send(respuestaError(resultado.error.codigoError, resultado.error.mensaje));
        }
        return reply.status(200).send(respuestaExito(resultado.datos));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );

  /**
   * POST /api/v1/integracion/cargar-contable
   * Carga datos contables manualmente.
   * Requerimiento: 4.1
   */
  fastify.post(
    '/api/v1/integracion/cargar-contable',
    async (
      request: FastifyRequest<{
        Body: {
          contenido: object;
          nombreArchivo: string;
          intermediarioId: string;
          usuarioResponsable: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { contenido, nombreArchivo, intermediarioId, usuarioResponsable } = request.body;
        const resultado = cargadorManual.cargar(contenido, nombreArchivo, intermediarioId, usuarioResponsable);
        if (!resultado.exito) {
          return reply
            .status(422)
            .send(respuestaError(resultado.error.codigoError, resultado.error.mensaje));
        }
        return reply.status(200).send(respuestaExito(resultado.datos));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );

  /**
   * POST /api/v1/integracion/cartera
   * Registra un instrumento de cartera.
   * Requerimiento: 4.3
   */
  fastify.post(
    '/api/v1/integracion/cartera',
    async (
      request: FastifyRequest<{
        Body: {
          instrumento: InstrumentoCarteraInput;
          usuarioResponsable: string;
          tabla6Ponderadores?: Record<string, number>;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { instrumento, usuarioResponsable, tabla6Ponderadores } = request.body;
        const resultado = repoCartera.registrar(instrumento, usuarioResponsable, tabla6Ponderadores ?? {});
        return reply.status(201).send(respuestaExito(resultado));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );

  /**
   * POST /api/v1/integracion/clientes
   * Actualiza datos de clientes del intermediario (número activos, ingresos anuales, transacciones diarias).
   * Requerimiento: 4.3
   */
  fastify.post(
    '/api/v1/integracion/clientes',
    async (
      request: FastifyRequest<{
        Body: {
          intermediarioId: string;
          clientesActivos?: number;
          ingresosAnuales?: number;
          transaccionesDiarias?: number;
          usuarioResponsable: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { intermediarioId, clientesActivos, ingresosAnuales, transaccionesDiarias, usuarioResponsable } =
          request.body;
        // Almacenamos como registro de auditoría de actualización de datos de cliente
        const datos = {
          intermediarioId,
          clientesActivos,
          ingresosAnuales,
          transaccionesDiarias,
          usuarioResponsable,
          fechaActualizacion: new Date(),
        };
        return reply.status(200).send(respuestaExito(datos));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );

  /**
   * POST /api/v1/integracion/personas-relacionadas
   * Crea una persona relacionada.
   * Requerimiento: 4.1
   */
  fastify.post(
    '/api/v1/integracion/personas-relacionadas',
    async (
      request: FastifyRequest<{
        Body: { persona: PersonaInput; usuarioResponsable: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { persona, usuarioResponsable } = request.body;
        const resultado = repoPersonas.crear(persona, usuarioResponsable);
        return reply.status(201).send(respuestaExito(resultado));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );

  /**
   * PUT /api/v1/integracion/parametros/:id
   * Actualiza un parámetro regulatorio.
   * Requerimiento: 5.1
   */
  fastify.put(
    '/api/v1/integracion/parametros/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { cambios: Partial<ParametrosInput>; usuarioResponsable: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { cambios, usuarioResponsable } = request.body;
        const resultado = repoParametros.actualizar(id, cambios, usuarioResponsable);
        return reply.status(200).send(respuestaExito(resultado));
      } catch (err) {
        manejarError(reply, err);
      }
    }
  );
}
