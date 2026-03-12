-- Add contact fields to Technician
ALTER TABLE "Technician" ADD COLUMN "colegioOficial" TEXT;
ALTER TABLE "Technician" ADD COLUMN "telefono" TEXT;
ALTER TABLE "Technician" ADD COLUMN "email" TEXT;
ALTER TABLE "Technician" ADD COLUMN "direccion" TEXT;
ALTER TABLE "Technician" ADD COLUMN "localidad" TEXT;
ALTER TABLE "Technician" ADD COLUMN "provincia" TEXT;
ALTER TABLE "Technician" ADD COLUMN "cp" TEXT;

-- Add author FKs to Installation
ALTER TABLE "Installation" ADD COLUMN "installerId" TEXT;
ALTER TABLE "Installation" ADD COLUMN "technicianId" TEXT;

-- Foreign keys
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Installation" ADD CONSTRAINT "Installation_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Installation_installerId_idx" ON "Installation"("installerId");
CREATE INDEX "Installation_technicianId_idx" ON "Installation"("technicianId");
