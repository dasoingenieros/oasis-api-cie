import { Module } from '@nestjs/common';
import { PanelNodesController } from './panel-nodes.controller';
import { PanelNodesService } from './panel-nodes.service';

@Module({
  controllers: [PanelNodesController],
  providers: [PanelNodesService],
  exports: [PanelNodesService],
})
export class PanelNodesModule {}
