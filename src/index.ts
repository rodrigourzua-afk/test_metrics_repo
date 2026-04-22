// Feature: cmf-prudential-metrics — Punto de entrada del servidor

import { orquestador } from './domain/orquestador';
import { app } from './adapters/api/app';

async function bootstrap(): Promise<void> {
  console.log('1. Iniciando bootstrap...');
  
  orquestador.inicializar();
  console.log('2. Orquestador inicializado');

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  console.log(`3. Escuchando en ${host}:${port}`);
  await app.listen({ port, host });
  console.log('4. Servidor iniciado');
}

bootstrap().catch((err) => {
  console.error('ERROR EN BOOTSTRAP:', err);
  process.exit(1);
});
