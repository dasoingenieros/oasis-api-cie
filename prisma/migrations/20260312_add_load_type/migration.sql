-- AlterTable: Replace isLighting (Boolean) with loadType (String)
ALTER TABLE "Circuit" ADD COLUMN "loadType" VARCHAR(30) NOT NULL DEFAULT 'FUERZA';

-- Migrate existing data: isLighting=true → ALUMBRADO
UPDATE "Circuit" SET "loadType" = 'ALUMBRADO' WHERE "isLighting" = true;

-- Drop old column
ALTER TABLE "Circuit" DROP COLUMN "isLighting";
