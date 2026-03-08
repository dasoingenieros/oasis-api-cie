// src/circuits/circuits.module.ts
import { Module } from '@nestjs/common';
import { CircuitsService } from './circuits.service';
import { CircuitsController } from './circuits.controller';
import { InstallationsModule } from '../installations/installations.module';

@Module({
  imports: [InstallationsModule],
  controllers: [CircuitsController],
  providers: [CircuitsService],
  exports: [CircuitsService],
})
export class CircuitsModule {}
