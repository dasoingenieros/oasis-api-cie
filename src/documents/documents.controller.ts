import {
  Controller, Get, Post, Delete, Param, Body, Query, Res, UseGuards, Request,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@Controller('installations/:installationId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Param('installationId') installationId: string, @Request() req: any) {
    return this.documentsService.findAll(installationId, req.user.tenantId);
  }

  @Post('generate')
  generate(
    @Param('installationId') installationId: string,
    @Body() dto: GenerateDocumentDto,
    @Request() req: any,
  ) {
    return this.documentsService.generate(installationId, req.user.tenantId, dto.type, req.user.id);
  }

  /** CIE — ?format=xls|pdf */
  @Post('generate-cie')
  async generateCie(
    @Param('installationId') installationId: string,
    @Query('format') format: string = 'xls',
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.documentsService.generateCie(installationId, req.user.tenantId, req.user.id);
    if (format === 'pdf') {
      const pdfFilename = result.xlsDoc.filename.replace('.xls', '.pdf');
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfFilename}"`, 'Content-Length': String(result.pdfBuffer.length) });
      return res.send(result.pdfBuffer);
    }
    res.set({ 'Content-Type': 'application/vnd.ms-excel', 'Content-Disposition': `attachment; filename="${result.xlsDoc!.filename}"`, 'Content-Length': String(result.xlsBuffer.length) });
    return res.send(result.xlsBuffer);
  }

  /** Solicitud BT — ?format=docx|pdf */
  @Post('generate-solicitud')
  async generateSolicitud(
    @Param('installationId') installationId: string,
    @Query('format') format: string = 'docx',
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.documentsService.generateSolicitud(installationId, req.user.tenantId, req.user.id);
    if (format === 'pdf' && result.pdfBuffer.length > 0) {
      const pdfFilename = result.docxDoc.filename.replace('.docx', '.pdf');
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${pdfFilename}"`, 'Content-Length': String(result.pdfBuffer.length) });
      return res.send(result.pdfBuffer);
    }
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${result.docxDoc!.filename}"`, 'Content-Length': String(result.docxBuffer.length) });
    return res.send(result.docxBuffer);
  }

  @Get(':documentId/download')
  async download(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.download(installationId, documentId, req.user.tenantId);
    res.set({ 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }

  @Delete(':documentId')
  remove(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.documentsService.remove(installationId, documentId, req.user.tenantId);
  }
}
