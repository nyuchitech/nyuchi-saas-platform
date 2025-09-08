// Auth middleware functions

import type { AuthSession, User } from './types';
import { getAuthConfig } from './config';

// Check if user is authenticated
export async function requireAuth(request: Request): Promise<AuthSession | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // Validate token and return session
    // Implementation depends on your auth provider
    return null; // Placeholder
  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}

// Check if user has specific role
export function requireRole(session: AuthSession, requiredRole: string): boolean {
  return session.user.role === requiredRole;
}

// Check if user has specific permission
export function requirePermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

// Redirect helper for unauthorized access
export function redirectToLogin(currentPath: string): Response {
  const config = getAuthConfig();
  const loginUrl = new URL(config.redirectUrls.login);
  loginUrl.searchParams.set('redirect', currentPath);
  
  return Response.redirect(loginUrl.toString(), 302);
}
