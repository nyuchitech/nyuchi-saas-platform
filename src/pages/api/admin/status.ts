import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../core/lib/auth';

// Admin-only system status endpoint
export const GET: APIRoute = async ({ request, locals }) => {
  // Verify admin access
  const adminResult = await requireAdmin(request);
  if (adminResult instanceof Response) {
    return adminResult; // Return error response
  }
  
  const admin = adminResult;
  const db = locals.runtime?.env?.D1_DATABASE;

  try {
    let systemStats = {
      users: { total: 0, active_today: 0 },
      organizations: { total: 0 },
      products: {
        mail_organizer: { users: 0, emails_processed: 0 },
        seo_manager: { users: 0, sites_managed: 0 },
        analytics_pro: { users: 0, data_points: 0 },
        travel_platform: { users: 0, submissions: 0 },
        content_hub: { users: 0, content_items: 0 },
        event_widget: { users: 0, events_created: 0 }
      },
      api_usage: {
        total_calls_today: 0,
        rate_limited_calls: 0,
        errors_today: 0
      }
    };

    if (db) {
      try {
        // Get organization count
        const orgCount = await db.prepare('SELECT COUNT(*) as count FROM organizations').first();
        systemStats.organizations.total = orgCount?.count || 0;

        // Get mail organizer stats
        const mailStats = await db.prepare(`
          SELECT 
            COUNT(DISTINCT organization_id) as users,
            COUNT(*) as emails_processed
          FROM mail_messages 
          WHERE created_at >= date('now', '-1 day')
        `).first();
        
        systemStats.products.mail_organizer = {
          users: mailStats?.users || 0,
          emails_processed: mailStats?.emails_processed || 0
        };

        // Get SEO manager stats
        const seoStats = await db.prepare(`
          SELECT 
            COUNT(DISTINCT organization_id) as users,
            COUNT(*) as sites_managed
          FROM seo_sites
        `).first();
        
        systemStats.products.seo_manager = {
          users: seoStats?.users || 0,
          sites_managed: seoStats?.sites_managed || 0
        };

        // Get analytics events
        const analyticsStats = await db.prepare(`
          SELECT 
            COUNT(DISTINCT organization_id) as users,
            COUNT(*) as data_points
          FROM analytics_events 
          WHERE created_at >= date('now', '-1 day')
        `).first();
        
        systemStats.products.analytics_pro = {
          users: analyticsStats?.users || 0,
          data_points: analyticsStats?.data_points || 0
        };

      } catch (dbError) {
        console.warn('Database query error in status endpoint:', dbError);
      }
    }

    const statusData = {
      system: {
        status: 'operational',
        uptime_hours: 24, // Mock data
        last_restart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        memory_usage_mb: 128, // Mock data
        cpu_usage_percent: 15 // Mock data
      },
      database: {
        connection_pool: 'healthy',
        query_performance_ms: 25,
        storage_used_gb: 0.5
      },
      statistics: systemStats,
      alerts: [
        // Mock alerts - in production this would come from monitoring
      ],
      timestamp: new Date().toISOString(),
      admin_id: admin.id
    };

    return new Response(JSON.stringify(statusData), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch system status',
      timestamp: new Date().toISOString(),
      admin_id: admin.id
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
