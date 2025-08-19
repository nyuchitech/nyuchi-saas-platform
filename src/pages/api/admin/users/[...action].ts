import type { APIRoute } from 'astro';
import { requireAdmin, requireSuperAdmin, hasPermission, canManageUser, createCustomerError, createSuccessResponse, ROLE_HIERARCHY, type UserRole } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { action } = locals.params;
    const body = await request.json();
    
    // Get D1 database from Cloudflare environment
    const db = locals.runtime?.env?.DB;
    
    if (!db) {
      return createCustomerError('Service temporarily unavailable. Please try again later.', 503);
    }
    
    switch (action) {
      case 'list':
        return await listUsers(request, db, body);
      case 'create':
        return await createUser(request, db, body);
      case 'update':
        return await updateUser(request, db, body);
      case 'suspend':
        return await suspendUser(request, db, body);
      case 'activate':
        return await activateUser(request, db, body);
      case 'assign-role':
        return await assignRole(request, db, body);
      case 'assign-permissions':
        return await assignPermissions(request, db, body);
      case 'delete':
        return await deleteUser(request, db, body);
      default:
        return createCustomerError('Invalid action requested.');
    }
  } catch (error) {
    console.error('User management API error:', error);
    return createCustomerError('Something went wrong. Please try again later.', 500);
  }
};

async function listUsers(request: Request, db: any, data: any) {
  // Admin access required
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  const { organization_id, page = 1, limit = 50, role_filter, status_filter } = data;
  
  try {
    let query = `
      SELECT id, email, role, status, organization_id, last_login_at, created_at
      FROM users 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    // Super admin can see all users, regular admin only their org
    if (admin.role !== 'super_admin') {
      query += ' AND organization_id = ?';
      params.push(admin.organizationId);
    } else if (organization_id) {
      query += ' AND organization_id = ?';
      params.push(organization_id);
    }
    
    if (role_filter) {
      query += ' AND role = ?';
      params.push(role_filter);
    }
    
    if (status_filter) {
      query += ' AND status = ?';
      params.push(status_filter);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const users = await db.prepare(query).bind(...params).all();
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams: any[] = [];
    
    if (admin.role !== 'super_admin') {
      countQuery += ' AND organization_id = ?';
      countParams.push(admin.organizationId);
    } else if (organization_id) {
      countQuery += ' AND organization_id = ?';
      countParams.push(organization_id);
    }
    
    const totalResult = await db.prepare(countQuery).bind(...countParams).first();
    const total = totalResult?.total || 0;
    
    return createSuccessResponse({
      users: users.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Users retrieved successfully.');
    
  } catch (error) {
    console.error('List users error:', error);
    return createCustomerError('Failed to retrieve users. Please try again.');
  }
}

async function createUser(request: Request, db: any, data: any) {
  // Admin access required with user creation permission
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  if (!hasPermission(admin, 'users.create')) {
    return createCustomerError('Insufficient permissions to create users.', 403);
  }
  
  try {
    const { email, role, organization_id, initial_permissions = [] } = data;
    
    if (!email || !role) {
      return createCustomerError('Email and role are required.');
    }
    
    // Validate role hierarchy
    if (admin.role !== 'super_admin') {
      if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[admin.role]) {
        return createCustomerError('Cannot create user with equal or higher role level.');
      }
      
      // Non-super admin can only create users in their org
      if (organization_id && organization_id !== admin.organizationId) {
        return createCustomerError('Cannot create users for other organizations.');
      }
    }
    
    const targetOrgId = organization_id || admin.organizationId;
    
    const result = await db.prepare(`
      INSERT INTO users (email, role, organization_id, status, permissions, created_at)
      VALUES (?, ?, ?, 'active', ?, datetime('now'))
      RETURNING id, email, role, organization_id, status, created_at
    `).bind(email, role, targetOrgId, JSON.stringify(initial_permissions)).first();
    
    return createSuccessResponse(result, 'User created successfully.');
    
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return createCustomerError('A user with this email already exists.');
    }
    return createCustomerError('Failed to create user. Please try again.');
  }
}

async function updateUser(request: Request, db: any, data: any) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  try {
    const { user_id, email, role } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    // Check if admin can manage this user
    if (!canManageUser(admin, targetUser)) {
      return createCustomerError('Insufficient permissions to manage this user.');
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (email && email !== targetUser.email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (role && role !== targetUser.role) {
      // Validate role hierarchy
      if (admin.role !== 'super_admin' && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[admin.role]) {
        return createCustomerError('Cannot assign equal or higher role level.');
      }
      updates.push('role = ?');
      params.push(role);
    }
    
    if (updates.length === 0) {
      return createCustomerError('No changes specified.');
    }
    
    updates.push('updated_at = datetime(\'now\')');
    params.push(user_id);
    
    const result = await db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING id, email, role, organization_id, status, updated_at
    `).bind(...params).first();
    
    return createSuccessResponse(result, 'User updated successfully.');
    
  } catch (error) {
    console.error('Update user error:', error);
    return createCustomerError('Failed to update user. Please try again.');
  }
}

async function suspendUser(request: Request, db: any, data: any) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  try {
    const { user_id, reason } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    if (!canManageUser(admin, targetUser)) {
      return createCustomerError('Insufficient permissions to suspend this user.');
    }
    
    await db.prepare(`
      UPDATE users 
      SET status = 'suspended', suspension_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason || 'Suspended by admin', user_id).run();
    
    return createSuccessResponse({ user_id }, 'User suspended successfully.');
    
  } catch (error) {
    console.error('Suspend user error:', error);
    return createCustomerError('Failed to suspend user. Please try again.');
  }
}

async function activateUser(request: Request, db: any, data: any) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  try {
    const { user_id } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    if (!canManageUser(admin, targetUser)) {
      return createCustomerError('Insufficient permissions to activate this user.');
    }
    
    await db.prepare(`
      UPDATE users 
      SET status = 'active', suspension_reason = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).bind(user_id).run();
    
    return createSuccessResponse({ user_id }, 'User activated successfully.');
    
  } catch (error) {
    console.error('Activate user error:', error);
    return createCustomerError('Failed to activate user. Please try again.');
  }
}

async function assignRole(request: Request, db: any, data: any) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  try {
    const { user_id, role } = data;
    
    if (!user_id || !role) {
      return createCustomerError('User ID and role are required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    if (!canManageUser(admin, targetUser)) {
      return createCustomerError('Insufficient permissions to change this user\'s role.');
    }
    
    // Validate role hierarchy
    if (admin.role !== 'super_admin' && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[admin.role]) {
      return createCustomerError('Cannot assign equal or higher role level.');
    }
    
    await db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(role, user_id).run();
    
    return createSuccessResponse({ user_id, role }, 'Role assigned successfully.');
    
  } catch (error) {
    console.error('Assign role error:', error);
    return createCustomerError('Failed to assign role. Please try again.');
  }
}

async function assignPermissions(request: Request, db: any, data: any) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const admin = authResult;
  
  try {
    const { user_id, permissions } = data;
    
    if (!user_id || !Array.isArray(permissions)) {
      return createCustomerError('User ID and permissions array are required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    if (!canManageUser(admin, targetUser)) {
      return createCustomerError('Insufficient permissions to change this user\'s permissions.');
    }
    
    await db.prepare(`
      UPDATE users 
      SET permissions = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify(permissions), user_id).run();
    
    return createSuccessResponse({ user_id, permissions }, 'Permissions assigned successfully.');
    
  } catch (error) {
    console.error('Assign permissions error:', error);
    return createCustomerError('Failed to assign permissions. Please try again.');
  }
}

async function deleteUser(request: Request, db: any, data: any) {
  // Only super admin can delete users
  const authResult = await requireSuperAdmin(request);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  try {
    const { user_id } = data;
    
    if (!user_id) {
      return createCustomerError('User ID is required.');
    }
    
    // Get target user
    const targetUser = await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (!targetUser) {
      return createCustomerError('User not found.');
    }
    
    // Don't allow deleting super admins
    if (targetUser.role === 'super_admin') {
      return createCustomerError('Cannot delete super admin users.');
    }
    
    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(user_id).run();
    
    return createSuccessResponse({ user_id }, 'User deleted successfully.');
    
  } catch (error) {
    console.error('Delete user error:', error);
    return createCustomerError('Failed to delete user. Please try again.');
  }
}
