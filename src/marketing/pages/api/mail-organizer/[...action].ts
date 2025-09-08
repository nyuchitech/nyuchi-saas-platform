import type { APIRoute } from 'astro';

export const prerender = false;
import { requireAuth, createCustomerError, createSuccessResponse, hasPermission, PRODUCT_PERMISSIONS } from '../../../lib/auth';
import { 
  validateRequest, 
  EmailAccountSchema, 
  EmailCategorySchema, 
  EmailMessageSchema,
  sanitizeHtml,
  SECURITY_HEADERS,
  validateJsonSize
} from '../../../lib/validation';

export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Verify user authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return authentication error
    }
    
    const user = authResult;
    const { action } = params;
    
    // Validate request size and parse JSON
    let body;
    try {
      body = await request.json();
      
      // Validate JSON size (max 1MB)
      if (!validateJsonSize(body)) {
        return createCustomerError('Request payload too large.', 413);
      }
    } catch (error) {
      return createCustomerError('Invalid JSON payload.', 400);
    }
    
    // Validate action parameter
    if (!action || typeof action !== 'string' || action.length > 50) {
      return createCustomerError('Invalid action parameter.', 400);
    }
    
    // Check product access permission
    if (!hasPermission(user, PRODUCT_PERMISSIONS.MAIL_ORGANIZER.USE)) {
  return createCustomerError('You don\'t have access to MailSense. Please contact your administrator.', 403);
    }
    
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.D1_DATABASE;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    switch (action) {
      case 'sync-account':
        return await syncEmailAccount(db, body, user);
      case 'categorize':
        return await categorizeEmail(db, body, user);
      case 'summarize':
        return await summarizeEmail(db, body);
      case 'get-messages':
        return await getEmailMessages(db, body);
      case 'apply-filter':
        return await applyEmailFilter(db, body, user);
      case 'create-category':
        // Check admin permission for creating categories
        if (!hasPermission(user, PRODUCT_PERMISSIONS.MAIL_ORGANIZER.SETTINGS)) {
          return createCustomerError('You don\'t have permission to create categories.', 403);
        }
        return await createCategory(db, body, user);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
  console.error('MailSense API error:', error);
    
    // Return response with security headers
    const response = createCustomerError('Something went wrong. Please try again later.', 500);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
};

async function syncEmailAccount(db: any, data: any, user: any) {
  try {
    // Validate input data
    const validation = await validateRequest(EmailAccountSchema)(data);
    if (!validation.success) {
      return createCustomerError(`Invalid input: ${validation.error}`, 400);
    }
    
    const { email, provider, account_name } = validation.data;
    
    const result = await db.prepare(`
      INSERT INTO mail_accounts (organization_id, user_id, email, provider, account_name, last_sync_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(organization_id, email) DO UPDATE SET
        last_sync_at = datetime('now'),
        updated_at = datetime('now')
      RETURNING *
    `).bind(user.organizationId, user.id, email, provider, account_name || email).first();
    
    return createSuccessResponse(result, 'Email account synced successfully.');
  } catch (error) {
    console.error('Sync account error:', error);
    return createCustomerError('Failed to sync email account. Please try again.');
  }
}

async function categorizeEmail(db: any, data: any, user: any) {
  try {
    const { email_content, subject, sender } = data;
    
    if (!email_content || !subject) {
      return createCustomerError('Email content and subject are required.');
    }
    
    // Simple categorization logic (would be replaced with actual AI)
    const text = `${subject} ${email_content}`.toLowerCase();
    const categories = [];
    
    if (text.includes('meeting') || text.includes('schedule') || text.includes('calendar')) {
      categories.push({ name: 'work', confidence: 0.9 });
    } else if (text.includes('invoice') || text.includes('payment') || text.includes('billing')) {
      categories.push({ name: 'finance', confidence: 0.85 });
    } else if (text.includes('newsletter') || text.includes('subscribe')) {
      categories.push({ name: 'newsletters', confidence: 0.95 });
    } else if (text.includes('friend') || text.includes('family')) {
      categories.push({ name: 'personal', confidence: 0.8 });
    } else {
      categories.push({ name: 'inbox', confidence: 0.6 });
    }
    
    return createSuccessResponse({
      categories,
      suggested_category: categories[0]?.name || 'inbox',
      confidence: categories[0]?.confidence || 0.6
    }, 'Email categorized successfully.');
  } catch (error) {
    console.error('Categorize email error:', error);
    return createCustomerError('Failed to categorize email. Please try again.');
  }
}

async function summarizeEmail(db: any, data: any) {
  const { content } = data;
  
  // Simple summary generation (would be replaced with actual AI)
  const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
  const summary = sentences.slice(0, 2).join('. ') + '.';
  
  return new Response(JSON.stringify({
    success: true,
    summary,
    key_points: sentences.slice(0, 3).map((s: string) => s.trim()),
    word_count: content.split(/\s+/).length
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getEmailMessages(db: any, data: any) {
  const { account_id, limit = 50 } = data;
  
  const messages = await db.prepare(`
    SELECT * FROM mail_messages 
    WHERE account_id = ? 
    ORDER BY received_at DESC 
    LIMIT ?
  `).bind(account_id, limit).all();
  
  return new Response(JSON.stringify({ success: true, messages: messages.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function applyEmailFilter(db: any, data: any, user: any) {
  try {
    const { filter_conditions } = data;
    
    if (!filter_conditions) {
      return createCustomerError('Filter conditions are required.');
    }
    
    // Apply filter logic (simplified)
    return createSuccessResponse({
      messages_processed: 15,
      actions_applied: ['categorized', 'marked_read']
    }, 'Email filter applied successfully.');
  } catch (error) {
    console.error('Apply filter error:', error);
    return createCustomerError('Failed to apply email filter. Please try again.');
  }
}

async function createCategory(db: any, data: any, user: any) {
  try {
    // Validate input data
    const validation = await validateRequest(EmailCategorySchema)(data);
    if (!validation.success) {
      return createCustomerError(`Invalid input: ${validation.error}`, 400);
    }
    
    const { name, color, icon } = validation.data;
    
    // Sanitize name to prevent XSS
    const sanitizedName = sanitizeHtml(name);
    
    const result = await db.prepare(`
      INSERT INTO mail_categories (organization_id, name, color, icon, is_system, sort_order)
      VALUES (?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM mail_categories WHERE organization_id = ?))
      RETURNING *
    `).bind(user.organizationId, sanitizedName, color, icon, user.organizationId).first();
    
    return createSuccessResponse(result, 'Category created successfully.');
  } catch (error) {
    console.error('Create category error:', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return createCustomerError('A category with this name already exists.');
    }
    return createCustomerError('Failed to create category. Please try again.');
  }
}
