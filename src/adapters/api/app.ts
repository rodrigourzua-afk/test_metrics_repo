// Feature: cmf-prudential-metrics — Aplicación Fastify principal
// Requerimientos: 1.1, 2.1, 3.1, 5.1, 5.2

import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { integracionRouter } from './integracion';
import { calculosRouter } from './calculos';

export const app: FastifyInstance = Fastify({ logger: false });

// ─── Archivos estáticos (interfaz web) ───────────────────────────────────────
app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/',
});

// ─── CORS básico ─────────────────────────────────────────────────────────────
app.addHook('onRequest', async (_req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
});

// ─── Routers ─────────────────────────────────────────────────────────────────
app.register(integracionRouter);
app.register(calculosRouter);

// ─── Root endpoint para healthcheck ───────────────────────────────────────────
app.get('/', async () => {
  return { status: 'ok' };
});


// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async () => {
  return { status: 'ok', service: 'cmf-prudential-metrics', timestamp: new Date() };
});

// ─── Middleware de manejo de errores ──────────────────────────────────────────
app.setErrorHandler((error, _request, reply) => {
  const mensaje = error.message ?? 'Error interno del servidor';
  const match = mensaje.match(/CPM-[A-Z]+-\d+/);
  const codigo = match ? match[0] : 'CPM-SYS-000';

  reply.status(error.statusCode ?? 500).send({
    success: false,
    error: { codigo, mensaje },
  });
});
