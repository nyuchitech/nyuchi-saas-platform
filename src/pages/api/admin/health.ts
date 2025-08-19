import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';

// Admin-only health check endpoint
export const GET: APIRoute = async ({ request, locals }) => {
  // Verify admin access
  const adminResult = await requireAdmin(request);
  if (adminResult instanceof Response) {
    return adminResult; // Return error response
  }
  
  const admin = adminResult;
  const db = locals.runtime?.env?.DB;

  try {
    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = 0;
    
    if (db) {
      const startTime = Date.now();
      try {
        await db.prepare('SELECT 1').first();
        dbLatency = Date.now() - startTime;
        dbStatus = 'healthy';
      } catch (error) {
        dbStatus = 'error';
      }
    } else {
      dbStatus = 'not_configured';
    }

    // Check Supabase connectivity
    let supabaseStatus = 'unknown';
    try {
      const supabaseUrl = locals.runtime?.env?.SUPABASE_URL;
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': locals.runtime?.env?.SUPABASE_ANON_KEY || '',
          }
        });
        supabaseStatus = response.ok ? 'healthy' : 'error';
      } else {
        supabaseStatus = 'not_configured';
      }
    } catch (error) {
      supabaseStatus = 'error';
    }

    // Overall system status
    const overallStatus = (dbStatus === 'healthy' && supabaseStatus === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
          type: 'cloudflare_d1'
        },
        supabase: {
          status: supabaseStatus,
          type: 'postgresql'
        }
      },
      environment: locals.runtime?.env?.ENVIRONMENT || 'development',
      admin_id: admin.id
    };

    return new Response(JSON.stringify(healthData), {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Internal system error',
      admin_id: admin.id
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
