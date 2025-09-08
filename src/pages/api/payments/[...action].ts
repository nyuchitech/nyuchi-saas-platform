import type { APIRoute } from 'astro';

export const prerender = false;
import { getPaymentService } from '../../../../core/lib/payments/service';
import { requireAuth } from '../../../../core/lib/auth';
import { D1Client } from '../../../../../core/database/clients/d1';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    
    const user = authResult;
    const requestBody = await request.json();
    const { action, ...data } = requestBody;

    const paymentService = getPaymentService();
    const db = locals.runtime?.env?.D1_DATABASE; // Use D1 binding directly

    switch (action) {
      case 'create-web-payment': {
        const {
          items,
          currency = 'USD',
          description,
          organizationId,
          provider
        } = data;

        // Generate unique payment reference
        const reference = paymentService.generatePaymentReference(`ORG-${organizationId}`);

        // Create payment request
        const paymentRequest = {
          reference,
          email: user.email,
          items,
          currency,
          description,
          organizationId,
          customerId: user.id,
          metadata: {
            userId: user.id,
            organizationId,
            timestamp: new Date().toISOString()
          }
        };

        // Store payment record in database
        await db.prepare(`
          INSERT INTO payments (
            id, reference, user_id, organization_id, provider, amount, currency, 
            status, items, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          reference,
          user.id,
          organizationId,
          provider || 'paynow',
          calculateTotal(items),
          currency,
          'pending',
          JSON.stringify(items),
          description || null,
          new Date().toISOString(),
          new Date().toISOString()
        ).run();

        // Create payment with preferred provider
        const paymentResponse = await paymentService.createWebPayment(paymentRequest, provider);

        // Update payment record with provider response
        await db.prepare(`
          UPDATE payments 
          SET transaction_id = ?, poll_url = ?, status = ?, provider = ?
          WHERE reference = ?
        `).bind(
          paymentResponse.transactionId || null,
          paymentResponse.pollUrl || null,
          paymentResponse.success ? 'processing' : 'failed',
          paymentResponse.provider,
          reference
        ).run();

        return new Response(JSON.stringify({
          success: true,
          data: paymentResponse
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'create-mobile-payment': {
        const {
          items,
          currency = 'USD',
          description,
          organizationId,
          phoneNumber,
          mobileMethod
        } = data;

        // Validate mobile payment requirements
        if (!phoneNumber || !mobileMethod) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Phone number and mobile method are required for mobile payments'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Generate unique payment reference
        const reference = paymentService.generatePaymentReference(`MOB-${organizationId}`);

        // Create mobile payment request
        const mobilePaymentRequest = {
          reference,
          email: user.email,
          items,
          currency,
          description,
          organizationId,
          customerId: user.id,
          phoneNumber,
          mobileMethod,
          metadata: {
            userId: user.id,
            organizationId,
            timestamp: new Date().toISOString()
          }
        };

        // Store payment record in database
        await db.prepare(`
          INSERT INTO payments (
            id, reference, user_id, organization_id, provider, amount, currency, 
            status, items, description, phone_number, mobile_method, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          reference,
          user.id,
          organizationId,
          'paynow',
          calculateTotal(items),
          currency,
          'pending',
          JSON.stringify(items),
          description || null,
          phoneNumber,
          mobileMethod,
          new Date().toISOString(),
          new Date().toISOString()
        ).run();

        // Create mobile payment
        const paymentResponse = await paymentService.createMobilePayment(mobilePaymentRequest);

        // Update payment record with provider response
        await db.prepare(`
          UPDATE payments 
          SET transaction_id = ?, poll_url = ?, status = ?, instructions = ?
          WHERE reference = ?
        `).bind(
          paymentResponse.transactionId || null,
          paymentResponse.pollUrl || null,
          paymentResponse.success ? 'processing' : 'failed',
          paymentResponse.instructions || null,
          reference
        ).run();

        return new Response(JSON.stringify({
          success: true,
          data: paymentResponse
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'check-status': {
        const { reference, pollUrl, transactionId } = data;

        // Get payment record from database
        const paymentRecord = await db.prepare(`
          SELECT * FROM payments WHERE reference = ? OR transaction_id = ?
        `).bind(reference || transactionId, transactionId || reference).first();

        if (!paymentRecord) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Payment not found'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Check status with payment provider
        const statusResponse = await paymentService.checkPaymentStatus(
          pollUrl || transactionId || paymentRecord.transaction_id,
          paymentRecord.provider as any
        );

        // Update payment record with latest status
        await db.prepare(`
          UPDATE payments 
          SET status = ?, paid_amount = ?, updated_at = ?
          WHERE reference = ?
        `).bind(
          statusResponse.status,
          statusResponse.paidAmount || null,
          new Date().toISOString(),
          paymentRecord.reference
        ).run();

        return new Response(JSON.stringify({
          success: true,
          data: statusResponse
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'get-payment-methods': {
        const { currency, region } = data;
        
        const methods = paymentService.getAvailablePaymentMethods(currency, region);
        const supportedCurrencies = paymentService.getSupportedCurrencies();
        const providerStatus = paymentService.getProviderStatus();

        return new Response(JSON.stringify({
          success: true,
          data: {
            paymentMethods: methods,
            supportedCurrencies,
            providerStatus,
            fees: {
              paynow: paymentService.calculateFees(100, 'paynow'),
              stripe: paymentService.calculateFees(100, 'stripe')
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'refund': {
        const { transactionId, amount, reason } = data;

        // Verify user has permission to refund (admin or organization owner)
        const paymentRecord = await db.prepare(`
          SELECT p.*, o.owner_id 
          FROM payments p
          JOIN organizations o ON p.organization_id = o.id
          WHERE p.transaction_id = ?
        `).bind(transactionId).first();

        if (!paymentRecord) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Payment not found'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (paymentRecord.owner_id !== user.id && user.role !== 'super_admin') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized to refund this payment'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Attempt refund
        const refundSuccess = await paymentService.refundPayment(
          transactionId, 
          amount, 
          paymentRecord.provider as any
        );

        if (refundSuccess) {
          // Record refund in database
          await db.prepare(`
            INSERT INTO payment_refunds (
              id, payment_id, transaction_id, amount, reason, status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            paymentRecord.id,
            transactionId,
            amount || paymentRecord.amount,
            reason || null,
            'completed',
            user.id,
            new Date().toISOString()
          ).run();

          // Update payment status
          await db.prepare(`
            UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?
          `).bind(new Date().toISOString(), paymentRecord.id).run();
        }

        return new Response(JSON.stringify({
          success: refundSuccess,
          data: {
            refunded: refundSuccess,
            amount: amount || paymentRecord.amount
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Payment API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to calculate total from items
function calculateTotal(items: Array<{ amount: number; quantity?: number }>): number {
  return items.reduce((total, item) => {
    return total + (item.amount * (item.quantity || 1));
  }, 0);
}
