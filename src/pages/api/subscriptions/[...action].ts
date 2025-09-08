import type { APIRoute } from 'astro';

export const prerender = false;
import { requireAuth, requireAdmin, createCustomerError, createSuccessResponse, hasPermission } from '../../../../core/lib/auth';
import { 
  validateRequest, 
  sanitizeHtml,
  SECURITY_HEADERS,
  validateJsonSize
} from '../../../../core/lib/validation';
import { z } from 'zod';

// Subscription schemas
const SubscriptionSchema = z.object({
  organization_id: z.string().min(1),
  plan_type: z.enum(['free', 'pro', 'business', 'enterprise']),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  payment_method_id: z.string().optional()
});

const UsageLimitSchema = z.object({
  organization_id: z.string().min(1),
  limit_type: z.enum(['users', 'mail_accounts', 'seo_sites', 'analytics_events', 'storage_mb']),
  limit_value: z.number().int().min(0)
});

export const POST: APIRoute = async ({ request, locals }: { request: Request; locals: any }) => {
  try {
    const { action } = locals.params;
    
    // Validate request size and parse JSON
    let body;
    try {
      body = await request.json();
      
      if (!validateJsonSize(body)) {
        return createCustomerError('Request payload too large.', 413);
      }
    } catch (error) {
      return createCustomerError('Invalid request format.', 400);
    }
    
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.DB;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    switch (action) {
      case 'get-plan':
        return await getSubscriptionPlan(request, db, body);
      case 'update-plan':
        return await updateSubscriptionPlan(request, db, body);
      case 'usage-stats':
        return await getUsageStatistics(request, db, body);
      case 'check-limits':
        return await checkUsageLimits(request, db, body);
      case 'billing-history':
        return await getBillingHistory(request, db, body);
      case 'update-payment':
        return await updatePaymentMethod(request, db, body);
      case 'cancel-subscription':
        return await cancelSubscription(request, db, body);
      case 'usage-forecast':
        return await getUsageForecast(request, db, body);
      case 'plan-comparison':
        return await getPlanComparison(request, db, body);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
    console.error('Subscription API error:', error);
    
    const response = createCustomerError('Something went wrong. Please try again later.', 500);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]: [string, any]) => {
      response.headers.set(key, value);
    });
    return response;
  }
};

async function getSubscriptionPlan(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  // Users can only access their own organization unless admin
  if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
    return createCustomerError('Access denied to subscription information.', 403);
  }
  
  try {
    const organization = await db.prepare(`
      SELECT id, name, plan_type, status, created_at FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    if (!organization) {
      return createCustomerError('Organization not found.');
    }
    
    const planDetails = getPlanDetails(organization.plan_type);
    const currentUsage = await getCurrentUsage(db, targetOrgId);
    const usageLimits = getPlanLimits(organization.plan_type);
    
    return createSuccessResponse({
      organization: {
        id: organization.id,
        name: organization.name,
        plan_type: organization.plan_type,
        status: organization.status
      },
      subscription: {
        ...planDetails,
        current_usage: currentUsage,
        usage_limits: usageLimits,
        usage_percentage: calculateUsagePercentage(currentUsage, usageLimits)
      }
    });
    
  } catch (error) {
    console.error('Get subscription plan error:', error);
    return createCustomerError('Failed to retrieve subscription information.');
  }
}

async function updateSubscriptionPlan(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  // Check if user can manage subscription
  if (!hasPermission(user, 'billing.manage') && user.role !== 'admin') {
    return createCustomerError('Insufficient permissions to manage subscription.', 403);
  }
  
  try {
    const validation = await validateRequest(SubscriptionSchema)(data);
    if (!validation.success) {
      return createCustomerError(`Invalid input: ${validation.error}`, 400);
    }
    
    const { organization_id, plan_type, billing_cycle, payment_method_id } = validation.data as any;
    const targetOrgId = organization_id || user.organizationId;
    
    // Users can only update their own organization unless admin
    if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
      return createCustomerError('Access denied to this organization.', 403);
    }
    
    // Check if downgrading and validate current usage
    const currentOrg = await db.prepare(`
      SELECT plan_type FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    if (!currentOrg) {
      return createCustomerError('Organization not found.');
    }
    
    const newLimits = getPlanLimits(plan_type);
    const currentUsage = await getCurrentUsage(db, targetOrgId);
    
    // Check if current usage exceeds new plan limits
    const exceedsLimits = checkIfExceedsLimits(currentUsage, newLimits);
    if (exceedsLimits.length > 0) {
      return createCustomerError(
        `Cannot downgrade plan. Current usage exceeds new limits: ${exceedsLimits.join(', ')}.`,
        400
      );
    }
    
    // Update organization plan
    const result = await db.prepare(`
      UPDATE organizations 
      SET plan_type = ?, updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `).bind(plan_type, targetOrgId).first();
    
    // Create billing record (in real implementation, integrate with Stripe)
    const planDetails = getPlanDetails(plan_type);
    const amount = billing_cycle === 'yearly' ? planDetails.price_yearly : planDetails.price_monthly;
    
    await db.prepare(`
      INSERT INTO billing_history (organization_id, plan_type, billing_cycle, amount, status, created_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'))
    `).bind(targetOrgId, plan_type, billing_cycle, amount).run();
    
    return createSuccessResponse({
      organization: result,
      subscription: {
        ...planDetails,
        billing_cycle,
        amount,
        status: 'active'
      }
    }, 'Subscription updated successfully.');
    
  } catch (error) {
    console.error('Update subscription error:', error);
    return createCustomerError('Failed to update subscription. Please try again.');
  }
}

async function getUsageStatistics(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id, period = '30d' } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  // Users can only access their own organization unless admin
  if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
    return createCustomerError('Access denied to usage statistics.', 403);
  }
  
  try {
    const dateFilter = getPeriodFilter(period);
    
    // Get detailed usage statistics
    const usage = await getDetailedUsage(db, targetOrgId, dateFilter);
    const organization = await db.prepare(`
      SELECT plan_type FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    const limits = getPlanLimits(organization.plan_type);
    const usagePercentage = calculateUsagePercentage(usage.current, limits);
    
    return createSuccessResponse({
      organization_id: targetOrgId,
      plan_type: organization.plan_type,
      period,
      usage: {
        current: usage.current,
        historical: usage.historical,
        trending: usage.trending
      },
      limits,
      usage_percentage: usagePercentage,
      warnings: generateUsageWarnings(usage.current, limits)
    });
    
  } catch (error) {
    console.error('Get usage statistics error:', error);
    return createCustomerError('Failed to retrieve usage statistics.');
  }
}

async function checkUsageLimits(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id, action_type } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  try {
    const organization = await db.prepare(`
      SELECT plan_type FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    if (!organization) {
      return createCustomerError('Organization not found.');
    }
    
    const limits = getPlanLimits(organization.plan_type);
    const currentUsage = await getCurrentUsage(db, targetOrgId);
    
    // Check specific limit based on action type
    const limitCheck = checkSpecificLimit(currentUsage, limits, action_type);
    
    return createSuccessResponse({
      can_proceed: limitCheck.allowed,
      limit_reached: !limitCheck.allowed,
      current_usage: limitCheck.current_value,
      limit: limitCheck.limit,
      usage_percentage: (limitCheck.current_value / limitCheck.limit) * 100,
      message: limitCheck.message,
      upgrade_required: limitCheck.upgrade_required
    });
    
  } catch (error) {
    console.error('Check usage limits error:', error);
    return createCustomerError('Failed to check usage limits.');
  }
}

async function getBillingHistory(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id, limit = 12 } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  // Users can only access their own billing unless admin
  if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
    return createCustomerError('Access denied to billing history.', 403);
  }
  
  try {
    // Mock billing history - in real implementation, integrate with Stripe
    const organization = await db.prepare(`
      SELECT plan_type, created_at FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    const billingHistory = generateMockBillingHistory(organization, limit);
    const upcomingBill = generateUpcomingBill(organization);
    
    return createSuccessResponse({
      organization_id: targetOrgId,
      billing_history: billingHistory,
      upcoming_bill: upcomingBill,
      payment_method: {
        type: 'card',
        last_four: '4242',
        expires: '12/2028'
      }
    });
    
  } catch (error) {
    console.error('Get billing history error:', error);
    return createCustomerError('Failed to retrieve billing history.');
  }
}

async function updatePaymentMethod(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  // Check billing permission
  if (!hasPermission(user, 'billing.manage') && user.role !== 'admin') {
    return createCustomerError('Insufficient permissions to update payment method.', 403);
  }
  
  try {
    const { organization_id, payment_method_id } = data;
    const targetOrgId = organization_id || user.organizationId;
    
    // In real implementation, integrate with Stripe to update payment method
    // For now, return mock success
    
    return createSuccessResponse({
      organization_id: targetOrgId,
      payment_method: {
        id: payment_method_id,
        type: 'card',
        last_four: '4242',
        expires: '12/2028',
        updated_at: new Date().toISOString()
      }
    }, 'Payment method updated successfully.');
    
  } catch (error) {
    console.error('Update payment method error:', error);
    return createCustomerError('Failed to update payment method.');
  }
}

async function cancelSubscription(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  // Check billing permission
  if (!hasPermission(user, 'billing.manage') && user.role !== 'admin') {
    return createCustomerError('Insufficient permissions to cancel subscription.', 403);
  }
  
  try {
    const { organization_id, cancellation_reason } = data;
    const targetOrgId = organization_id || user.organizationId;
    
    // Downgrade to free plan
    const result = await db.prepare(`
      UPDATE organizations 
      SET plan_type = 'free', updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `).bind(targetOrgId).first();
    
    // Log cancellation reason
    await db.prepare(`
      INSERT INTO cancellation_log (organization_id, reason, cancelled_at)
      VALUES (?, ?, datetime('now'))
    `).bind(targetOrgId, cancellation_reason || 'No reason provided').run();
    
    return createSuccessResponse({
      organization: result,
      message: 'Subscription cancelled. Your account has been downgraded to the free plan.'
    });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return createCustomerError('Failed to cancel subscription.');
  }
}

async function getUsageForecast(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id, forecast_days = 30 } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  try {
    const historicalUsage = await getHistoricalUsage(db, targetOrgId, 90); // 90 days of history
    const organization = await db.prepare(`
      SELECT plan_type FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    const forecast = calculateUsageForecast(historicalUsage, forecast_days);
    const limits = getPlanLimits(organization.plan_type);
    
    return createSuccessResponse({
      organization_id: targetOrgId,
      forecast_period_days: forecast_days,
      current_plan: organization.plan_type,
      forecast,
      projected_limit_exceeded: checkForecastLimits(forecast, limits),
      recommendations: generatePlanRecommendations(forecast, limits)
    });
    
  } catch (error) {
    console.error('Get usage forecast error:', error);
    return createCustomerError('Failed to generate usage forecast.');
  }
}

async function getPlanComparison(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  try {
    const plans = {
      free: getPlanDetails('free'),
      pro: getPlanDetails('pro'),
      business: getPlanDetails('business'),
      enterprise: getPlanDetails('enterprise')
    };
    
    return createSuccessResponse({ plans });
    
  } catch (error) {
    console.error('Get plan comparison error:', error);
    return createCustomerError('Failed to retrieve plan comparison.');
  }
}

// Helper functions
async function getCurrentUsage(db: any, organizationId: string) {
  const userCount = await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND status = 'active'
  `).bind(organizationId).first();
  
  const mailAccounts = await db.prepare(`
    SELECT COUNT(*) as count FROM mail_accounts WHERE organization_id = ?
  `).bind(organizationId).first();
  
  const seoSites = await db.prepare(`
    SELECT COUNT(*) as count FROM seo_sites WHERE organization_id = ?
  `).bind(organizationId).first();
  
  const analyticsEvents = await db.prepare(`
    SELECT COUNT(*) as count FROM analytics_events 
    WHERE organization_id = ? AND created_at > datetime('now', '-30 days')
  `).bind(organizationId).first();
  
  const storageUsage = await db.prepare(`
    SELECT 
      (SELECT COALESCE(SUM(LENGTH(content)), 0) FROM mail_messages m
       JOIN mail_accounts a ON m.account_id = a.id
       WHERE a.organization_id = ?) +
      (SELECT COALESCE(SUM(LENGTH(input_data) + LENGTH(output_data)), 0) FROM seo_tasks t
       JOIN seo_sites s ON t.site_id = s.id
       WHERE s.organization_id = ?) as total_bytes
  `).bind(organizationId, organizationId).first();
  
  return {
    users: userCount.count,
    mail_accounts: mailAccounts.count,
    seo_sites: seoSites.count,
    analytics_events: analyticsEvents.count,
    storage_mb: Math.round(storageUsage.total_bytes / (1024 * 1024))
  };
}

function getPlanDetails(planType: string) {
  const plans: Record<string, any> = {
    free: {
      name: 'Free Plan',
      price_monthly: 0,
      price_yearly: 0,
      features: ['1 user', '1 mail account', '1 SEO site', '1000 analytics events/month', '100MB storage']
    },
    pro: {
      name: 'Pro Plan',
      price_monthly: 19,
      price_yearly: 190,
      features: ['5 users', '3 mail accounts', '5 SEO sites', '10000 analytics events/month', '1GB storage']
    },
    business: {
      name: 'Business Plan',
      price_monthly: 49,
      price_yearly: 490,
      features: ['25 users', '10 mail accounts', '25 SEO sites', '100000 analytics events/month', '10GB storage']
    },
    enterprise: {
      name: 'Enterprise Plan',
      price_monthly: 99,
      price_yearly: 990,
      features: ['Unlimited users', 'Unlimited mail accounts', 'Unlimited SEO sites', 'Unlimited analytics events', '100GB storage']
    }
  };
  
  return plans[planType] || plans.free;
}

function getPlanLimits(planType: string) {
  const limits: Record<string, any> = {
    free: {
      users: 1,
      mail_accounts: 1,
      seo_sites: 1,
      analytics_events: 1000,
      storage_mb: 100
    },
    pro: {
      users: 5,
      mail_accounts: 3,
      seo_sites: 5,
      analytics_events: 10000,
      storage_mb: 1024
    },
    business: {
      users: 25,
      mail_accounts: 10,
      seo_sites: 25,
      analytics_events: 100000,
      storage_mb: 10240
    },
    enterprise: {
      users: -1, // Unlimited
      mail_accounts: -1,
      seo_sites: -1,
      analytics_events: -1,
      storage_mb: 102400
    }
  };
  
  return limits[planType] || limits.free;
}

function calculateUsagePercentage(usage: any, limits: any) {
  const percentages: Record<string, number> = {};
  
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof limit === 'number' && limit > 0) {
      percentages[key] = Math.min((usage[key] / limit) * 100, 100);
    } else {
      percentages[key] = 0; // Unlimited
    }
  }
  
  return percentages;
}

function checkIfExceedsLimits(usage: any, limits: any): string[] {
  const exceeded = [];
  
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof limit === 'number' && limit > 0 && usage[key] > limit) {
      exceeded.push(key);
    }
  }
  
  return exceeded;
}

function checkSpecificLimit(usage: any, limits: any, actionType: string) {
  const limitMap: Record<string, string> = {
    'create_user': 'users',
    'add_mail_account': 'mail_accounts',
    'add_seo_site': 'seo_sites',
    'track_analytics': 'analytics_events'
  };
  
  const limitKey = limitMap[actionType];
  if (!limitKey) {
    return { allowed: true, message: 'No limit check required' };
  }
  
  const currentValue = usage[limitKey] || 0;
  const limit = limits[limitKey];
  
  if (limit === -1) {
    return { allowed: true, current_value: currentValue, limit: 'unlimited', message: 'No limit on this plan' };
  }
  
  const allowed = currentValue < limit;
  
  return {
    allowed,
    current_value: currentValue,
    limit,
    message: allowed 
      ? `${limit - currentValue} remaining` 
      : 'Usage limit reached',
    upgrade_required: !allowed
  };
}

function generateUsageWarnings(usage: any, limits: any): string[] {
  const warnings = [];
  
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof limit === 'number' && limit > 0) {
      const percentage = (usage[key] / limit) * 100;
      if (percentage >= 90) {
        warnings.push(`${key} usage is at ${Math.round(percentage)}% of limit`);
      } else if (percentage >= 80) {
        warnings.push(`${key} usage is approaching limit (${Math.round(percentage)}%)`);
      }
    }
  }
  
  return warnings;
}

function getPeriodFilter(period: string) {
  const filters: Record<string, string> = {
    '7d': 'datetime(\'now\', \'-7 days\')',
    '30d': 'datetime(\'now\', \'-30 days\')',
    '90d': 'datetime(\'now\', \'-90 days\')',
    '1y': 'datetime(\'now\', \'-1 year\')'
  };
  
  return filters[period] || filters['30d'];
}

async function getDetailedUsage(db: any, organizationId: string, dateFilter: string) {
  // This is a simplified version - implement detailed historical tracking
  const current = await getCurrentUsage(db, organizationId);
  
  return {
    current,
    historical: [], // Implement historical data tracking
    trending: 'stable' // Implement trend analysis
  };
}

async function getHistoricalUsage(db: any, organizationId: string, days: number) {
  // Implement historical usage tracking
  return [];
}

function calculateUsageForecast(historicalUsage: any[], forecastDays: number) {
  // Implement usage forecasting algorithm
  return {
    users: { projected: 1, confidence: 0.8 },
    mail_accounts: { projected: 1, confidence: 0.8 },
    seo_sites: { projected: 1, confidence: 0.8 },
    analytics_events: { projected: 1000, confidence: 0.7 },
    storage_mb: { projected: 50, confidence: 0.9 }
  };
}

function checkForecastLimits(forecast: any, limits: any): string[] {
  const exceeded = [];
  
  for (const [key, projection] of Object.entries(forecast)) {
    const limit = limits[key];
    if (typeof limit === 'number' && limit > 0) {
      const projectedValue = (projection as any).projected;
      if (projectedValue > limit) {
        exceeded.push(key);
      }
    }
  }
  
  return exceeded;
}

function generatePlanRecommendations(forecast: any, currentLimits: any): string[] {
  const recommendations = [];
  const exceeded = checkForecastLimits(forecast, currentLimits);
  
  if (exceeded.length > 0) {
    recommendations.push('Consider upgrading your plan to handle projected usage growth');
    recommendations.push(`Projected to exceed limits in: ${exceeded.join(', ')}`);
  } else {
    recommendations.push('Current plan should handle projected usage');
  }
  
  return recommendations;
}

function generateMockBillingHistory(organization: any, limit: number) {
  const history = [];
  const planPrice = getPlanDetails(organization.plan_type).price_monthly;
  
  for (let i = 0; i < limit; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    history.push({
      id: `bill_${i}`,
      date: date.toISOString(),
      amount: planPrice,
      status: 'paid',
      description: `${organization.plan_type} Plan - Monthly`,
      invoice_url: `https://example.com/invoice/${i}`
    });
  }
  
  return history;
}

function generateUpcomingBill(organization: any) {
  const nextBillDate = new Date();
  nextBillDate.setMonth(nextBillDate.getMonth() + 1);
  
  return {
    date: nextBillDate.toISOString(),
    amount: getPlanDetails(organization.plan_type).price_monthly,
    description: `${organization.plan_type} Plan - Monthly`
  };
}
