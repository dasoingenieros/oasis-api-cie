// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody: true, // Needed for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });
  const corsOrigin = configService.get('cors.origin', { infer: true });

  // ─── Seguridad ────────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  // ─── CORS restrictivo (zero-trust) ───────────────────────
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // ─── Compresión ───────────────────────────────────────────
  app.use(compression());

  // ─── Versionado de API ────────────────────────────────────
  // Rutas quedan: /api/v1/health, /api/v1/installations, etc.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Validación global con class-validator ────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Graceful shutdown ────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`🚀 CIE API running on http://localhost:${port}/api/v1`);
  logger.log(`🏥 Health check: http://localhost:${port}/api/v1/health`);
  logger.log(`📡 Environment: ${nodeEnv}`);
}

void bootstrap();
