import Stripe from 'stripe';
import { 
  PaymentProvider, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentStatus, 
  WebhookData,
  PaymentItem
} from '../types';
import { getPaymentConfig, SUPPORTED_CURRENCIES, PAYMENT_STATUS } from '../config';

export class StripeProvider extends PaymentProvider {
  readonly name = 'stripe' as const;
  private stripe: Stripe;
  private config: ReturnType<typeof getPaymentConfig>['providers']['stripe'];

  constructor() {
    super();
    const paymentConfig = getPaymentConfig();
    this.config = paymentConfig.providers.stripe;
    
    if (!this.config.secretKey) {
      throw new Error('Stripe secret key not configured');
    }

    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: '2025-07-30.basil' as any
    });
  }

  // Helper method to calculate total amount
  protected calculateTotal(items: PaymentItem[]): number {
    return items.reduce((total, item) => {
      return total + (item.amount * (item.quantity || 1));
    }, 0);
  }

  async createWebPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate currency
      if (!this.validateCurrency(request.currency)) {
        throw new Error(`Currency ${request.currency} not supported by Stripe`);
      }

      const totalAmount = this.calculateTotal(request.items);
      
      // Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe expects amount in cents
        currency: request.currency.toLowerCase(),
        metadata: {
          reference: request.reference,
          organizationId: request.organizationId || '',
          customerId: request.customerId || ''
        },
        description: request.description || `Payment for ${request.items.map(i => i.name).join(', ')}`,
        receipt_email: request.email,
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Create checkout session for hosted payment
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: request.items.map(item => ({
          price_data: {
            currency: request.currency.toLowerCase(),
            product_data: {
              name: item.name,
              description: item.description
            },
            unit_amount: Math.round(item.amount * 100)
          },
          quantity: item.quantity || 1
        })),
        mode: 'payment',
        success_url: `${process.env.SITE_URL}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_URL}/dashboard/billing?status=cancelled`,
        metadata: {
          reference: request.reference,
          organizationId: request.organizationId || '',
          customerId: request.customerId || ''
        },
        payment_intent_data: {
          metadata: {
            reference: request.reference
          }
        }
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        reference: request.reference,
        redirectUrl: session.url || undefined,
        provider: 'stripe',
        amount: totalAmount,
        currency: request.currency
      };
    } catch (error) {
      return {
        success: false,
        reference: request.reference,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'stripe',
        amount: this.calculateTotal(request.items),
        currency: request.currency
      };
    }
  }

  async checkPaymentStatus(paymentIntentId: string): Promise<PaymentStatus> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Map Stripe status to our standard status
      const mappedStatus = this.mapStripeStatus(paymentIntent.status);
      
      return {
        paid: paymentIntent.status === 'succeeded',
        status: mappedStatus,
        reference: paymentIntent.metadata.reference || paymentIntentId,
        transactionId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        paidAmount: paymentIntent.status === 'succeeded' ? paymentIntent.amount / 100 : undefined,
        provider: 'stripe',
        providerReference: paymentIntent.id,
        updatedAt: new Date(paymentIntent.created * 1000).toISOString(),
        metadata: {
          stripeStatus: paymentIntent.status,
          paymentMethod: paymentIntent.payment_method
        }
      };
    } catch (error) {
      throw new Error(`Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleWebhook(rawData: any): Promise<WebhookData> {
    try {
      let event: Stripe.Event;

      // Verify webhook signature
      if (this.config.webhookSecret) {
        const signature = rawData.headers['stripe-signature'];
        event = this.stripe.webhooks.constructEvent(
          rawData.body,
          signature,
          this.config.webhookSecret
        );
      } else {
        event = rawData.body;
      }

      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const mappedStatus = this.mapStripeStatus(paymentIntent.status);

      return {
        provider: 'stripe',
        eventType: event.type,
        reference: paymentIntent.metadata?.reference || paymentIntent.id,
        status: mappedStatus,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        transactionId: paymentIntent.id,
        raw: event
      };
    } catch (error) {
      throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<boolean> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined // Convert to cents if specified
      });

      return refund.status === 'succeeded';
    } catch (error) {
      console.error('Stripe refund failed:', error);
      return false;
    }
  }

  protected validateCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.stripe.includes(currency as any);
  }

  private mapStripeStatus(stripeStatus: string): string {
    const statusMap = PAYMENT_STATUS.stripe as Record<string, string>;
    return statusMap[stripeStatus] || PAYMENT_STATUS.PENDING;
  }

  // Stripe-specific methods
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata
      });
      return customer.id;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<any> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId
        }],
        metadata,
        expand: ['latest_invoice.payment_intent']
      });
      return subscription;
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
