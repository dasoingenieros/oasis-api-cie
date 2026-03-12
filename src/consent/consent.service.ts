import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogConsentParams {
  userId: string;
  tenantId: string;
  consentType: string;
  documentVersion: string;
  accepted: boolean;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  certificateId?: string;
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async logConsent(params: LogConsentParams) {
    return this.prisma.consentLog.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        consentType: params.consentType,
        documentVersion: params.documentVersion,
        accepted: params.accepted,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        method: params.method ?? 'checkbox',
        certificateId: params.certificateId ?? null,
      },
    });
  }

  async logBulkConsents(consents: LogConsentParams[]) {
    return Promise.all(consents.map((c) => this.logConsent(c)));
  }

  async getUserConsents(userId: string, tenantId: string) {
    return this.prisma.consentLog.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasAcceptedVersion(userId: string, consentType: string, version: string): Promise<boolean> {
    const entry = await this.prisma.consentLog.findFirst({
      where: { userId, consentType, documentVersion: version, accepted: true },
    });
    return !!entry;
  }
}
