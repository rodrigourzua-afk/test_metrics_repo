// Feature: cmf-prudential-metrics — Endpoints de cálculo para la interfaz web

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CalculadorPatrimonioAjustado, CalculadorPatrimonioLiquido } from '../../domain/patrimonial/calculadores';
import { CalculadorRiesgoOperacional } from '../../domain/apr/calculadores';
import { SimuladorStress } from '../../domain/reporteria/stressTesting';

const calcPA = new CalculadorPatrimonioAjustado();
const calcPL = new CalculadorPatrimonioLiquido();
const calcRO = new CalculadorRiesgoOperacional();
const simulador = new SimuladorStress();

export async function calculosRouter(fastify: FastifyInstance): Promise<void> {

  fastify.post('/api/v1/calculos/patrimonio', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { patrimonioAjustado, patrimonioLiquido } = request.body as any;
      const totalDeducciones =
        patrimonioAjustado.intangibles +
        patrimonioAjustado.personasRelacionadas +
        patrimonioAjustado.garantiasTerceros +
        patrimonioAjustado.gastosAnticipados +
        patrimonioAjustado.impuestosDiferidos +
        patrimonioAjustado.activosImpagos;
      const pa = patrimonioAjustado.patrimonioContable - totalDeducciones;
      const cincuentaPct = 0.5 * patrimonioLiquido.propiedadesPlantaEquipo;
      const pl = pa - patrimonioLiquido.inversionesSociedades - cincuentaPct;
      return reply.send({
        success: true,
        data: {
          patrimonioAjustado: {
            patrimonioContable: patrimonioAjustado.patrimonioContable,
            totalDeducciones,
            patrimonioAjustado: pa,
            negativo: pa < 0,
            fechaCalculo: new Date(),
          },
          patrimonioLiquido: {
            patrimonioAjustado: pa,
            ajustes: { inversionesSociedades: patrimonioLiquido.inversionesSociedades, cincuentaPctPropiedades: cincuentaPct },
            patrimonioLiquido: pl,
            noPositivo: pl <= 0,
            fechaCalculo: new Date(),
          }
        }
      });
    } catch (err) {
      return reply.status(400).send({ success: false, error: { mensaje: (err as Error).message } });
    }
  });

  fastify.post('/api/v1/calculos/apr', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const entrada = request.body as any;
      const riesgoOperacional = calcRO.calcular(entrada);
      const APR_FACTOR = 33.3;
      const aprTotal = APR_FACTOR * riesgoOperacional.riesgoOperacional;
      return reply.send({
        success: true,
        data: {
          intermediarioId: entrada.intermediarioId,
          aprTotal,
          riesgoOperacional,
          riesgoMercado: 0,
          riesgoCredito: 0,
          riesgoCriptoactivos: 0,
          fechaCalculo: new Date(),
        }
      });
    } catch (err) {
      return reply.status(400).send({ success: false, error: { mensaje: (err as Error).message } });
    }
  });

  fastify.post('/api/v1/calculos/stress', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { escenario, datosReales } = request.body as any;
      const resultado = simulador.ejecutar(escenario, datosReales);
      return reply.send({ success: true, data: resultado });
    } catch (err) {
      return reply.status(400).send({ success: false, error: { mensaje: (err as Error).message } });
    }
  });
}
