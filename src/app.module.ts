// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthModule } from '@dasoingenieros/auth';
import { AllExceptionsFilter, TenantInterceptor, HealthModule } from '@dasoingenieros/api-utils';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { UsersService } from './users/users.service';
import { InstallationsModule } from './installations/installations.module';
import { CircuitsModule } from './circuits/circuits.module';
import { CalculationsModule } from './calculations/calculations.module';
import { DocumentsModule } from './documents/documents.module';
import { PanelsModule } from './panels/panels.module';
import { UnifilarModule } from './unifilar/unifilar.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import configuration from './config/configuration';
import type { AppConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      ignoreEnvFile: process.env['NODE_ENV'] === 'production',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    PrismaModule,
    UsersModule,
    // @dasoingenieros/auth — modo embedded (CIE standalone)
    AuthModule.register({
      mode: 'embedded',
      jwtSecret: process.env['JWT_SECRET'] ?? 'dev_secret_not_for_production',
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
      refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev_refresh_secret_not_for_production',
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
      userLookupService: UsersService,
    }),
    // @dasoingenieros/api-utils — health
    HealthModule.register({ prisma: PrismaService }),
    InstallationsModule,
    CircuitsModule,
    CalculationsModule,
    DocumentsModule,
    PanelsModule,
    UnifilarModule,
    TenantsModule,
    SubscriptionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useValue: new AllExceptionsFilter() },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
