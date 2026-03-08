// src/installations/installations.module.ts
import { Module } from '@nestjs/common';
import { InstallationsService } from './installations.service';
import { InstallationsController } from './installations.controller';

@Module({
  controllers: [InstallationsController],
  providers: [InstallationsService],
  exports: [InstallationsService],
})
export class InstallationsModule {}
