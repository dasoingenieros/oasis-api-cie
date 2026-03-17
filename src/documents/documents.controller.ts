import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Res, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { CreateFeedbackReportDto } from './dto/create-feedback-report.dto';

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

  /** CIE — returns document metadata (JSON) */
  @Post('generate-cie')
  async generateCie(
    @Param('installationId') installationId: string,
    @Request() req: any,
  ) {
    return this.documentsService.generateCie(installationId, req.user.tenantId, req.user.id);
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

  /** Approve document for signing */
  @Post(':documentId/approve')
  approve(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.documentsService.approveDocument(installationId, documentId, req.user.tenantId);
  }

  /** Update review status (NEEDS_REVIEW with section note) */
  @Patch(':documentId/review-status')
  updateReviewStatus(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateReviewStatusDto,
    @Request() req: any,
  ) {
    return this.documentsService.updateReviewStatus(
      installationId, documentId, req.user.tenantId, dto.reviewStatus, dto.reviewNote,
    );
  }

  /** Submit feedback report (multipart with optional screenshot) */
  @Post(':documentId/report')
  @UseInterceptors(FileInterceptor('screenshot', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join('uploads', 'tmp');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, _file, cb) => {
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}_feedback`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  }))
  async report(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: CreateFeedbackReportDto,
    @UploadedFile() screenshot: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.documentsService.createFeedbackReport(
      installationId, documentId, req.user.tenantId,
      dto.description, dto.documentType, screenshot,
    );
  }

  /** Preview document inline (Content-Disposition: inline) */
  @Get(':documentId/preview')
  async preview(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.download(installationId, documentId, req.user.tenantId);
    res.set({ 'Content-Type': mimeType, 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': buffer.length });
    res.send(buffer);
  }

  /** Upload signed PDF */
  @Post(':documentId/upload-signed')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join('uploads', 'tmp');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, _file, cb) => {
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new BadRequestException('Solo se permiten archivos PDF'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadSigned(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('signerName') signerName: string,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó archivo PDF');
    return this.documentsService.uploadSigned(
      installationId, documentId, req.user.tenantId, file, signerName,
    );
  }

  /** Download signed PDF */
  @Get(':documentId/download-signed')
  async downloadSigned(
    @Param('installationId') installationId: string,
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { filePath, filename } = await this.documentsService.downloadSigned(
      installationId, documentId, req.user.tenantId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    fs.createReadStream(filePath).pipe(res);
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
