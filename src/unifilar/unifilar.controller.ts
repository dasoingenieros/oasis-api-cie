import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { UnifilarService } from './unifilar.service';

@Controller('installations/:installationId/unifilar')
@UseGuards(JwtAuthGuard)
export class UnifilarController {
  constructor(private readonly unifilarService: UnifilarService) {}

  @Get()
  getLayout(
    @Param('installationId') installationId: string,
    @Request() req: any,
  ) {
    return this.unifilarService.getLayout(installationId, req.user.tenantId);
  }

  @Put()
  saveLayout(
    @Param('installationId') installationId: string,
    @Body() body: { layoutJson: any },
    @Request() req: any,
  ) {
    return this.unifilarService.saveLayout(installationId, req.user.tenantId, body.layoutJson);
  }
}
