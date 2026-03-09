import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe disabled');
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(key);
    }
  }

  async createCheckoutSession(tenantId: string, userId: string, priceId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const customer = await this.stripe.customers.create({
        email: user?.email,
        name: tenant.name,
        metadata: { tenantId, userId },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?canceled=true`,
      metadata: { tenantId },
    });

    return { url: session.url };
  }

  async createPortalSession(tenantId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) {
      throw new BadRequestException('No tienes suscripción activa');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  async getCurrentPlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    return {
      tenantName: tenant.name,
      maxCertsMonth: tenant.maxCertsMonth,
      maxCertsTotal: tenant.maxCertsTotal,
      certCount: tenant.certCount,
      subscriptionStatus: tenant.subscriptionStatus,
      isFreePlan: tenant.maxCertsTotal > 0 && tenant.maxCertsTotal <= 2,
    };
  }

  async getUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    const isFreePlan = tenant.maxCertsTotal > 0 && tenant.maxCertsTotal <= 2;

    return {
      certsGenerated: tenant.certCount,
      maxCerts: tenant.maxCertsTotal,
      plan: isFreePlan ? 'free' : (tenant.subscriptionStatus === 'active' ? 'pro' : 'free'),
      subscriptionStatus: tenant.subscriptionStatus,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new BadRequestException('Webhook secret not configured');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionChange(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;

    const subscriptionId = session.subscription as string;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        maxCertsMonth: 100, // Default paid plan limit
        maxCertsTotal: -1,
        certCount: 0,
        certResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      },
    });

    this.logger.log(`Tenant ${tenantId} subscription activated`);
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!tenant) return;

    const status = subscription.status;

    if (status === 'canceled' || status === 'unpaid') {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStatus: status,
          stripeSubscriptionId: null,
          maxCertsMonth: -1,
          maxCertsTotal: 2, // Back to free tier
        },
      });
      this.logger.log(`Tenant ${tenant.id} downgraded to free (${status})`);
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionStatus: status },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!tenant) return;

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionStatus: 'past_due' },
    });
    this.logger.warn(`Payment failed for tenant ${tenant.id}`);
  }
}
