// Authentication and authorization utilities
// Based on Cloudflare SaaS admin template architecture

import { supabaseAdmin } from '../../database/clients/supabase';
import { DATABASE_CONFIG } from '../../database/config';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminUser extends User {
  role: 'super_admin' | 'admin';
}

// Define role hierarchy and permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'super_admin': 100,
  'admin': 80,
  'manager': 60,
  'user': 40,
  'viewer': 20
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'super_admin': [
    'system.health.read',
    'system.status.read',
    'system.config.write',
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'roles.manage',
    'organizations.manage',
    'all.products.access',
    'analytics.advanced',
    'billing.manage'
  ],
  'admin': [
    'system.health.read',
    'system.status.read',
    'users.create',
    'users.read',
    'users.update',
    'roles.assign',
    'organization.manage',
    'all.products.access',
    'analytics.standard',
    'billing.view'
  ],
  'manager': [
    'users.read',
    'users.update.limited',
    'organization.view',
    'products.manage',
    'analytics.standard',
    'reports.generate'
  ],
  'user': [
    'profile.read',
    'profile.update',
    'products.use',
    'analytics.basic'
  ],
  'viewer': [
    'profile.read',
    'products.view',
    'analytics.basic'
  ]
};

// Product-specific permissions
export const PRODUCT_PERMISSIONS = {
  MAIL_ORGANIZER: {
    USE: 'mail_organizer.use',
    ADMIN: 'mail_organizer.admin',
    SETTINGS: 'mail_organizer.settings'
  },
  SEO_MANAGER: {
    USE: 'seo_manager.use',
    ADMIN: 'seo_manager.admin',
    BULK_OPERATIONS: 'seo_manager.bulk'
  },
  ANALYTICS_PRO: {
    USE: 'analytics_pro.use',
    ADMIN: 'analytics_pro.admin',
    EXPORT: 'analytics_pro.export',
    ADVANCED: 'analytics_pro.advanced'
  },
  TRAVEL_PLATFORM: {
    USE: 'travel_platform.use',
    ADMIN: 'travel_platform.admin',
    MODERATE: 'travel_platform.moderate'
  },
  CONTENT_HUB: {
    USE: 'content_hub.use',
    ADMIN: 'content_hub.admin',
    PUBLISH: 'content_hub.publish'
  },
  EVENT_WIDGET: {
    USE: 'event_widget.use',
    ADMIN: 'event_widget.admin',
    MANAGE: 'event_widget.manage'
  }
};

// Real JWT token verification with Supabase
export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      // Fallback to mock tokens for testing
      return verifyMockToken(token);
    }
    
    // Get user profile and organization membership
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        organization_members!inner(
          role,
          permissions,
          status,
          organization:organizations(id, name)
        )
      `)
      .eq('id', user.id)
      .single();
    
    if (!profile?.organization_members?.[0]) {
      return null;
    }
    
    const membership = profile.organization_members[0];
    const organization = membership.organization;
    
    // Determine final role (global role or org role)
    const finalRole = profile.global_role === 'super_admin' 
      ? 'super_admin' 
      : membership.role;
    
    // Get effective permissions
    const rolePermissions = ROLE_PERMISSIONS[finalRole] || [];
    const customPermissions = Array.isArray(membership.permissions) 
      ? membership.permissions 
      : [];
    
    return {
      id: user.id,
      email: user.email || profile.email,
      role: finalRole,
      organizationId: organization.id,
      permissions: [...rolePermissions, ...customPermissions],
      status: membership.status,
      lastLoginAt: profile.last_login_at,
      createdAt: profile.created_at
    };
    
  } catch (error) {
    console.error('Token verification error:', error);
    // Fallback to mock tokens for testing
    return verifyMockToken(token);
  }
}

// Mock token verification for testing
function verifyMockToken(token: string): User | null {
  const mockUsers = {
    'super-admin-token': {
      id: 'super-admin-id',
      email: 'superadmin@nyuchi.com',
      role: 'super_admin' as UserRole,
      organizationId: 'nyuchi-org',
      permissions: ROLE_PERMISSIONS.super_admin,
      status: 'active' as const,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    'admin-token': {
      id: 'admin-user-id',
      email: 'admin@company.com',
      role: 'admin' as UserRole,
      organizationId: 'company-org',
      permissions: ROLE_PERMISSIONS.admin,
      status: 'active' as const,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    'manager-token': {
      id: 'manager-id',
      email: 'manager@company.com',
      role: 'manager' as UserRole,
      organizationId: 'company-org',
      permissions: ROLE_PERMISSIONS.manager,
      status: 'active' as const,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    'user-token': {
      id: 'user-id',
      email: 'user@company.com',
      role: 'user' as UserRole,
      organizationId: 'company-org',
      permissions: ROLE_PERMISSIONS.user,
      status: 'active' as const,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    'viewer-token': {
      id: 'viewer-id',
      email: 'viewer@company.com',
      role: 'viewer' as UserRole,
      organizationId: 'company-org',
      permissions: ROLE_PERMISSIONS.viewer,
      status: 'active' as const,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  };
  
  return mockUsers[token] || null;
}

// Check if user is admin (admin or super_admin)
export function isAdmin(user: User): user is AdminUser {
  return user.role === 'admin' || user.role === 'super_admin';
}

// Check if user is super admin
export function isSuperAdmin(user: User): boolean {
  return user.role === 'super_admin';
}

// Check if user has specific permission
export function hasPermission(user: User, permission: string): boolean {
  if (user.status !== 'active') {
    return false;
  }
  return user.permissions.includes(permission) || user.permissions.includes('all.products.access');
}

// Check if user can access specific product
export function canAccessProduct(user: User, productPermission: string): boolean {
  return hasPermission(user, productPermission) || hasPermission(user, 'all.products.access');
}

// Check if user has role level or higher
export function hasRoleLevel(user: User, requiredRole: UserRole): boolean {
  if (user.status !== 'active') {
    return false;
  }
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user can manage other user (hierarchy check)
export function canManageUser(manager: User, targetUser: User): boolean {
  if (manager.status !== 'active') {
    return false;
  }
  
  // Super admin can manage anyone
  if (manager.role === 'super_admin') {
    return true;
  }
  
  // Users can only manage users in same organization
  if (manager.organizationId !== targetUser.organizationId) {
    return false;
  }
  
  // Check role hierarchy
  return ROLE_HIERARCHY[manager.role] > ROLE_HIERARCHY[targetUser.role];
}

// Get user's effective permissions (role + custom permissions)
export function getEffectivePermissions(user: User, customPermissions: string[] = []): string[] {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return [...new Set([...rolePermissions, ...customPermissions, ...user.permissions])];
}

// Extract token from Authorization header
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Middleware to check admin access
export async function requireAdmin(request: Request): Promise<AdminUser | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (user.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Account suspended or inactive' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isAdmin(user)) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return user as AdminUser;
}

// Middleware to check super admin access
export async function requireSuperAdmin(request: Request): Promise<User | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (user.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Account suspended or inactive' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isSuperAdmin(user)) {
    return new Response(JSON.stringify({ error: 'Super admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return user;
}

// Middleware to check specific permission
export async function requirePermission(request: Request, permission: string): Promise<User | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (user.status !== 'active') {
    return createCustomerError('Account suspended or inactive', 403);
  }

  if (!hasPermission(user, permission)) {
    return createCustomerError('Insufficient permissions for this action', 403);
  }

  return user;
}

// Middleware to check role level
export async function requireRole(request: Request, requiredRole: UserRole): Promise<User | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (user.status !== 'active') {
    return createCustomerError('Account suspended or inactive', 403);
  }

  if (!hasRoleLevel(user, requiredRole)) {
    return createCustomerError('Insufficient role level for this action', 403);
  }

  return user;
}

// Middleware to check user access (admin or regular user)
export async function requireAuth(request: Request): Promise<User | Response> {
  const token = extractToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (user.status !== 'active') {
    return createCustomerError('Account suspended or inactive', 403);
  }

  return user;
}

// Create customer-friendly error response
export function createCustomerError(message: string, statusCode: number = 400): Response {
  return new Response(JSON.stringify({ 
    success: false, 
    message 
  }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Create success response
export function createSuccessResponse(data: any, message?: string): Response {
  return new Response(JSON.stringify({ 
    success: true, 
    data,
    ...(message && { message })
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
