-- CreateTable
CREATE TABLE "Intermediario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "bloqueActual" TEXT,
    "fechaUltimaClasificacion" TIMESTAMP(3),

    CONSTRAINT "Intermediario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametrosRegulatorios" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fechaVigenciaInicio" TIMESTAMP(3) NOT NULL,
    "fechaVigenciaFin" TIMESTAMP(3),
    "tabla6Ponderadores" JSONB NOT NULL,
    "limitePatrimonioMinimoUf" DECIMAL(65,30) NOT NULL,
    "porcentajeAprDefecto" DECIMAL(65,30) NOT NULL DEFAULT 0.03,
    "porcentajeAprMaximo" DECIMAL(65,30) NOT NULL DEFAULT 0.06,
    "limiteGarantiasUf" DECIMAL(65,30) NOT NULL,
    "limiteRazonEndeudamiento" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "canastasMonedas" JSONB NOT NULL,
    "tablaAntiguedadImpagos" JSONB NOT NULL,
    "descuentosSegurosGarantias" JSONB NOT NULL,
    "usuarioResponsable" TEXT NOT NULL,

    CONSTRAINT "ParametrosRegulatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatosContables" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "fechaImportacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" TEXT NOT NULL,
    "usuarioResponsable" TEXT NOT NULL,
    "cargaManual" BOOLEAN NOT NULL DEFAULT false,
    "balanceGeneral" JSONB NOT NULL,
    "estadoResultados" JSONB NOT NULL,
    "cuentasContables" JSONB NOT NULL,
    "versionParametrosId" TEXT,

    CONSTRAINT "DatosContables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentoCartera" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "tipoInstrumento" TEXT NOT NULL,
    "valorCustodia" DECIMAL(65,30),
    "volumenCompra" DECIMAL(65,30),
    "volumenVenta" DECIMAL(65,30),
    "montoNocional" DECIMAL(65,30),
    "plazoVencimiento" TIMESTAMP(3),
    "moneda" TEXT,
    "tipoTasa" TEXT,
    "subyacente" TEXT,
    "clasificacionCrediticia" TEXT,
    "ponderadorTabla6" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioResponsable" TEXT NOT NULL,

    CONSTRAINT "InstrumentoCartera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaRelacionada" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoRelacion" TEXT NOT NULL,
    "saldoPorCobrar" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaModificacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaRelacionada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClasificacionBloque" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "motivoCambio" TEXT,

    CONSTRAINT "ClasificacionBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoPatrimonio" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL,
    "patrimonioContable" DECIMAL(65,30) NOT NULL,
    "deduccionIntangibles" DECIMAL(65,30) NOT NULL,
    "deduccionPersonasRelacionadas" DECIMAL(65,30) NOT NULL,
    "deduccionGarantiasTerceros" DECIMAL(65,30) NOT NULL,
    "deduccionGastosAnticipados" DECIMAL(65,30) NOT NULL,
    "deduccionImpuestosDiferidos" DECIMAL(65,30) NOT NULL,
    "deduccionActivosImpagos" DECIMAL(65,30) NOT NULL,
    "patrimonioAjustado" DECIMAL(65,30) NOT NULL,
    "deduccionInversionesSociedades" DECIMAL(65,30) NOT NULL,
    "deduccion50PctPropiedades" DECIMAL(65,30) NOT NULL,
    "patrimonioLiquido" DECIMAL(65,30) NOT NULL,
    "versionParametrosId" TEXT,

    CONSTRAINT "ResultadoPatrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoAPR" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL,
    "riesgoOperacional" DECIMAL(65,30) NOT NULL,
    "riesgoMercado" DECIMAL(65,30) NOT NULL,
    "riesgoCredito" DECIMAL(65,30) NOT NULL,
    "riesgoCriptoactivos" DECIMAL(65,30) NOT NULL,
    "aprTotal" DECIMAL(65,30) NOT NULL,
    "detalleComponentes" JSONB,
    "versionParametrosId" TEXT,

    CONSTRAINT "ResultadoAPR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoRatios" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "fechaCalculo" TIMESTAMP(3) NOT NULL,
    "patrimonioMinimoRequerido" DECIMAL(65,30) NOT NULL,
    "patrimonioAjustado" DECIMAL(65,30) NOT NULL,
    "cumplePatrimonioMinimo" BOOLEAN,
    "excesoDeficitPatrimonio" DECIMAL(65,30) NOT NULL,
    "garantiasConstituidas" DECIMAL(65,30) NOT NULL,
    "cumpleGarantias" BOOLEAN,
    "activosRealizables7d" DECIMAL(65,30) NOT NULL,
    "pasivosExigibles7d" DECIMAL(65,30) NOT NULL,
    "cumpleLiquidez" BOOLEAN,
    "pasivoExigibleTotal" DECIMAL(65,30) NOT NULL,
    "razonEndeudamiento" DECIMAL(65,30),
    "cumpleEndeudamiento" BOOLEAN,
    "versionParametrosId" TEXT,

    CONSTRAINT "ResultadoRatios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "fechaAlerta" TIMESTAMP(3) NOT NULL,
    "tipoAlerta" TEXT NOT NULL,
    "indiceAfectado" TEXT,
    "valorEnAlerta" DECIMAL(65,30),
    "prioridad" TEXT NOT NULL,
    "canal" TEXT,
    "destinatarios" TEXT,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "intentosEnvio" INTEGER NOT NULL DEFAULT 0,
    "detalleError" TEXT,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscenarioStress" (
    "id" TEXT NOT NULL,
    "intermediarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "variablesFicticias" JSONB NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL,
    "usuarioCreacion" TEXT NOT NULL,

    CONSTRAINT "EscenarioStress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoStress" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "fechaEjecucion" TIMESTAMP(3) NOT NULL,
    "usuarioEjecucion" TEXT NOT NULL,
    "ratiosActuales" JSONB,
    "ratiosProyectados" JSONB,
    "impactoPorRatio" JSONB,

    CONSTRAINT "ResultadoStress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Intermediario_rut_key" ON "Intermediario"("rut");

-- AddForeignKey
ALTER TABLE "DatosContables" ADD CONSTRAINT "DatosContables_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatosContables" ADD CONSTRAINT "DatosContables_versionParametrosId_fkey" FOREIGN KEY ("versionParametrosId") REFERENCES "ParametrosRegulatorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentoCartera" ADD CONSTRAINT "InstrumentoCartera_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaRelacionada" ADD CONSTRAINT "PersonaRelacionada_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClasificacionBloque" ADD CONSTRAINT "ClasificacionBloque_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPatrimonio" ADD CONSTRAINT "ResultadoPatrimonio_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoPatrimonio" ADD CONSTRAINT "ResultadoPatrimonio_versionParametrosId_fkey" FOREIGN KEY ("versionParametrosId") REFERENCES "ParametrosRegulatorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoAPR" ADD CONSTRAINT "ResultadoAPR_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoAPR" ADD CONSTRAINT "ResultadoAPR_versionParametrosId_fkey" FOREIGN KEY ("versionParametrosId") REFERENCES "ParametrosRegulatorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoRatios" ADD CONSTRAINT "ResultadoRatios_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoRatios" ADD CONSTRAINT "ResultadoRatios_versionParametrosId_fkey" FOREIGN KEY ("versionParametrosId") REFERENCES "ParametrosRegulatorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscenarioStress" ADD CONSTRAINT "EscenarioStress_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Intermediario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoStress" ADD CONSTRAINT "ResultadoStress_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "EscenarioStress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
