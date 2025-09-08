import type { APIRoute } from 'astro';
import { requireAuth, requireAdmin, requireSuperAdmin, hasPermission, createCustomerError, createSuccessResponse, ROLE_HIERARCHY, UserRole } from '../../../lib/auth';

export const prerender = false;
import { 
  validateRequest, 
  OrganizationSchema, 
  OrganizationUpdateSchema,
  sanitizeHtml,
  SECURITY_HEADERS,
  validateJsonSize
} from '../../../lib/validation';

export const POST: APIRoute = async ({ request, locals }: { request: Request; locals: any }) => {
  try {
    // Parse action from URL
    const { action } = locals.params;
    
    // Validate request size and parse JSON
    let body;
    try {
      body = await request.json();
      
      // Validate JSON size (max 1MB)
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
      case 'create':
        return await createOrganization(request, db, body);
      case 'list':
        return await listOrganizations(request, db, body);
      case 'get':
        return await getOrganization(request, db, body);
      case 'update':
        return await updateOrganization(request, db, body);
      case 'invite-member':
        return await inviteMember(request, db, body);
      case 'remove-member':
        return await removeMember(request, db, body);
      case 'update-member':
        return await updateMember(request, db, body);
      case 'delete':
        return await deleteOrganization(request, db, body);
      case 'usage-stats':
        return await getUsageStats(request, db, body);
      case 'billing-info':
        return await getBillingInfo(request, db, body);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
    console.error('Organization API error:', error);
    
    // Return response with security headers
    const response = createCustomerError('Something went wrong. Please try again later.', 500);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
};

async function createOrganization(request: Request, db: any, data: any) {
  // Authentication required - users can create their own organizations
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  try {
    // Validate input data
    const validation = await validateRequest(OrganizationSchema)(data);
    if (!validation.success) {
      return createCustomerError(`Invalid input: ${validation.error}`, 400);
    }
    
    const { name, description, plan_type = 'free' } = validation.data as any;
    
    // Sanitize inputs
    const sanitizedName = sanitizeHtml(name);
    const sanitizedDescription = description ? sanitizeHtml(description) : null;
    
    // Generate organization ID
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create organization in D1
    const result = await db.prepare(`
      INSERT INTO organizations (id, name, description, plan_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      RETURNING *
    `).bind(orgId, sanitizedName, sanitizedDescription, plan_type).first();
    
    // Add creator as admin user in organization
    await db.prepare(`
      INSERT INTO users (id, email, role, organization_id, status, created_at, updated_at)
      VALUES (?, ?, 'admin', ?, 'active', datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        organization_id = excluded.organization_id,
        updated_at = datetime('now')
    `).bind(user.id, user.email, orgId).run();
    
    // Create default mail categories for the organization
    const defaultCategories = [
      { name: 'Work', color: '#3b82f6', icon: 'briefcase', is_system: 1 },
      { name: 'Personal', color: '#10b981', icon: 'user', is_system: 1 },
      { name: 'Newsletter', color: '#f59e0b', icon: 'newspaper', is_system: 1 },
      { name: 'Promotions', color: '#ef4444', icon: 'tag', is_system: 1 }
    ];
    
    for (const category of defaultCategories) {
      await db.prepare(`
        INSERT INTO mail_categories (organization_id, name, color, icon, is_system, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(orgId, category.name, category.color, category.icon, category.is_system, defaultCategories.indexOf(category)).run();
    }
    
    return createSuccessResponse({
      organization: result,
      message: 'Organization created successfully with default settings.'
    });
    
  } catch (error) {
    console.error('Create organization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('UNIQUE constraint')) {
      return createCustomerError('An organization with this name already exists.');
    }
    return createCustomerError('Failed to create organization. Please try again.');
  }
}

async function listOrganizations(request: Request, db: any, data: any) {
  // Super admin can see all organizations, regular users see only their own
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { page = 1, limit = 20, status_filter, plan_filter } = data;
  
  try {
    let query = 'SELECT * FROM organizations WHERE 1=1';
    let params = [];
    
    // Non-super admin can only see their organization
    if (user.role !== 'super_admin') {
      query += ' AND id = ?';
      params.push(user.organizationId);
    }
    
    // Apply filters
    if (status_filter) {
      query += ' AND status = ?';
      params.push(status_filter);
    }
    
    if (plan_filter) {
      query += ' AND plan_type = ?';
      params.push(plan_filter);
    }
    
    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const organizations = await db.prepare(query).bind(...params).all();
    
    // Get organization stats for each
    const organizationsWithStats = await Promise.all(
      organizations.results.map(async (org: any) => {
        const userCount = await db.prepare(`
          SELECT COUNT(*) as count FROM users WHERE organization_id = ?
        `).bind(org.id).first();
        
        const activeProducts = await db.prepare(`
          SELECT COUNT(DISTINCT 
            CASE 
              WHEN EXISTS(SELECT 1 FROM mail_accounts WHERE organization_id = ?) THEN 'mail_organizer'
              WHEN EXISTS(SELECT 1 FROM seo_sites WHERE organization_id = ?) THEN 'seo_manager'
              WHEN EXISTS(SELECT 1 FROM analytics_events WHERE organization_id = ?) THEN 'analytics_pro'
              ELSE NULL
            END
          ) as count
        `).bind(org.id, org.id, org.id).first();
        
        return {
          ...org,
          stats: {
            user_count: userCount.count,
            active_products: activeProducts.count,
            created_at: org.created_at
          }
        };
      })
    );
    
    return createSuccessResponse({
      organizations: organizationsWithStats,
      pagination: {
        page,
        limit,
        total: organizations.results.length
      }
    });
    
  } catch (error) {
    console.error('List organizations error:', error);
    return createCustomerError('Failed to retrieve organizations.');
  }
}

async function getOrganization(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id } = data;
  
  if (!organization_id) {
    return createCustomerError('Organization ID is required.');
  }
  
  // Users can only access their own organization unless super admin
  if (user.role !== 'super_admin' && organization_id !== user.organizationId) {
    return createCustomerError('Access denied to this organization.', 403);
  }
  
  try {
    const organization = await db.prepare(`
      SELECT * FROM organizations WHERE id = ?
    `).bind(organization_id).first();
    
    if (!organization) {
      return createCustomerError('Organization not found.');
    }
    
    // Get organization members
    const members = await db.prepare(`
      SELECT id, email, role, status, created_at, last_login_at 
      FROM users WHERE organization_id = ?
      ORDER BY role, created_at
    `).bind(organization_id).all();
    
    // Get usage statistics
    const usage = await getOrganizationUsage(db, organization_id);
    
    return createSuccessResponse({
      organization: {
        ...organization,
        members: members.results,
        usage
      }
    });
    
  } catch (error) {
    console.error('Get organization error:', error);
    return createCustomerError('Failed to retrieve organization details.');
  }
}

async function updateOrganization(request: Request, db: any, data: any) {
  // Admin or higher required
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  // Check admin permissions
  if (!hasPermission(user, 'organization.manage') && user.role !== 'super_admin') {
    return createCustomerError('Insufficient permissions to update organization.', 403);
  }
  
  try {
    const validation = await validateRequest(OrganizationUpdateSchema)(data);
    if (!validation.success) {
      return createCustomerError(`Invalid input: ${validation.error}`, 400);
    }
    
    const { organization_id, name, description, settings } = validation.data as any;
    
    // Users can only update their own organization unless super admin
    if (user.role !== 'super_admin' && organization_id !== user.organizationId) {
      return createCustomerError('Access denied to this organization.', 403);
    }
    
    // Sanitize inputs
    const sanitizedName = name ? sanitizeHtml(name) : undefined;
    const sanitizedDescription = description ? sanitizeHtml(description) : undefined;
    
    // Build update query dynamically
    let updateFields = [];
    let params = [];
    
    if (sanitizedName) {
      updateFields.push('name = ?');
      params.push(sanitizedName);
    }
    
    if (sanitizedDescription) {
      updateFields.push('description = ?');
      params.push(sanitizedDescription);
    }
    
    if (settings) {
      updateFields.push('settings = ?');
      params.push(JSON.stringify(settings));
    }
    
    updateFields.push('updated_at = datetime(\'now\')');
    params.push(organization_id);
    
    const result = await db.prepare(`
      UPDATE organizations 
      SET ${updateFields.join(', ')}
      WHERE id = ?
      RETURNING *
    `).bind(...params).first();
    
    return createSuccessResponse(result, 'Organization updated successfully.');
    
  } catch (error) {
    console.error('Update organization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('UNIQUE constraint')) {
      return createCustomerError('An organization with this name already exists.');
    }
    return createCustomerError('Failed to update organization. Please try again.');
  }
}

async function inviteMember(request: Request, db: any, data: any) {
  // Admin permission required
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  if (!hasPermission(user, 'users.create')) {
    return createCustomerError('Insufficient permissions to invite members.', 403);
  }
  
  try {
    const { email, role = 'user', organization_id } = data;
    
    if (!email || !role) {
      return createCustomerError('Email and role are required.');
    }
    
    const targetOrgId = organization_id || user.organizationId;
    
    // Validate role hierarchy
    if (user.role !== 'super_admin') {
      if (ROLE_HIERARCHY[role as UserRole] >= ROLE_HIERARCHY[user.role]) {
        return createCustomerError('Cannot invite member with equal or higher role level.');
      }
      
      if (targetOrgId !== user.organizationId) {
        return createCustomerError('Cannot invite members to other organizations.');
      }
    }
    
    // Generate user ID for invitation
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create pending user
    const result = await db.prepare(`
      INSERT INTO users (id, email, role, organization_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'invited', datetime('now'), datetime('now'))
      RETURNING *
    `).bind(userId, email, role, targetOrgId).first();
    
    // In a real implementation, you would send an invitation email here
    // For now, we'll just return the invitation details
    
    return createSuccessResponse({
      invitation: result,
      message: 'Member invitation created. They will receive an email with signup instructions.'
    });
    
  } catch (error) {
    console.error('Invite member error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('UNIQUE constraint')) {
      return createCustomerError('A user with this email already exists.');
    }
    return createCustomerError('Failed to invite member. Please try again.');
  }
}

async function removeMember(request: Request, db: any, data: any) {
  // Admin permission required
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  if (!hasPermission(user, 'users.delete')) {
    return createCustomerError('Insufficient permissions to remove members.', 403);
  }
  
  try {
    const { user_id, organization_id } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    const targetOrgId = organization_id || user.organizationId;
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ? AND organization_id = ?
    `).bind(user_id, targetOrgId).first();
    
    if (!targetUser) {
      return createCustomerError('User not found in organization.');
    }
    
    // Cannot remove users with equal or higher role
    if (user.role !== 'super_admin' && ROLE_HIERARCHY[targetUser.role as UserRole] >= ROLE_HIERARCHY[user.role]) {
      return createCustomerError('Cannot remove user with equal or higher role level.');
    }
    
    // Soft delete - update status to 'removed'
    await db.prepare(`
      UPDATE users 
      SET status = 'removed', updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `).bind(user_id, targetOrgId).run();
    
    return createSuccessResponse({ user_id }, 'Member removed successfully.');
    
  } catch (error) {
    console.error('Remove member error:', error);
    return createCustomerError('Failed to remove member. Please try again.');
  }
}

async function updateMember(request: Request, db: any, data: any) {
  // Admin permission required
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  
  if (!hasPermission(user, 'users.update')) {
    return createCustomerError('Insufficient permissions to update members.', 403);
  }
  
  try {
    const { user_id, role, status, organization_id } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    const targetOrgId = organization_id || user.organizationId;
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ? AND organization_id = ?
    `).bind(user_id, targetOrgId).first();
    
    if (!targetUser) {
      return createCustomerError('User not found in organization.');
    }
    
    // Validate permissions for role changes
    if (role && user.role !== 'super_admin') {
      if (ROLE_HIERARCHY[role as UserRole] >= ROLE_HIERARCHY[user.role] || 
          ROLE_HIERARCHY[targetUser.role as UserRole] >= ROLE_HIERARCHY[user.role]) {
        return createCustomerError('Insufficient permissions for this role change.');
      }
    }
    
    // Build update query
    let updateFields = [];
    let params = [];
    
    if (role) {
      updateFields.push('role = ?');
      params.push(role);
    }
    
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }
    
    updateFields.push('updated_at = datetime(\'now\')');
    params.push(user_id, targetOrgId);
    
    const result = await db.prepare(`
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND organization_id = ?
      RETURNING *
    `).bind(...params).first();
    
    return createSuccessResponse(result, 'Member updated successfully.');
    
  } catch (error) {
    console.error('Update member error:', error);
    return createCustomerError('Failed to update member. Please try again.');
  }
}

async function deleteOrganization(request: Request, db: any, data: any) {
  // Super admin only
  const authResult = await requireSuperAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  try {
    const { organization_id } = data;
    
    if (!organization_id) {
      return createCustomerError('Organization ID is required.');
    }
    
    // Soft delete - update status
    const result = await db.prepare(`
      UPDATE organizations 
      SET status = 'deleted', updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `).bind(organization_id).first();
    
    if (!result) {
      return createCustomerError('Organization not found.');
    }
    
    // Update all organization members to inactive
    await db.prepare(`
      UPDATE users 
      SET status = 'inactive', updated_at = datetime('now')
      WHERE organization_id = ?
    `).bind(organization_id).run();
    
    return createSuccessResponse(result, 'Organization deleted successfully.');
    
  } catch (error) {
    console.error('Delete organization error:', error);
    return createCustomerError('Failed to delete organization. Please try again.');
  }
}

async function getUsageStats(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  // Users can only access their own organization stats unless super admin
  if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
    return createCustomerError('Access denied to organization usage stats.', 403);
  }
  
  try {
    const usage = await getOrganizationUsage(db, targetOrgId);
    return createSuccessResponse({ usage });
  } catch (error) {
    console.error('Get usage stats error:', error);
    return createCustomerError('Failed to retrieve usage statistics.');
  }
}

async function getBillingInfo(request: Request, db: any, data: any) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const user = authResult;
  const { organization_id } = data;
  const targetOrgId = organization_id || user.organizationId;
  
  // Users can only access their own organization billing unless super admin
  if (user.role !== 'super_admin' && targetOrgId !== user.organizationId) {
    return createCustomerError('Access denied to billing information.', 403);
  }
  
  try {
    const organization = await db.prepare(`
      SELECT id, name, plan_type, status, created_at FROM organizations WHERE id = ?
    `).bind(targetOrgId).first();
    
    if (!organization) {
      return createCustomerError('Organization not found.');
    }
    
    // Mock billing information - in real implementation, integrate with Stripe
    const billingInfo = {
      plan_type: organization.plan_type,
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount_due: getPlanPrice(organization.plan_type),
      payment_method: 'card_****_4242',
      billing_history: [
        {
          date: new Date().toISOString(),
          amount: getPlanPrice(organization.plan_type),
          status: 'paid',
          description: `${organization.plan_type.charAt(0).toUpperCase() + organization.plan_type.slice(1)} Plan - Monthly`
        }
      ]
    };
    
    return createSuccessResponse({ billing: billingInfo });
  } catch (error) {
    console.error('Get billing info error:', error);
    return createCustomerError('Failed to retrieve billing information.');
  }
}

// Helper functions
async function getOrganizationUsage(db: any, organizationId: string) {
  // Get mail accounts count
  const mailAccounts = await db.prepare(`
    SELECT COUNT(*) as count FROM mail_accounts WHERE organization_id = ?
  `).bind(organizationId).first();
  
  // Get SEO sites count
  const seoSites = await db.prepare(`
    SELECT COUNT(*) as count FROM seo_sites WHERE organization_id = ?
  `).bind(organizationId).first();
  
  // Get analytics events count (last 30 days)
  const analyticsEvents = await db.prepare(`
    SELECT COUNT(*) as count FROM analytics_events 
    WHERE organization_id = ? AND created_at > datetime('now', '-30 days')
  `).bind(organizationId).first();
  
  // Get storage usage (estimate based on content)
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
    mail_accounts: mailAccounts.count,
    seo_sites: seoSites.count,
    analytics_events_month: analyticsEvents.count,
    storage_bytes: storageUsage.total_bytes,
    storage_mb: Math.round(storageUsage.total_bytes / (1024 * 1024) * 100) / 100
  };
}

function getPlanPrice(planType: string): number {
  const prices: Record<string, number> = {
    free: 0,
    pro: 19,
    business: 49,
    enterprise: 99
  };
  return prices[planType] || 0;
}
