import { PartialType } from '@nestjs/mapped-types';
import { CreatePanelNodeDto } from './create-panel-node.dto';

export class UpdatePanelNodeDto extends PartialType(CreatePanelNodeDto) {}
