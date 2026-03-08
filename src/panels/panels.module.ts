// src/panels/panels.module.ts
import { Module } from '@nestjs/common';
import { PanelsController } from './panels.controller';
import { PanelsService } from './panels.service';
import { InstallationsModule } from '../installations/installations.module';

@Module({
  imports: [InstallationsModule],
  controllers: [PanelsController],
  providers: [PanelsService],
  exports: [PanelsService],
})
export class PanelsModule {}
