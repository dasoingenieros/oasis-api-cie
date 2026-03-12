-- Add FK from ConsentLog.tenantId to Tenant.id (was missing)
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- Add index on tenantId for performance
CREATE INDEX IF NOT EXISTS "ConsentLog_tenantId_idx" ON "ConsentLog"("tenantId");
