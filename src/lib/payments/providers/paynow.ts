import { Paynow } from 'paynow';
import { 
  PaymentProvider, 
  PaymentRequest, 
  PaymentResponse, 
  PaymentStatus, 
  MobilePaymentRequest,
  WebhookData,
  PaymentItem
} from '../types';
import { getPaymentConfig, SUPPORTED_CURRENCIES, PAYMENT_STATUS } from '../config';

export class PaynowProvider extends PaymentProvider {
  readonly name = 'paynow' as const;
  private paynow: any;
  private config: ReturnType<typeof getPaymentConfig>['providers']['paynow'];

  constructor() {
    super();
    const paymentConfig = getPaymentConfig();
    this.config = paymentConfig.providers.paynow;
    
    if (!this.config.integrationId || !this.config.integrationKey) {
      throw new Error('Paynow integration credentials not configured');
    }

    this.paynow = new Paynow(this.config.integrationId, this.config.integrationKey);
    this.paynow.resultUrl = this.config.resultUrl;
    this.paynow.returnUrl = this.config.returnUrl;
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
        throw new Error(`Currency ${request.currency} not supported by Paynow`);
      }

      // Create payment object
      const payment = this.paynow.createPayment(request.reference, request.email);
      
      // Add items to payment
      for (const item of request.items) {
        const totalAmount = item.amount * (item.quantity || 1);
        payment.add(item.name, totalAmount);
      }

      // Set description if provided
      if (request.description) {
        payment.info = request.description;
      }

      // Send payment request
      const response = await this.paynow.send(payment);

      if (response.success) {
        return {
          success: true,
          transactionId: response.reference || request.reference,
          reference: request.reference,
          redirectUrl: response.redirectUrl,
          pollUrl: response.pollUrl,
          provider: 'paynow',
          amount: this.calculateTotal(request.items),
          currency: request.currency
        };
      } else {
        return {
          success: false,
          reference: request.reference,
          error: response.error || 'Payment initialization failed',
          provider: 'paynow',
          amount: this.calculateTotal(request.items),
          currency: request.currency
        };
      }
    } catch (error) {
      return {
        success: false,
        reference: request.reference,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'paynow',
        amount: this.calculateTotal(request.items),
        currency: request.currency
      };
    }
  }

  async createMobilePayment(request: MobilePaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate currency
      if (!this.validateCurrency(request.currency)) {
        throw new Error(`Currency ${request.currency} not supported by Paynow`);
      }

      // Validate mobile method
      if (!['ecocash', 'onemoney'].includes(request.mobileMethod)) {
        throw new Error(`Mobile method ${request.mobileMethod} not supported`);
      }

      // Create payment object
      const payment = this.paynow.createPayment(request.reference, request.email);
      
      // Add items to payment
      for (const item of request.items) {
        const totalAmount = item.amount * (item.quantity || 1);
        payment.add(item.name, totalAmount);
      }

      // Send mobile payment request
      const response = await this.paynow.sendMobile(
        payment, 
        request.phoneNumber, 
        request.mobileMethod
      );

      if (response.success) {
        return {
          success: true,
          transactionId: response.reference || request.reference,
          reference: request.reference,
          instructions: response.instructions,
          pollUrl: response.pollUrl,
          provider: 'paynow',
          amount: this.calculateTotal(request.items),
          currency: request.currency
        };
      } else {
        return {
          success: false,
          reference: request.reference,
          error: response.error || 'Mobile payment initialization failed',
          provider: 'paynow',
          amount: this.calculateTotal(request.items),
          currency: request.currency
        };
      }
    } catch (error) {
      return {
        success: false,
        reference: request.reference,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        provider: 'paynow',
        amount: this.calculateTotal(request.items),
        currency: request.currency
      };
    }
  }

  async checkPaymentStatus(pollUrl: string): Promise<PaymentStatus> {
    try {
      const status = await this.paynow.pollTransaction(pollUrl);
      
      // Map Paynow status to our standard status
      const mappedStatus = this.mapPaynowStatus(status.status);
      
      return {
        paid: status.paid(),
        status: mappedStatus,
        reference: status.reference,
        transactionId: status.paynowReference,
        amount: parseFloat(status.amount) || 0,
        currency: 'USD', // Paynow typically uses USD
        paidAmount: status.paid() ? parseFloat(status.amount) || 0 : undefined,
        provider: 'paynow',
        providerReference: status.paynowReference,
        updatedAt: new Date().toISOString(),
        metadata: {
          pollUrl,
          hash: status.hash
        }
      };
    } catch (error) {
      throw new Error(`Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleWebhook(rawData: any): Promise<WebhookData> {
    try {
      // Paynow webhook data structure
      const {
        reference,
        paynowreference,
        amount,
        status,
        pollurl,
        hash
      } = rawData;

      // Verify webhook authenticity (simplified - implement proper hash verification)
      if (!reference || !status) {
        throw new Error('Invalid webhook data');
      }

      const mappedStatus = this.mapPaynowStatus(status);

      return {
        provider: 'paynow',
        eventType: 'payment.status_changed',
        reference,
        status: mappedStatus,
        amount: parseFloat(amount) || 0,
        currency: 'USD',
        transactionId: paynowreference,
        raw: rawData
      };
    } catch (error) {
      throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected validateCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.paynow.includes(currency as any);
  }

  private mapPaynowStatus(paynowStatus: string): string {
    const statusMap = PAYMENT_STATUS.paynow as Record<string, string>;
    return statusMap[paynowStatus] || PAYMENT_STATUS.PENDING;
  }

  // Additional Paynow-specific methods
  async getTransactionDetails(reference: string): Promise<any> {
    try {
      // This would require additional API calls to Paynow
      // For now, we'll use the polling mechanism
      return null;
    } catch (error) {
      throw new Error(`Failed to get transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
