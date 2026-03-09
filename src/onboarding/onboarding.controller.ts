import { Controller, Put, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { OnboardingService } from './onboarding.service';
import { SaveCompanyDto } from './dto/save-company.dto';
import { SaveInstallerDto } from './dto/save-installer.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /** PUT /onboarding/company — saves company data (step 1) */
  @Put('company')
  saveCompany(@Request() req: any, @Body() dto: SaveCompanyDto) {
    return this.onboardingService.saveCompany(req.user.tenantId, dto);
  }

  /** PUT /onboarding/installer — saves installer data (step 2) */
  @Put('installer')
  saveInstaller(@Request() req: any, @Body() dto: SaveInstallerDto) {
    return this.onboardingService.saveInstaller(req.user.id, dto);
  }

  /** POST /onboarding/complete — marks onboarding as completed */
  @Post('complete')
  async complete(@Request() req: any) {
    await this.onboardingService.complete(req.user.id);
    return { message: 'Onboarding completado' };
  }
}
