import { Controller, Get, Post, Body, Query, Res, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthExtensionsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /** GET /auth/verify-email?token=xxx — verifies email, redirects to login */
  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) {
      throw new BadRequestException('Token requerido');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    try {
      await this.usersService.verifyEmail(token);
      res.redirect(`${appUrl}/login?verified=true`);
    } catch {
      res.redirect(`${appUrl}/login?verified=error`);
    }
  }

  /** POST /auth/resend-verify — resends verification email */
  @Post('resend-verify')
  async resendVerify(@Body() body: { email?: string }): Promise<{ message: string }> {
    if (!body.email) {
      throw new BadRequestException('Email requerido');
    }
    await this.usersService.resendVerification(body.email);
    return { message: 'Si el email existe, hemos enviado un nuevo enlace de verificación' };
  }
}
