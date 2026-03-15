-- AlterTable
ALTER TABLE "Document" ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedFileUrl" VARCHAR(500),
ADD COLUMN "signerName" VARCHAR(200);
