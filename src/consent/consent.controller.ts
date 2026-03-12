import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/create-consent.dto';

@Controller('consent')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  async create(@Body() dto: CreateConsentDto, @Req() req: any) {
    const user = req.user;
    return this.consentService.logConsent({
      userId: user.id,
      tenantId: user.tenantId,
      consentType: dto.consentType,
      documentVersion: dto.documentVersion,
      accepted: dto.accepted,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      method: dto.method ?? 'checkbox',
      certificateId: dto.certificateId,
    });
  }

  @Post('bulk')
  async createBulk(@Body() body: { consents: CreateConsentDto[] }, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const ua = req.headers['user-agent'] || null;
    return this.consentService.logBulkConsents(
      body.consents.map((c) => ({
        userId: user.id,
        tenantId: user.tenantId,
        consentType: c.consentType,
        documentVersion: c.documentVersion,
        accepted: c.accepted,
        ipAddress: ip,
        userAgent: ua,
        method: c.method ?? 'checkbox',
        certificateId: c.certificateId,
      })),
    );
  }

  @Get()
  async list(@Req() req: any) {
    const user = req.user;
    return this.consentService.getUserConsents(user.id, user.tenantId);
  }
}
