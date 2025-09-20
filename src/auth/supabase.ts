/**
 * Centralized Supabase Configuration
 * 
 * This file contains all Supabase-related configuration and utilities
 * to avoid duplication across the codebase.
 */

// Supabase connection details
export const SUPABASE_CONFIG = {
  url: 'https://zylxjonmgjvqursoxdde.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc284ZGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDk2MTgsImV4cCI6MjA3MTE4NTYxOH0.LZDuNNKUhL_yLB2T9Ln0T2VBjogzx3XQz8-lbuFIl8A',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc284ZGRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwOTYxOCwiZXhwIjoyMDcxMTg1NjE4fQ.jeEUyA8y97KkuOcuutQAVkF0erDyGF_llrt5bwIlrfI',
} as const;

// Environment-specific overrides
export function getSupabaseConfig(env?: any) {
  return {
    url: env?.SUPABASE_URL || SUPABASE_CONFIG.url,
    anonKey: env?.SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey,
    serviceRoleKey: env?.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_CONFIG.serviceRoleKey,
  };
}

// Wrangler.toml environment variables template
export const WRANGLER_SUPABASE_VARS = {
  SUPABASE_URL: SUPABASE_CONFIG.url,
  SUPABASE_ANON_KEY: SUPABASE_CONFIG.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_CONFIG.serviceRoleKey,
} as const;

// Table names (for consistency)
export const SUPABASE_TABLES = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations', 
  PRODUCTS: 'products',
  SUBSCRIPTIONS: 'subscriptions',
  ANALYTICS: 'analytics_events',
} as const;

// Database schema validation
export function validateSupabaseConfig(config: any) {
  const required = ['url', 'anonKey', 'serviceRoleKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing Supabase configuration: ${missing.join(', ')}`);
  }
  
  if (!config.url.includes('supabase.co')) {
    throw new Error('Invalid Supabase URL format');
  }
  
  return true;
}