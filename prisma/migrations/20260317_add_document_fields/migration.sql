-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "anexoUsuarioName" TEXT,
ADD COLUMN "anexoUsuarioUrl" TEXT,
ADD COLUMN "certificadoEmpresaName" TEXT,
ADD COLUMN "certificadoEmpresaUrl" TEXT;

-- CreateTable
CREATE TABLE "InstallationDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstallationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallationDocument_installationId_idx" ON "InstallationDocument"("installationId");
CREATE INDEX "InstallationDocument_tenantId_idx" ON "InstallationDocument"("tenantId");
CREATE INDEX "ConsentLog_tenantId_idx" ON "ConsentLog"("tenantId");

-- AddForeignKey
ALTER TABLE "InstallationDocument" ADD CONSTRAINT "InstallationDocument_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
