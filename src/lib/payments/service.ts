import { PaynowProvider } from './providers/paynow';
import { StripeProvider } from './providers/stripe';
import { 
  PaymentProvider, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentStatus, 
  MobilePaymentRequest,
  WebhookData
} from './types';
import { getPaymentConfig } from './config';

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private config: ReturnType<typeof getPaymentConfig>;

  constructor() {
    this.config = getPaymentConfig();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Paynow if enabled
    if (this.config.providers.paynow.enabled) {
      try {
        this.providers.set('paynow', new PaynowProvider());
      } catch (error) {
        console.error('Failed to initialize Paynow provider:', error);
      }
    }

    // Initialize Stripe if enabled
    if (this.config.providers.stripe.enabled) {
      try {
        this.providers.set('stripe', new StripeProvider());
      } catch (error) {
        console.error('Failed to initialize Stripe provider:', error);
      }
    }

    if (this.providers.size === 0) {
      throw new Error('No payment providers are configured and enabled');
    }
  }

  // Get the primary provider with fallback
  private getProvider(preferredProvider?: 'paynow' | 'stripe'): PaymentProvider {
    const providerName = preferredProvider || this.config.primaryProvider;
    
    // Try preferred/primary provider first
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName)!;
    }

    // Fallback to secondary provider
    const fallbackName = this.config.fallbackProvider;
    if (this.providers.has(fallbackName)) {
      console.warn(`Primary provider ${providerName} unavailable, using fallback ${fallbackName}`);
      return this.providers.get(fallbackName)!;
    }

    // Use any available provider
    const availableProvider = Array.from(this.providers.values())[0];
    if (availableProvider) {
      console.warn(`Neither primary nor fallback providers available, using ${availableProvider.name}`);
      return availableProvider;
    }

    throw new Error('No payment providers are available');
  }

  // Create a web-based payment (credit card, bank transfer, etc.)
  async createWebPayment(request: PaymentRequest, preferredProvider?: 'paynow' | 'stripe'): Promise<PaymentResponse> {
    const provider = this.getProvider(preferredProvider);
    
    try {
      const response = await provider.createWebPayment(request);
      
      // If primary provider fails, try fallback
      if (!response.success && preferredProvider === this.config.primaryProvider) {
        console.warn(`Primary provider ${preferredProvider} failed, trying fallback`);
        const fallbackProvider = this.getProvider(this.config.fallbackProvider);
        
        if (fallbackProvider.name !== provider.name) {
          return await fallbackProvider.createWebPayment(request);
        }
      }
      
      return response;
    } catch (error) {
      // If primary provider throws, try fallback
      if (preferredProvider === this.config.primaryProvider) {
        console.warn(`Primary provider ${preferredProvider} threw error, trying fallback:`, error);
        const fallbackProvider = this.getProvider(this.config.fallbackProvider);
        
        if (fallbackProvider.name !== provider.name) {
          return await fallbackProvider.createWebPayment(request);
        }
      }
      
      throw error;
    }
  }

  // Create a mobile payment (EcoCash, OneMoney) - Only available with Paynow
  async createMobilePayment(request: MobilePaymentRequest): Promise<PaymentResponse> {
    const paynowProvider = this.providers.get('paynow');
    
    if (!paynowProvider) {
      return {
        success: false,
        reference: request.reference,
        error: 'Mobile payments are only supported with Paynow provider',
        provider: 'paynow',
        amount: request.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
        currency: request.currency
      };
    }

    if (!paynowProvider.createMobilePayment) {
      return {
        success: false,
        reference: request.reference,
        error: 'Mobile payments not implemented for this provider',
        provider: 'paynow',
        amount: request.items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
        currency: request.currency
      };
    }

    return await paynowProvider.createMobilePayment(request);
  }

  // Check payment status
  async checkPaymentStatus(pollUrlOrTransactionId: string, provider?: 'paynow' | 'stripe'): Promise<PaymentStatus> {
    // If provider is specified, use it directly
    if (provider && this.providers.has(provider)) {
      const selectedProvider = this.providers.get(provider)!;
      return await selectedProvider.checkPaymentStatus(pollUrlOrTransactionId);
    }

    // Try to determine provider from the URL/ID format
    let detectedProvider: PaymentProvider | undefined;
    
    if (pollUrlOrTransactionId.includes('paynow.co.zw')) {
      detectedProvider = this.providers.get('paynow');
    } else if (pollUrlOrTransactionId.startsWith('pi_')) {
      detectedProvider = this.providers.get('stripe');
    }

    if (detectedProvider) {
      return await detectedProvider.checkPaymentStatus(pollUrlOrTransactionId);
    }

    // Try primary provider first
    try {
      const primaryProvider = this.getProvider();
      return await primaryProvider.checkPaymentStatus(pollUrlOrTransactionId);
    } catch (error) {
      // Try all available providers
      for (const [name, providerInstance] of this.providers) {
        try {
          return await providerInstance.checkPaymentStatus(pollUrlOrTransactionId);
        } catch (providerError) {
          console.warn(`Provider ${name} failed to check status:`, providerError);
        }
      }
      throw new Error('No provider could check payment status');
    }
  }

  // Handle webhooks from payment providers
  async handleWebhook(provider: 'paynow' | 'stripe', rawData: any): Promise<WebhookData> {
    const selectedProvider = this.providers.get(provider);
    
    if (!selectedProvider) {
      throw new Error(`Provider ${provider} not available`);
    }

    return await selectedProvider.handleWebhook(rawData);
  }

  // Refund a payment (if supported by provider)
  async refundPayment(transactionId: string, amount?: number, provider?: 'paynow' | 'stripe'): Promise<boolean> {
    let selectedProvider: PaymentProvider;

    if (provider) {
      selectedProvider = this.providers.get(provider)!;
    } else {
      // Auto-detect provider based on transaction ID format
      if (transactionId.startsWith('pi_') || transactionId.startsWith('sub_')) {
        selectedProvider = this.providers.get('stripe')!;
      } else {
        selectedProvider = this.providers.get('paynow')!;
      }
    }

    if (!selectedProvider) {
      throw new Error(`Provider not available for refund`);
    }

    if (!selectedProvider.refundPayment) {
      throw new Error(`Refunds not supported by ${selectedProvider.name} provider`);
    }

    return await selectedProvider.refundPayment(transactionId, amount);
  }

  // Get available payment methods based on currency and location
  getAvailablePaymentMethods(currency: string, region?: string): string[] {
    const methods: string[] = [];

    if (this.providers.has('paynow')) {
      methods.push('web', 'mobile', 'ecocash', 'onemoney');
    }

    if (this.providers.has('stripe')) {
      methods.push('card', 'bank_transfer', 'wallet');
    }

    return methods;
  }

  // Get provider status
  getProviderStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    status.paynow = this.providers.has('paynow');
    status.stripe = this.providers.has('stripe');
    status.primary = this.providers.has(this.config.primaryProvider);
    status.fallback = this.providers.has(this.config.fallbackProvider);

    return status;
  }

  // Generate a unique payment reference
  generatePaymentReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Calculate fees for a payment amount
  calculateFees(amount: number, provider: 'paynow' | 'stripe' = this.config.primaryProvider): number {
    // These are example fee structures - adjust based on actual provider fees
    const feeStructures = {
      paynow: {
        percentage: 0.035, // 3.5%
        fixed: 0.50, // $0.50 fixed fee
        minimum: 0.10
      },
      stripe: {
        percentage: 0.029, // 2.9%
        fixed: 0.30, // $0.30 fixed fee
        minimum: 0.05
      }
    };

    const structure = feeStructures[provider];
    const calculatedFee = (amount * structure.percentage) + structure.fixed;
    
    return Math.max(calculatedFee, structure.minimum);
  }

  // Get supported currencies
  getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    
    if (this.providers.has('paynow')) {
      currencies.add('USD');
      currencies.add('ZWL');
    }
    
    if (this.providers.has('stripe')) {
      currencies.add('USD');
      currencies.add('EUR');
      currencies.add('GBP');
      currencies.add('ZAR');
    }

    return Array.from(currencies);
  }
}

// Singleton instance
let paymentServiceInstance: PaymentService | null = null;

export const getPaymentService = (): PaymentService => {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
};
