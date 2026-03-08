// src/calculations/calculations.module.ts
import { Module } from '@nestjs/common';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { InstallationsModule } from '../installations/installations.module';

@Module({
  imports: [InstallationsModule],
  controllers: [CalculationsController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
