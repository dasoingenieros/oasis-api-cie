import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { CieExcelGeneratorService } from './cie-excel-generator.service';
import { SolicitudBtGeneratorService } from './solicitud-bt-generator.service';
import { InstallationDocumentsController } from './installation-documents.controller';
import { InstallationDocumentsService } from './installation-documents.service';

@Module({
  controllers: [DocumentsController, InstallationDocumentsController],
  providers: [DocumentsService, CieExcelGeneratorService, SolicitudBtGeneratorService, InstallationDocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
