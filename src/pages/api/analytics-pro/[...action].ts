import type { APIRoute } from 'astro';
import { requireAuth, createCustomerError, createSuccessResponse, hasPermission, PRODUCT_PERMISSIONS } from '../../../../core/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Verify user authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return authentication error
    }
    
    const user = authResult;
    const { action } = params;
    const body = await request.json();
    
    // Check product access permission
    if (!hasPermission(user, PRODUCT_PERMISSIONS.ANALYTICS_PRO.USE)) {
      return createCustomerError('You don\'t have access to Analytics Pro. Please contact your administrator.', 403);
    }
    
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.D1_DATABASE;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    switch (action) {
      case 'track-event':
        return await trackEvent(db, body, user);
      case 'get-analytics':
        return await getAnalytics(db, body, user);
      case 'create-dashboard':
        return await createDashboard(db, body, user);
      case 'export-data':
        // Check export permission
        if (!hasPermission(user, PRODUCT_PERMISSIONS.ANALYTICS_PRO.EXPORT)) {
          return createCustomerError('You don\'t have permission to export analytics data.', 403);
        }
        return await exportData(db, body, user);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
    console.error('Analytics Pro API error:', error);
    return createCustomerError('Something went wrong. Please try again later.', 500);
  }
};

async function trackEvent(db: any, data: any, user: any) {
  try {
    const { event_type, event_data, session_id } = data;
    
    if (!event_type) {
      return createCustomerError('Event type is required.');
    }
    
    const result = await db.prepare(`
      INSERT INTO analytics_events (organization_id, event_type, event_data, user_id, session_id)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      user.organizationId, 
      event_type, 
      JSON.stringify(event_data || {}), 
      user.id, 
      session_id
    ).first();
    
    return createSuccessResponse({ event_id: result.id }, 'Event tracked successfully.');
  } catch (error) {
    console.error('Track event error:', error);
    return createCustomerError('Failed to track event. Please try again.');
  }
}

async function getAnalytics(db: any, data: any, user: any) {
  try {
    const { date_from, date_to, event_types } = data;
    
    let query = `
      SELECT 
        event_type,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM analytics_events 
      WHERE organization_id = ?
    `;
    
    const params = [user.organizationId];
    
    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to);
    }
    
    if (event_types && Array.isArray(event_types)) {
      query += ` AND event_type IN (${event_types.map(() => '?').join(',')})`;
      params.push(...event_types);
    }
    
    query += ' GROUP BY event_type, DATE(created_at) ORDER BY date DESC';
    
    const analytics = await db.prepare(query).bind(...params).all();
    
    // Mock additional analytics data
    const summary = {
      total_events: analytics.results.reduce((sum: number, row: any) => sum + row.count, 0),
      unique_event_types: [...new Set(analytics.results.map((row: any) => row.event_type))].length,
      date_range: { from: date_from, to: date_to },
      top_events: analytics.results
        .reduce((acc: any, row: any) => {
          acc[row.event_type] = (acc[row.event_type] || 0) + row.count;
          return acc;
        }, {})
    };
    
    return createSuccessResponse({
      summary,
      events: analytics.results
    }, 'Analytics data retrieved successfully.');
  } catch (error) {
    console.error('Get analytics error:', error);
    return createCustomerError('Failed to retrieve analytics data. Please try again.');
  }
}

async function createDashboard(db: any, data: any, user: any) {
  try {
    const { name, widgets, layout } = data;
    
    if (!name) {
      return createCustomerError('Dashboard name is required.');
    }
    
    // Mock dashboard creation (in production, this would store dashboard config)
    const dashboard = {
      id: Date.now().toString(),
      name,
      widgets: widgets || [],
      layout: layout || 'grid',
      organization_id: user.organizationId,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    return createSuccessResponse(dashboard, 'Dashboard created successfully.');
  } catch (error) {
    console.error('Create dashboard error:', error);
    return createCustomerError('Failed to create dashboard. Please try again.');
  }
}

async function exportData(db: any, data: any, user: any) {
  try {
    const { format, date_from, date_to } = data;
    
    if (!format || !['csv', 'json', 'xlsx'].includes(format)) {
      return createCustomerError('Valid export format (csv, json, xlsx) is required.');
    }
    
    // Mock export (in production, this would generate actual file)
    const exportJob = {
      id: Date.now().toString(),
      format,
      status: 'processing',
      download_url: null as string | null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      created_at: new Date().toISOString()
    };
    
    // Simulate async processing
    setTimeout(() => {
      exportJob.status = 'completed';
      exportJob.download_url = `/downloads/analytics-export-${exportJob.id}.${format}`;
    }, 2000);
    
    return createSuccessResponse(exportJob, 'Export job started successfully. You will receive an email when ready.');
  } catch (error) {
    console.error('Export data error:', error);
    return createCustomerError('Failed to start export. Please try again.');
  }
}
