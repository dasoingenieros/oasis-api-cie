import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InstallationDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    installationId: string,
    tenantId: string,
    file: Express.Multer.File,
    description?: string,
  ) {
    // Verify installation belongs to tenant
    const installation = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
    });
    if (!installation) throw new NotFoundException('Instalación no encontrada');

    const dir = path.join('/app/data/installation-docs', installationId);
    fs.mkdirSync(dir, { recursive: true });

    // Avoid filename collisions
    const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = path.join(dir, safeName);
    fs.copyFileSync(file.path, destPath);
    fs.unlinkSync(file.path);

    return this.prisma.installationDocument.create({
      data: {
        tenantId,
        installationId,
        fileName: file.originalname,
        fileUrl: destPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: description || null,
      },
    });
  }

  async list(installationId: string, tenantId: string) {
    return this.prisma.installationDocument.findMany({
      where: { installationId, tenantId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async download(installationId: string, docId: string, tenantId: string) {
    const doc = await this.prisma.installationDocument.findFirst({
      where: { id: docId, installationId, tenantId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (!fs.existsSync(doc.fileUrl)) throw new NotFoundException('Archivo no encontrado en disco');

    return { filePath: doc.fileUrl, filename: doc.fileName, mimeType: doc.mimeType };
  }

  async remove(installationId: string, docId: string, tenantId: string) {
    const doc = await this.prisma.installationDocument.findFirst({
      where: { id: docId, installationId, tenantId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    if (fs.existsSync(doc.fileUrl)) {
      fs.unlinkSync(doc.fileUrl);
    }

    await this.prisma.installationDocument.delete({ where: { id: docId } });
    return { deleted: true };
  }
}
