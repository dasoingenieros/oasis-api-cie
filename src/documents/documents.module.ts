import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { CieExcelGeneratorService } from './cie-excel-generator.service';
import { SolicitudBtGeneratorService } from './solicitud-bt-generator.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, CieExcelGeneratorService, SolicitudBtGeneratorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
