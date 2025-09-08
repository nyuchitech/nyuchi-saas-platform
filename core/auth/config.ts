// Centralized auth configuration

import type { AuthConfig } from './types';

// Get environment-specific auth configuration
export function getAuthConfig(): AuthConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL || 'https://zylxjonmgjvqursoxdde.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    redirectUrls: {
      login: `https://${process.env.IDENTITY_DOMAIN || 'identity.nyuchi.com'}`,
      logout: `https://${process.env.MARKETING_DOMAIN || 'www.nyuchi.com'}`,
      dashboard: `https://${process.env.DASHBOARD_DOMAIN || 'dashboard.nyuchi.com'}`,
      admin: `https://${process.env.ADMIN_DOMAIN || 'admin.nyuchi.com'}`,
    },
  };
}

// Domain configuration
export const DOMAINS = {
  marketing: process.env.MARKETING_DOMAIN || 'www.nyuchi.com',
  dashboard: process.env.DASHBOARD_DOMAIN || 'dashboard.nyuchi.com', 
  admin: process.env.ADMIN_DOMAIN || 'admin.nyuchi.com',
  identity: process.env.IDENTITY_DOMAIN || 'identity.nyuchi.com',
} as const;
