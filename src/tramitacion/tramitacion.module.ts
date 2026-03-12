import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TramitacionController } from './tramitacion.controller';
import { TramitacionService } from './tramitacion.service';
import { TramitacionMapperService } from './tramitacion-mapper.service';
import { TramitacionPlaywrightService } from './tramitacion-playwright.service';
import { TramitacionProcessor } from './tramitacion.processor';
import { PortalCryptoService } from './portal-crypto.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'tramitacion',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [TramitacionController],
  providers: [
    TramitacionService,
    TramitacionMapperService,
    TramitacionPlaywrightService,
    TramitacionProcessor,
    PortalCryptoService,
  ],
  exports: [TramitacionService],
})
export class TramitacionModule {}
