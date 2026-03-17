import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

export const PLAN_LIMITS: Record<string, number> = {
  FREE: 1,       // 1 certificado total
  PUNTUAL: 0,    // Se gestiona por créditos
  PRO: -1,       // Ilimitado
  ENTERPRISE: -1, // Ilimitado
};

export interface UsageResponse {
  plan: string;
  certsGenerated: number;
  maxCerts: number;
  isLimited: boolean;
  remaining: number;
  availableCredits: number;
}

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

  // ─── User-level plan methods ──────────────────────────────

  async getUsage(userId: string): Promise<UsageResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const plan = (user as any).plan ?? 'FREE';
    const certsGenerated = (user as any).certsGenerated ?? 0;
    const maxCerts = (user as any).maxCerts ?? 2;
    const isLimited = maxCerts !== -1;
    const remaining = isLimited ? Math.max(0, maxCerts - certsGenerated) : -1;
    const availableCredits = await this.getAvailableCredits(userId);

    return { plan, certsGenerated, maxCerts, isLimited, remaining, availableCredits };
  }

  async canGenerateDocument(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

    // Pro/Enterprise: siempre pueden
    if ((user as any).maxCerts === -1) {
      return { allowed: true };
    }

    // Free/Puntual: comprobar si tiene créditos sin usar
    const availableCredits = await (this.prisma as any).certificateCredit.count({
      where: { userId, used: false },
    });

    if (availableCredits > 0) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Límite de certificados alcanzado. Actualiza tu plan.' };
  }

  async consumeCredit(userId: string, installationId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Pro/Enterprise: solo incrementar contador, no consume crédito
    if (user && (user as any).maxCerts === -1) {
      await (this.prisma.user as any).update({
        where: { id: userId },
        data: { certsGenerated: { increment: 1 } },
      });
      return;
    }

    // Buscar crédito disponible (FIFO: el más antiguo primero)
    const credit = await (this.prisma as any).certificateCredit.findFirst({
      where: { userId, used: false },
      orderBy: { createdAt: 'asc' },
    });

    if (credit) {
      await (this.prisma as any).certificateCredit.update({
        where: { id: credit.id },
        data: { used: true, usedAt: new Date(), installationId },
      });
    }

    // Siempre incrementar certsGenerated (historial)
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { certsGenerated: { increment: 1 } },
    });
  }

  async updatePlan(userId: string, plan: string): Promise<void> {
    const maxCerts = PLAN_LIMITS[plan] ?? 2;
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { plan, maxCerts },
    });
  }

  // ─── Stripe (existing, unchanged) ────────────────────────

  async createCheckoutSession(tenantId: string, userId: string, priceId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // 1. Obtener o crear Stripe Customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user?.email,
        metadata: { tenantId, userId },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // 2. Determinar modo por priceId
    const puntualPriceId = this.configService.get('STRIPE_PRICE_PUNTUAL');
    const isPuntual = priceId === puntualPriceId;

    // 3. Determinar plan desde priceId
    const proPrices = [
      this.configService.get('STRIPE_PRICE_PRO_MONTHLY'),
      this.configService.get('STRIPE_PRICE_PRO_MONTHLY_STD'),
      this.configService.get('STRIPE_PRICE_PRO_YEARLY_STD'),
    ];
    const enterprisePrices = [
      this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
      this.configService.get('STRIPE_PRICE_ENTERPRISE_MONTHLY_STD'),
      this.configService.get('STRIPE_PRICE_ENTERPRISE_YEARLY_STD'),
    ];

    let plan = 'FREE';
    if (proPrices.includes(priceId)) plan = 'PRO';
    else if (enterprisePrices.includes(priceId)) plan = 'ENTERPRISE';
    else if (isPuntual) plan = 'PUNTUAL';

    const successUrl = this.configService.get('STRIPE_SUCCESS_URL') || 'https://cie.oasisplatform.es/dashboard?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = this.configService.get('STRIPE_CANCEL_URL') || 'https://cie.oasisplatform.es/pricing';

    if (isPuntual) {
      // Pago único
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        payment_intent_data: {
          metadata: { userId, tenantId, plan: 'PUNTUAL', credits: '1' },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId, tenantId, plan: 'PUNTUAL' },
      });
      return { url: session.url };
    } else {
      // Suscripción
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { userId, tenantId, plan, phase: 'launch', grandfathered: 'true' },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId, tenantId, plan },
      });
      return { url: session.url };
    }
  }

  async createPortalSession(tenantId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) {
      throw new BadRequestException('No hay suscripción activa');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: 'https://cie.oasisplatform.es/dashboard',
    });

    return { url: session.url };
  }

  async getAvailableCredits(userId: string): Promise<number> {
    return (this.prisma as any).certificateCredit.count({
      where: { userId, used: false },
    });
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
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
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

  // ─── Webhook handlers ──────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan; // PRO, ENTERPRISE, or PUNTUAL

    if (!tenantId || !userId) {
      this.logger.warn('checkout.session.completed missing metadata (tenantId/userId)');
      return;
    }

    if (session.mode === 'subscription') {
      // ── Subscription checkout (PRO / ENTERPRISE) ──
      const subscriptionId = session.subscription as string;
      const resolvedPlan = plan === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO';

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: 'active',
        },
      });

      await (this.prisma.user as any).update({
        where: { id: userId },
        data: { plan: resolvedPlan, maxCerts: -1 },
      });

      this.logger.log(`Tenant ${tenantId} / User ${userId} → ${resolvedPlan} (subscription)`);

    } else if (session.mode === 'payment') {
      // ── One-time payment (Puntual) ──
      await (this.prisma as any).certificateCredit.create({
        data: {
          tenantId,
          userId,
          source: 'PUNTUAL',
          stripePaymentId: session.payment_intent as string,
        },
      });

      // Ensure stripeCustomerId is saved on tenant
      if (session.customer) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { stripeCustomerId: session.customer as string },
        });
      }

      this.logger.log(`CertificateCredit created for User ${userId} (puntual payment)`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const { tenant, adminUser } = await this.findTenantAndAdmin(
      subscription.customer as string,
    );
    if (!tenant) return;

    const status = subscription.status;

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionStatus: status },
    });

    if (adminUser) {
      if (status === 'active') {
        // Ensure user has unlimited certs while subscription is active
        await (this.prisma.user as any).update({
          where: { id: adminUser.id },
          data: { maxCerts: -1 },
        });
      } else if (status === 'past_due') {
        this.logger.warn(
          `Subscription past_due for Tenant ${tenant.id} — grace period, not blocking yet`,
        );
      }
    }

    this.logger.log(`Tenant ${tenant.id} subscription status → ${status}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { tenant, adminUser } = await this.findTenantAndAdmin(
      subscription.customer as string,
    );
    if (!tenant) return;

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      },
    });

    if (adminUser) {
      await (this.prisma.user as any).update({
        where: { id: adminUser.id },
        data: { plan: 'FREE', maxCerts: 1 },
      });
    }

    this.logger.log(`Tenant ${tenant.id} subscription canceled → User downgraded to FREE`);
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
    this.logger.warn(`Payment failed for tenant ${tenant.id} — marked as past_due`);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async findTenantAndAdmin(stripeCustomerId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { stripeCustomerId },
    });
    if (!tenant) return { tenant: null, adminUser: null };

    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'ADMIN' },
    });

    return { tenant, adminUser };
  }
}
