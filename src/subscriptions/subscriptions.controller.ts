import {
  Controller, Get, Post, Body, UseGuards, Request, RawBodyRequest, Req, Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Plan actual del tenant */
  @Get('current')
  @UseGuards(JwtAuthGuard)
  getCurrentPlan(@Request() req: any) {
    return this.subscriptionsService.getCurrentPlan(req.user.tenantId);
  }

  /** Usage stats: certsGenerated, maxCerts, plan */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  getUsage(@Request() req: any) {
    return this.subscriptionsService.getUsage(req.user.tenantId);
  }

  /** Crear sesión de Stripe Checkout para upgrade */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(@Request() req: any, @Body() body: { priceId: string }) {
    return this.subscriptionsService.createCheckoutSession(
      req.user.tenantId,
      req.user.id,
      body.priceId,
    );
  }

  /** Crear sesión del portal de facturación Stripe */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  createPortal(@Request() req: any) {
    return this.subscriptionsService.createPortalSession(req.user.tenantId);
  }

  /** Webhook de Stripe (sin auth JWT, usa firma Stripe) */
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody;
    return this.subscriptionsService.handleWebhook(rawBody, signature);
  }
}
