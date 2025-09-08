import type { APIRoute } from 'astro';
import { getPaymentService } from '../../../../../core/lib/payments/service';

// Stripe webhook endpoint
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    const paymentService = getPaymentService();
    const db = locals.runtime?.env?.D1_DATABASE;

    // Prepare webhook data for processing
    const webhookData = {
      body,
      headers: {
        'stripe-signature': signature
      }
    };

    // Process webhook with Stripe provider
    const processedWebhook = await paymentService.handleWebhook('stripe', webhookData);

    // Update payment record in database
    if (db) {
      await db.prepare(`
        UPDATE payments 
        SET status = ?, updated_at = ?, provider_reference = ?
        WHERE reference = ? OR transaction_id = ?
      `).bind(
        processedWebhook.status,
        new Date().toISOString(),
        processedWebhook.transactionId || null,
        processedWebhook.reference,
        processedWebhook.transactionId
      ).run();

      // Log webhook for audit trail
      await db.prepare(`
        INSERT INTO webhook_logs (
          id, provider, event_type, reference, status, amount, currency, 
          raw_data, processed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        'stripe',
        processedWebhook.eventType,
        processedWebhook.reference,
        processedWebhook.status,
        processedWebhook.amount || 0,
        processedWebhook.currency || 'USD',
        JSON.stringify(processedWebhook.raw),
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      // If payment is successful, update subscription/organization status
      if (processedWebhook.status === 'succeeded') {
        await handleSuccessfulPayment(db, processedWebhook.reference);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    // Log the error but still return 200 to prevent webhook retries for most errors
    if (locals.runtime?.env?.D1_DATABASE) {
      try {
        await locals.runtime.env.D1_DATABASE.prepare(`
          INSERT INTO webhook_errors (
            id, provider, error_message, raw_data, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          'stripe',
          error instanceof Error ? error.message : 'Unknown error',
          await request.text(),
          new Date().toISOString()
        ).run();
      } catch (dbError) {
        console.error('Failed to log webhook error:', dbError);
      }
    }

    // Return 400 for signature verification errors to help with debugging
    if (error instanceof Error && error.message.includes('signature')) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 200, // Return 200 to prevent retries for most errors
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle successful payment - update subscription status, extend trials, etc.
async function handleSuccessfulPayment(db: any, reference: string) {
  try {
    // Get payment details
    const payment = await db.prepare(`
      SELECT p.*, o.id as org_id, o.plan_id, s.id as subscription_id
      FROM payments p
      JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN subscriptions s ON o.id = s.organization_id
      WHERE p.reference = ?
    `).bind(reference).first();

    if (!payment) return;

    // Update organization's subscription status
    if (payment.subscription_id) {
      await db.prepare(`
        UPDATE subscriptions 
        SET status = 'active', current_period_end = datetime('now', '+1 month'), updated_at = ?
        WHERE id = ?
      `).bind(
        new Date().toISOString(),
        payment.subscription_id
      ).run();
    }

    // Update organization billing status
    await db.prepare(`
      UPDATE organizations 
      SET billing_status = 'active', updated_at = ?
      WHERE id = ?
    `).bind(
      new Date().toISOString(),
      payment.org_id
    ).run();

    // Create audit log entry
    await db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, organization_id, action, resource_type, resource_id, 
        details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      payment.user_id,
      payment.organization_id,
      'payment_completed',
      'payment',
      payment.id,
      JSON.stringify({
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        provider: 'stripe'
      }),
      new Date().toISOString()
    ).run();

  } catch (error) {
    console.error('Failed to handle successful payment:', error);
  }
}
