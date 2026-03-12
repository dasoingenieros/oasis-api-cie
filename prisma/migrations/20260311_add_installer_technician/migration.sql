-- CreateTable
CREATE TABLE "Installer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nif" TEXT,
    "certNum" TEXT,
    "categoria" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Installer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nif" TEXT,
    "titulacion" TEXT,
    "numColegiado" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Installer_tenantId_idx" ON "Installer"("tenantId");

-- CreateIndex
CREATE INDEX "Technician_tenantId_idx" ON "Technician"("tenantId");

-- AddForeignKey
ALTER TABLE "Installer" ADD CONSTRAINT "Installer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing onboarding installer data
INSERT INTO "Installer" ("id", "tenantId", "nombre", "nif", "certNum", "categoria", "isDefault", "createdAt", "updatedAt")
SELECT
    CONCAT('cl', SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 23)),
    u."tenantId",
    u."instaladorNombre",
    u."instaladorNif",
    u."instaladorCertNum",
    t."empresaCategoria",
    true,
    NOW(),
    NOW()
FROM "User" u
JOIN "Tenant" t ON t."id" = u."tenantId"
WHERE u."instaladorNombre" IS NOT NULL
  AND u."instaladorNombre" != ''
  AND u."deletedAt" IS NULL;
