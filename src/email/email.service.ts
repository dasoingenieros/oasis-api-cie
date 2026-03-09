import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: false,
        auth: {
          user,
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('SMTP transporter configured');
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  private get fromAddress(): string {
    const name = this.configService.get<string>('SMTP_FROM_NAME') || 'CIE Platform';
    const email = this.configService.get<string>('SMTP_FROM') || 'noreply@oasisplatform.es';
    return `"${name}" <${email}>`;
  }

  private get appUrl(): string {
    return this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  async sendVerificationEmail(name: string, email: string, token: string): Promise<void> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;
    const subject = 'Verifica tu cuenta en CIE Platform';

    const html = this.buildEmailHtml(`
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111827;">Hola ${this.escapeHtml(name)},</h1>
      <p style="margin:0 0 12px;color:#4B5563;font-size:16px;line-height:1.6;">
        Gracias por registrarte en CIE Platform.
      </p>
      <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">
        Para activar tu cuenta, haz click en el siguiente enlace:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Verificar mi email
        </a>
      </div>
      <p style="margin:0 0 8px;color:#6B7280;font-size:14px;">
        Este enlace caduca en 24 horas.
      </p>
      <p style="margin:0;color:#6B7280;font-size:14px;">
        Si no has creado esta cuenta, ignora este email.
      </p>
    `);

    await this.send(email, subject, html);
  }

  async sendWelcomeEmail(name: string, email: string): Promise<void> {
    const dashboardUrl = `${this.appUrl}/`;
    const subject = '¡Bienvenido a CIE Platform!';

    const html = this.buildEmailHtml(`
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111827;">Hola ${this.escapeHtml(name)},</h1>
      <p style="margin:0 0 12px;color:#4B5563;font-size:16px;line-height:1.6;">
        Tu cuenta está verificada y lista para usar.
      </p>
      <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">
        Con tu plan Free puedes generar hasta 2 certificados de instalación eléctrica
        completos: MTD, CIE, Solicitud BT y Esquema Unifilar.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Crear mi primer certificado
        </a>
      </div>
      <p style="margin:0;color:#6B7280;font-size:14px;">
        ¿Necesitas más? Consulta nuestros <a href="${this.appUrl}/pricing" style="color:#3B82F6;text-decoration:underline;">planes desde 19€/mes</a>.
      </p>
    `);

    await this.send(email, subject, html);
  }

  private buildEmailHtml(bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:24px;font-weight:700;color:#111827;">⚡ CIE Platform</span>
    </div>
    <!-- Content card -->
    <div style="background-color:#ffffff;border-radius:12px;padding:32px;border:1px solid #E5E7EB;">
      ${bodyContent}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #E5E7EB;">
      <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;">DASO Ingenieros S.L.P.</p>
      <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;">CIE Platform — Certificados de Instalación Eléctrica</p>
      <p style="margin:0;color:#9CA3AF;font-size:11px;">
        Este email fue enviado a la dirección asociada a tu cuenta.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL-LOG] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
