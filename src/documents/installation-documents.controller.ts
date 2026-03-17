import {
  Controller, Get, Post, Delete, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Request, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { InstallationDocumentsService } from './installation-documents.service';

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

@Controller('installations/:installationId/documents')
@UseGuards(JwtAuthGuard)
export class InstallationDocumentsController {
  constructor(private readonly installationDocumentsService: InstallationDocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join('uploads', 'tmp');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, _file, cb) => {
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}_upload`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        cb(new BadRequestException('Solo se permiten archivos PDF, JPG o PNG'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async upload(
    @Param('installationId') installationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó archivo');
    return this.installationDocumentsService.upload(
      installationId, req.user.tenantId, file, description,
    );
  }

  @Get('uploaded')
  async list(
    @Param('installationId') installationId: string,
    @Request() req: any,
  ) {
    return this.installationDocumentsService.list(installationId, req.user.tenantId);
  }

  @Get('uploaded/:docId/download')
  async download(
    @Param('installationId') installationId: string,
    @Param('docId') docId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { filePath, filename, mimeType } = await this.installationDocumentsService.download(
      installationId, docId, req.user.tenantId,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }

  @Delete('uploaded/:docId')
  async remove(
    @Param('installationId') installationId: string,
    @Param('docId') docId: string,
    @Request() req: any,
  ) {
    return this.installationDocumentsService.remove(
      installationId, docId, req.user.tenantId,
    );
  }
}
