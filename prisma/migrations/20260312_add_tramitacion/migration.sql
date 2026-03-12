-- CreateEnum
CREATE TYPE "TramitacionStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'NEEDS_INPUT', 'SAVED', 'DOCUMENTS_UPLOADED', 'SENT', 'REGISTERED', 'ERROR');

-- CreateTable
CREATE TABLE "TramitacionConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portalUsername" TEXT,
    "portalPassword" TEXT,
    "portalEiciId" TEXT,
    "portalEiciName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TramitacionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TramitacionExpediente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "portalExpediente" TEXT,
    "eiciId" TEXT,
    "eiciNombre" TEXT,
    "status" "TramitacionStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStep" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "portalData" JSONB,
    "needsInputData" JSONB,
    "screenshots" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TramitacionExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TramitacionConfig_tenantId_key" ON "TramitacionConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TramitacionExpediente_tenantId_idx" ON "TramitacionExpediente"("tenantId");

-- CreateIndex
CREATE INDEX "TramitacionExpediente_installationId_idx" ON "TramitacionExpediente"("installationId");

-- CreateIndex
CREATE INDEX "TramitacionExpediente_status_idx" ON "TramitacionExpediente"("status");

-- AddForeignKey
ALTER TABLE "TramitacionExpediente" ADD CONSTRAINT "TramitacionExpediente_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
