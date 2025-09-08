// Authentication and role management utilities

export type UserRole = 'super-admin' | 'it-admin' | 'data-specialist' | 'contributor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

// Role definitions with permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'super-admin': [
    'admin.users.manage',
    'admin.system.manage',
    'admin.blog.manage',
    'admin.analytics.view',
    'admin.security.manage',
    'admin.database.manage',
    'admin.seo.manage',
    'admin.mailsense.manage',
    'content.read',
    'content.write',
    'content.delete',
    'data.export',
    'data.import'
  ],
  'it-admin': [
    'admin.system.manage',
    'admin.users.view',
    'admin.analytics.view',
    'admin.security.manage',
    'admin.database.manage',
    'admin.seo.manage',
    'content.read',
    'data.export'
  ],
  'data-specialist': [
    'admin.analytics.view',
    'admin.database.view',
    'content.read',
    'data.export',
    'data.import',
    'data.analyze'
  ],
  'contributor': [
    'admin.blog.manage',
    'content.read',
    'content.write',
    'admin.seo.view'
  ],
  'viewer': [
    'content.read',
    'admin.analytics.view'
  ]
};

// Mock user data for development
export const MOCK_USERS: Record<string, User> = {
  'super-admin-token': {
    id: '1',
    email: 'superadmin@nyuchi.com',
    name: 'Super Administrator',
    role: 'super-admin',
    permissions: ROLE_PERMISSIONS['super-admin']
  },
  'it-admin-token': {
    id: '2',
    email: 'itadmin@nyuchi.com',
    name: 'IT Administrator',
    role: 'it-admin',
    permissions: ROLE_PERMISSIONS['it-admin']
  },
  'data-specialist-token': {
    id: '3',
    email: 'data@nyuchi.com',
    name: 'Data Specialist',
    role: 'data-specialist',
    permissions: ROLE_PERMISSIONS['data-specialist']
  },
  'contributor-token': {
    id: '4',
    email: 'contributor@nyuchi.com',
    name: 'Content Contributor',
    role: 'contributor',
    permissions: ROLE_PERMISSIONS['contributor']
  },
  'viewer-token': {
    id: '5',
    email: 'viewer@nyuchi.com',
    name: 'Viewer',
    role: 'viewer',
    permissions: ROLE_PERMISSIONS['viewer']
  }
};

// Get current user from token (mock implementation)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('nyuchi_auth_token');
  if (!token) return null;
  
  return MOCK_USERS[token] || null;
}

// Check if user has permission
export function hasPermission(permission: string, user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;
  
  return currentUser.permissions.includes(permission);
}

// Check if user has role
export function hasRole(role: UserRole, user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;
  
  return currentUser.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(roles: UserRole[], user?: User | null): boolean {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return false;
  
  return roles.includes(currentUser.role);
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    'super-admin': 'Super Administrator',
    'it-admin': 'IT Administrator',
    'data-specialist': 'Data Specialist',
    'contributor': 'Content Contributor',
    'viewer': 'Viewer'
  };
  
  return roleNames[role] || role;
}

// Logout function
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nyuchi_auth_token');
    
    // Use environment-appropriate domain for logout
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isPreview = window.location.hostname.includes('workers.dev');
    
    if (isLocalhost || isPreview) {
      // For development/preview environment, just redirect to home
      window.location.href = '/';
    } else {
      window.location.href = 'https://identity.nyuchi.com/logout';
    }
  }
}