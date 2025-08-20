import type { APIRoute } from 'astro';

export const prerender = false;
import { requireAuth, createCustomerError, createSuccessResponse, hasPermission, PRODUCT_PERMISSIONS } from '../../../lib/auth';

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
    if (!hasPermission(user, PRODUCT_PERMISSIONS.SEO_MANAGER.USE)) {
      return createCustomerError('You don\'t have access to SEO Manager. Please contact your administrator.', 403);
    }
    
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.D1_DATABASE;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    switch (action) {
      case 'connect-site':
        return await connectWordPressSite(db, body, user);
      case 'optimize-content':
        return await optimizeContent(db, body, user);
      case 'get-sites':
        return await getSites(db, body, user);
      case 'get-optimization-tasks':
        return await getOptimizationTasks(db, body, user);
      case 'bulk-optimize':
        // Check permission for bulk operations
        if (!hasPermission(user, PRODUCT_PERMISSIONS.SEO_MANAGER.BULK_OPERATIONS)) {
          return createCustomerError('You don\'t have permission for bulk optimization operations.', 403);
        }
        return await bulkOptimize(db, body, user);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
    console.error('SEO Manager API error:', error);
    return createCustomerError('Something went wrong. Please try again later.', 500);
  }
};

async function connectWordPressSite(db: any, data: any, user: any) {
  try {
    const { name, url, wp_api_key, wp_username } = data;
    
    if (!name || !url) {
      return createCustomerError('Site name and URL are required.');
    }
    
    const result = await db.prepare(`
      INSERT INTO seo_sites (organization_id, name, url, wp_api_key, wp_username, last_sync_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      RETURNING *
    `).bind(user.organizationId, name, url, wp_api_key, wp_username).first();
    
    return createSuccessResponse(result, 'WordPress site connected successfully.');
  } catch (error) {
    console.error('Connect site error:', error);
    return createCustomerError('Failed to connect WordPress site. Please try again.');
  }
}

async function optimizeContent(db: any, data: any, user: any) {
  try {
    const { site_id, content_type, content_data } = data;
    
    if (!site_id || !content_type) {
      return createCustomerError('Site ID and content type are required.');
    }
    
    // Verify site belongs to user's organization
    const site = await db.prepare(`
      SELECT * FROM seo_sites WHERE id = ? AND organization_id = ?
    `).bind(site_id, user.organizationId).first();
    
    if (!site) {
      return createCustomerError('Site not found or access denied.');
    }
    
    // Create optimization task
    const task = await db.prepare(`
      INSERT INTO seo_tasks (site_id, task_type, status, input_data)
      VALUES (?, ?, 'pending', ?)
      RETURNING *
    `).bind(site_id, content_type, JSON.stringify(content_data)).first();
    
    // Mock optimization results
    const optimizationResults = {
      title_suggestions: ['Optimized Title 1', 'Optimized Title 2'],
      meta_description: 'SEO optimized meta description with target keywords.',
      keyword_density: 2.5,
      readability_score: 85,
      suggestions: [
        'Add more target keywords in the first paragraph',
        'Include internal links to related content',
        'Optimize image alt texts'
      ]
    };
    
    // Update task with results
    await db.prepare(`
      UPDATE seo_tasks 
      SET status = 'completed', output_data = ?, completed_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify(optimizationResults), task.id).run();
    
    return createSuccessResponse({
      task_id: task.id,
      optimization: optimizationResults
    }, 'Content optimized successfully.');
  } catch (error) {
    console.error('Optimize content error:', error);
    return createCustomerError('Failed to optimize content. Please try again.');
  }
}

async function getSites(db: any, data: any, user: any) {
  try {
    const sites = await db.prepare(`
      SELECT id, name, url, status, last_sync_at, created_at
      FROM seo_sites 
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `).bind(user.organizationId).all();
    
    return createSuccessResponse(sites.results, 'Sites retrieved successfully.');
  } catch (error) {
    console.error('Get sites error:', error);
    return createCustomerError('Failed to retrieve sites. Please try again.');
  }
}

async function getOptimizationTasks(db: any, data: any, user: any) {
  try {
    const { site_id, limit = 50 } = data;
    
    let query = `
      SELECT t.*, s.name as site_name
      FROM seo_tasks t
      JOIN seo_sites s ON t.site_id = s.id
      WHERE s.organization_id = ?
    `;
    
    const params = [user.organizationId];
    
    if (site_id) {
      query += ' AND t.site_id = ?';
      params.push(site_id);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(limit);
    
    const tasks = await db.prepare(query).bind(...params).all();
    
    return createSuccessResponse(tasks.results, 'Optimization tasks retrieved successfully.');
  } catch (error) {
    console.error('Get optimization tasks error:', error);
    return createCustomerError('Failed to retrieve optimization tasks. Please try again.');
  }
}

async function bulkOptimize(db: any, data: any, user: any) {
  try {
    const { site_id, content_items } = data;
    
    if (!site_id || !Array.isArray(content_items)) {
      return createCustomerError('Site ID and content items array are required.');
    }
    
    // Verify site belongs to user's organization
    const site = await db.prepare(`
      SELECT * FROM seo_sites WHERE id = ? AND organization_id = ?
    `).bind(site_id, user.organizationId).first();
    
    if (!site) {
      return createCustomerError('Site not found or access denied.');
    }
    
    const results = [];
    
    for (const item of content_items.slice(0, 10)) { // Limit to 10 items
      try {
        const task = await db.prepare(`
          INSERT INTO seo_tasks (site_id, task_type, status, input_data)
          VALUES (?, 'bulk_optimize', 'completed', ?)
          RETURNING *
        `).bind(site_id, JSON.stringify(item)).first();
        
        results.push({
          item_id: item.id,
          task_id: task.id,
          status: 'optimized',
          improvements: ['Title optimized', 'Meta description added', 'Keywords improved']
        });
      } catch (itemError) {
        results.push({
          item_id: item.id,
          status: 'failed',
          error: 'Optimization failed'
        });
      }
    }
    
    return createSuccessResponse({
      processed_count: results.length,
      successful_count: results.filter(r => r.status === 'optimized').length,
      results
    }, `Bulk optimization completed. ${results.filter(r => r.status === 'optimized').length} items optimized.`);
  } catch (error) {
    console.error('Bulk optimize error:', error);
    return createCustomerError('Failed to perform bulk optimization. Please try again.');
  }
}
