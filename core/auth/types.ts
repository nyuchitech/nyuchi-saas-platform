// Auth configuration types and constants

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  jwtSecret?: string;
  redirectUrls: {
    login: string;
    logout: string;
    dashboard: string;
    admin: string;
  };
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

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
