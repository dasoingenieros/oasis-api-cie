import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCompanyDto } from './dto/save-company.dto';
import { SaveInstallerDto } from './dto/save-installer.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async saveCompany(tenantId: string, dto: SaveCompanyDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async saveInstaller(userId: string, dto: SaveInstallerDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async complete(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
  }
}
