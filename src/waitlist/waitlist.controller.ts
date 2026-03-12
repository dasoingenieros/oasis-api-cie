import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { IsString, IsEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateWaitlistDto {
  @IsEmail() email!: string;
  @IsString() installationType!: string;
}

@Controller('waitlist')
@UseGuards(JwtAuthGuard)
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreateWaitlistDto, @Req() req: any) {
    const user = req.user;
    return this.prisma.waitlistEntry.create({
      data: {
        tenantId: user.tenantId,
        email: dto.email,
        installationType: dto.installationType,
      },
    });
  }
}
