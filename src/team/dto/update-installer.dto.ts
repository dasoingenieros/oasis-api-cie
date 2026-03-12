import { PartialType } from '@nestjs/mapped-types';
import { CreateInstallerDto } from './create-installer.dto';

export class UpdateInstallerDto extends PartialType(CreateInstallerDto) {}
