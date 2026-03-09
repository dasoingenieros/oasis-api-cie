-- Add email verification expiry and onboarding fields to User
ALTER TABLE "User" ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Change default maxCertsTotal for new tenants to 2 (free plan)
ALTER TABLE "Tenant" ALTER COLUMN "maxCertsTotal" SET DEFAULT 2;

-- Data migration: existing users are verified and onboarded
UPDATE "User" SET "emailVerified" = true, "onboardingCompleted" = true WHERE "emailVerified" = false;
UPDATE "User" SET "onboardingCompleted" = true WHERE "onboardingCompleted" = false;
