// Payment provider configuration
export interface PaymentConfig {
  providers: {
    paynow: {
      integrationId: string;
      integrationKey: string;
      resultUrl: string;
      returnUrl: string;
      enabled: boolean;
    };
    stripe: {
      publicKey: string;
      secretKey: string;
      webhookSecret: string;
      enabled: boolean;
    };
  };
  primaryProvider: 'paynow' | 'stripe';
  fallbackProvider: 'paynow' | 'stripe';
  currency: string;
  testMode: boolean;
}

export const getPaymentConfig = (): PaymentConfig => {
  return {
    providers: {
      paynow: {
        integrationId: process.env.PAYNOW_INTEGRATION_ID || '',
        integrationKey: process.env.PAYNOW_INTEGRATION_KEY || '',
        resultUrl: process.env.PAYNOW_RESULT_URL || `${process.env.SITE_URL}/api/payments/paynow/webhook`,
        returnUrl: process.env.PAYNOW_RETURN_URL || `${process.env.SITE_URL}/dashboard/billing?status=success`,
        enabled: process.env.PAYNOW_ENABLED === 'true'
      },
      stripe: {
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        enabled: process.env.STRIPE_ENABLED === 'true'
      }
    },
    primaryProvider: (process.env.PRIMARY_PAYMENT_PROVIDER as 'paynow' | 'stripe') || 'paynow',
    fallbackProvider: (process.env.FALLBACK_PAYMENT_PROVIDER as 'paynow' | 'stripe') || 'stripe',
    currency: process.env.DEFAULT_CURRENCY || 'USD',
    testMode: process.env.NODE_ENV !== 'production'
  };
};

// Payment method types supported by each provider
export const PAYMENT_METHODS = {
  paynow: {
    web: 'web', // Credit/debit cards via Paynow website
    mobile: 'mobile', // Mobile money (EcoCash, OneMoney)
    ecocash: 'ecocash',
    onemoney: 'onemoney'
  },
  stripe: {
    card: 'card',
    bank_transfer: 'bank_transfer',
    wallet: 'wallet'
  }
} as const;

// Supported currencies by provider
export const SUPPORTED_CURRENCIES = {
  paynow: ['USD', 'ZWL'],
  stripe: ['USD', 'EUR', 'GBP', 'ZAR']
} as const;

// Payment status mapping
export const PAYMENT_STATUS = {
  // Universal statuses
  PENDING: 'pending',
  PROCESSING: 'processing', 
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  
  // Provider-specific mappings
  paynow: {
    'Created': 'pending',
    'Sent': 'processing',
    'Paid': 'succeeded',
    'Awaiting Delivery': 'succeeded',
    'Delivered': 'succeeded',
    'Cancelled': 'cancelled',
    'Disputed': 'failed'
  },
  stripe: {
    'incomplete': 'pending',
    'incomplete_expired': 'failed',
    'trialing': 'processing',
    'active': 'succeeded',
    'past_due': 'failed',
    'canceled': 'cancelled',
    'unpaid': 'failed'
  }
} as const;
