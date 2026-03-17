import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_ANEXO_USUARIO_PATH = path.join(
  __dirname, '..', '..', 'documents', 'templates', 'anexo-usuario-default.pdf',
);

type TenantDocType = 'certificado-empresa' | 'anexo-usuario';

const DOC_TYPE_FIELDS: Record<TenantDocType, { urlField: string; nameField: string; filename: string }> = {
  'certificado-empresa': {
    urlField: 'certificadoEmpresaUrl',
    nameField: 'certificadoEmpresaName',
    filename: 'certificado-empresa.pdf',
  },
  'anexo-usuario': {
    urlField: 'anexoUsuarioUrl',
    nameField: 'anexoUsuarioName',
    filename: 'anexo-usuario.pdf',
  },
};

@Injectable()
export class TenantDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadDocument(tenantId: string, docType: TenantDocType, file: Express.Multer.File) {
    const config = DOC_TYPE_FIELDS[docType];
    const dir = path.join('/app/data/tenant-docs', tenantId);
    fs.mkdirSync(dir, { recursive: true });

    const destPath = path.join(dir, config.filename);
    fs.copyFileSync(file.path, destPath);
    fs.unlinkSync(file.path);

    const update: Record<string, string> = {};
    update[config.urlField] = destPath;
    update[config.nameField] = file.originalname;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: update,
      select: {
        id: true,
        certificadoEmpresaUrl: true,
        certificadoEmpresaName: true,
        anexoUsuarioUrl: true,
        anexoUsuarioName: true,
      },
    });
  }

  async deleteDocument(tenantId: string, docType: TenantDocType) {
    const config = DOC_TYPE_FIELDS[docType];
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const filePath = (tenant as any)[config.urlField];
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const update: Record<string, null> = {};
    update[config.urlField] = null;
    update[config.nameField] = null;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: update,
      select: {
        id: true,
        certificadoEmpresaUrl: true,
        certificadoEmpresaName: true,
        anexoUsuarioUrl: true,
        anexoUsuarioName: true,
      },
    });
  }

  async getDocumentPath(tenantId: string, docType: TenantDocType): Promise<{ filePath: string; filename: string }> {
    const config = DOC_TYPE_FIELDS[docType];
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const filePath = (tenant as any)[config.urlField] as string | null;
    const originalName = (tenant as any)[config.nameField] as string | null;

    if (filePath && fs.existsSync(filePath)) {
      return { filePath, filename: originalName || config.filename };
    }

    // Fallback: serve default template for anexo-usuario
    if (docType === 'anexo-usuario' && fs.existsSync(DEFAULT_ANEXO_USUARIO_PATH)) {
      return { filePath: DEFAULT_ANEXO_USUARIO_PATH, filename: 'anexo-informacion-usuario.pdf' };
    }

    throw new NotFoundException('Documento no encontrado');
  }
}
