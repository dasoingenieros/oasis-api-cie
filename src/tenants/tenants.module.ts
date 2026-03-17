// src/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantDocumentsController } from './tenant-documents.controller';
import { TenantDocumentsService } from './tenant-documents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController, TenantDocumentsController],
  providers: [TenantsService, TenantDocumentsService],
  exports: [TenantsService],
})
export class TenantsModule {}
