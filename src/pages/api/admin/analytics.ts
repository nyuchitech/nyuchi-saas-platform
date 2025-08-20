import type { APIRoute } from 'astro';
import { requireSuperAdmin, createCustomerError, createSuccessResponse } from '../../../lib/auth';
import { SECURITY_HEADERS } from '../../../lib/validation';

export const GET: APIRoute = async ({ request, locals }: { request: Request; locals: any }) => {
  // Super admin access required
  const authResult = await requireSuperAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  try {
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.DB;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    // Collect comprehensive system analytics
    const analytics = await collectSystemAnalytics(db);
    
    const response = createSuccessResponse({
      system_health: 'healthy',
      timestamp: new Date().toISOString(),
      analytics
    }, 'System analytics retrieved successfully.');
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]: [string, any]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('System analytics error:', error);
    
    const response = createCustomerError('Failed to retrieve system analytics.', 500);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]: [string, any]) => {
      response.headers.set(key, value);
    });
    return response;
  }
};

async function collectSystemAnalytics(db: any) {
  // Organization statistics
  const organizationStats = await getOrganizationStats(db);
  
  // User statistics
  const userStats = await getUserStats(db);
  
  // Product usage statistics
  const productStats = await getProductUsageStats(db);
  
  // Performance metrics
  const performanceStats = await getPerformanceStats(db);
  
  // Growth metrics
  const growthStats = await getGrowthStats(db);
  
  // Revenue metrics (mock data for now)
  const revenueStats = await getRevenueStats(db);
  
  return {
    organizations: organizationStats,
    users: userStats,
    products: productStats,
    performance: performanceStats,
    growth: growthStats,
    revenue: revenueStats
  };
}

async function getOrganizationStats(db: any) {
  const totalOrgs = await db.prepare(`
    SELECT COUNT(*) as count FROM organizations
  `).first();
  
  const activeOrgs = await db.prepare(`
    SELECT COUNT(*) as count FROM organizations WHERE status = 'active'
  `).first();
  
  const orgsByPlan = await db.prepare(`
    SELECT plan_type, COUNT(*) as count 
    FROM organizations 
    GROUP BY plan_type
    ORDER BY count DESC
  `).all();
  
  const newOrgsThisMonth = await db.prepare(`
    SELECT COUNT(*) as count 
    FROM organizations 
    WHERE created_at > datetime('now', '-30 days')
  `).first();
  
  return {
    total: totalOrgs.count,
    active: activeOrgs.count,
    new_this_month: newOrgsThisMonth.count,
    by_plan: orgsByPlan.results,
    conversion_rate: activeOrgs.count > 0 ? (activeOrgs.count / totalOrgs.count * 100).toFixed(1) : 0
  };
}

async function getUserStats(db: any) {
  const totalUsers = await db.prepare(`
    SELECT COUNT(*) as count FROM users
  `).first();
  
  const activeUsers = await db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE status = 'active'
  `).first();
  
  const usersByRole = await db.prepare(`
    SELECT role, COUNT(*) as count 
    FROM users 
    GROUP BY role
    ORDER BY count DESC
  `).all();
  
  const usersLastLogin = await db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE last_login_at > datetime('now', '-30 days')
  `).first();
  
  const avgUsersPerOrg = await db.prepare(`
    SELECT AVG(user_count) as avg_count
    FROM (
      SELECT COUNT(*) as user_count 
      FROM users 
      WHERE status = 'active'
      GROUP BY organization_id
    )
  `).first();
  
  return {
    total: totalUsers.count,
    active: activeUsers.count,
    active_last_30_days: usersLastLogin.count,
    by_role: usersByRole.results,
    average_per_organization: Math.round(avgUsersPerOrg.avg_count || 0),
    engagement_rate: totalUsers.count > 0 ? (usersLastLogin.count / totalUsers.count * 100).toFixed(1) : 0
  };
}

async function getProductUsageStats(db: any) {
  const mailOrganizerStats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT ma.organization_id) as active_orgs,
      COUNT(*) as total_accounts,
      AVG(account_count) as avg_accounts_per_org
    FROM mail_accounts ma
    JOIN (
      SELECT organization_id, COUNT(*) as account_count
      FROM mail_accounts
      GROUP BY organization_id
    ) ac ON ma.organization_id = ac.organization_id
  `).first();
  
  const seoManagerStats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT organization_id) as active_orgs,
      COUNT(*) as total_sites,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sites
    FROM seo_sites
  `).first();
  
  const analyticsStats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT organization_id) as active_orgs,
      COUNT(*) as total_events,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM analytics_events
    WHERE created_at > datetime('now', '-30 days')
  `).first();
  
  const contentHubStats = await db.prepare(`
    SELECT 
      COUNT(DISTINCT organization_id) as active_orgs,
      COUNT(*) as total_content,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_content
    FROM content_items
  `).first();
  
  return {
    mail_organizer: {
      active_organizations: mailOrganizerStats.active_orgs || 0,
      total_accounts: mailOrganizerStats.total_accounts || 0,
      avg_accounts_per_org: Math.round(mailOrganizerStats.avg_accounts_per_org || 0)
    },
    seo_manager: {
      active_organizations: seoManagerStats.active_orgs || 0,
      total_sites: seoManagerStats.total_sites || 0,
      active_sites: seoManagerStats.active_sites || 0
    },
    analytics_pro: {
      active_organizations: analyticsStats.active_orgs || 0,
      total_events_30d: analyticsStats.total_events || 0,
      unique_sessions_30d: analyticsStats.unique_sessions || 0
    },
    content_hub: {
      active_organizations: contentHubStats.active_orgs || 0,
      total_content: contentHubStats.total_content || 0,
      published_content: contentHubStats.published_content || 0
    }
  };
}

async function getPerformanceStats(db: any) {
  // Mock performance data - in real implementation, collect from monitoring
  return {
    response_time: {
      avg_ms: 245,
      p95_ms: 680,
      p99_ms: 1200
    },
    uptime: {
      current_month: 99.94,
      last_month: 99.87,
      last_3_months: 99.91
    },
    error_rate: {
      current: 0.12,
      last_week: 0.08,
      threshold: 1.0
    },
    database: {
      d1_latency_ms: 45,
      supabase_latency_ms: 78,
      connection_pool_usage: 34
    }
  };
}

async function getGrowthStats(db: any) {
  // Organizations growth
  const orgGrowth = await db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM organizations
    WHERE created_at > datetime('now', '-90 days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all();
  
  // User growth
  const userGrowth = await db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM users
    WHERE created_at > datetime('now', '-90 days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all();
  
  // Calculate growth rates
  const thisMonth = await db.prepare(`
    SELECT COUNT(*) as count FROM organizations 
    WHERE created_at > datetime('now', '-30 days')
  `).first();
  
  const lastMonth = await db.prepare(`
    SELECT COUNT(*) as count FROM organizations 
    WHERE created_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')
  `).first();
  
  const monthlyGrowthRate = lastMonth.count > 0 
    ? ((thisMonth.count - lastMonth.count) / lastMonth.count * 100)
    : 0;
  
  return {
    organizations: {
      monthly_growth_rate: monthlyGrowthRate.toFixed(1),
      daily_data: orgGrowth.results
    },
    users: {
      daily_data: userGrowth.results
    },
    trends: {
      organizations_trending: monthlyGrowthRate > 0 ? 'up' : 'down',
      user_acquisition: 'stable',
      churn_rate: 2.3
    }
  };
}

async function getRevenueStats(db: any) {
  // Calculate revenue based on organizations and their plans
  const revenueByPlan = await db.prepare(`
    SELECT 
      plan_type,
      COUNT(*) as org_count,
      CASE plan_type
        WHEN 'free' THEN 0
        WHEN 'pro' THEN 19
        WHEN 'business' THEN 49
        WHEN 'enterprise' THEN 99
        ELSE 0
      END as monthly_price
    FROM organizations
    WHERE status = 'active'
    GROUP BY plan_type
  `).all();
  
  let totalMRR = 0;
  let totalARR = 0;
  
  revenueByPlan.results.forEach((plan: any) => {
    const planRevenue = plan.org_count * plan.monthly_price;
    totalMRR += planRevenue;
  });
  
  totalARR = totalMRR * 12;
  
  // Mock growth data
  const lastMonthMRR = totalMRR * 0.95; // Simulate 5% growth
  const mrrGrowthRate = lastMonthMRR > 0 
    ? ((totalMRR - lastMonthMRR) / lastMonthMRR * 100).toFixed(1)
    : 0;
  
  return {
    mrr: totalMRR,
    arr: totalARR,
    mrr_growth_rate: mrrGrowthRate,
    by_plan: revenueByPlan.results.map((plan: any) => ({
      plan: plan.plan_type,
      customers: plan.org_count,
      monthly_revenue: plan.org_count * plan.monthly_price
    })),
    metrics: {
      average_revenue_per_user: totalMRR > 0 ? (totalMRR / revenueByPlan.results.reduce((sum: number, p: any) => sum + p.org_count, 0)).toFixed(2) : 0,
      customer_lifetime_value: (totalMRR * 24).toFixed(0), // Assuming 24 month avg lifetime
      churn_rate: 2.3
    }
  };
}
