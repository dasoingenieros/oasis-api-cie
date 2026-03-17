import {
  Controller, Get, Post, Delete, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Request, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { TenantDocumentsService } from './tenant-documents.service';

const pdfUploadInterceptor = (fieldName: string) =>
  FileInterceptor(fieldName, {
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
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new BadRequestException('Solo se permiten archivos PDF'), false);
      } else {
        cb(null, true);
      }
    },
  });

@Controller('tenant/documents')
@UseGuards(JwtAuthGuard)
export class TenantDocumentsController {
  constructor(private readonly tenantDocumentsService: TenantDocumentsService) {}

  // ── Certificado Empresa ──────────────────────────────────────

  @Post('certificado-empresa')
  @UseInterceptors(pdfUploadInterceptor('file'))
  async uploadCertificadoEmpresa(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó archivo PDF');
    return this.tenantDocumentsService.uploadDocument(req.user.tenantId, 'certificado-empresa', file);
  }

  @Delete('certificado-empresa')
  async deleteCertificadoEmpresa(@Request() req: any) {
    return this.tenantDocumentsService.deleteDocument(req.user.tenantId, 'certificado-empresa');
  }

  @Get('certificado-empresa')
  async downloadCertificadoEmpresa(@Request() req: any, @Res() res: Response) {
    const { filePath, filename } = await this.tenantDocumentsService.getDocumentPath(
      req.user.tenantId, 'certificado-empresa',
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  // ── Anexo Usuario ────────────────────────────────────────────

  @Post('anexo-usuario')
  @UseInterceptors(pdfUploadInterceptor('file'))
  async uploadAnexoUsuario(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó archivo PDF');
    return this.tenantDocumentsService.uploadDocument(req.user.tenantId, 'anexo-usuario', file);
  }

  @Delete('anexo-usuario')
  async deleteAnexoUsuario(@Request() req: any) {
    return this.tenantDocumentsService.deleteDocument(req.user.tenantId, 'anexo-usuario');
  }

  @Get('anexo-usuario')
  async downloadAnexoUsuario(@Request() req: any, @Res() res: Response) {
    const { filePath, filename } = await this.tenantDocumentsService.getDocumentPath(
      req.user.tenantId, 'anexo-usuario',
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
