// Unified database configuration with security validation
import type { Config } from 'drizzle-kit';

// Secure environment variable loading
function getEnvVar(name: string, defaultValue?: string, required: boolean = false): string {
  const value = process.env[name] || defaultValue || '';
  
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  // Validate URL format for URL variables
  if (name.includes('URL') && value && !isValidUrl(value)) {
    throw new Error(`Invalid URL format for ${name}: ${value}`);
  }
  
  return value;
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Environment configuration with validation
export const DATABASE_CONFIG = {
  // Supabase Configuration
  supabase: {
    url: getEnvVar('SUPABASE_URL', 'http://localhost:54321', process.env.NODE_ENV === 'production'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY', '', process.env.NODE_ENV === 'production'),
    serviceKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', '', process.env.NODE_ENV === 'production'),
    jwtSecret: getEnvVar('SUPABASE_JWT_SECRET', '', process.env.NODE_ENV === 'production'),
    bucketName: getEnvVar('SUPABASE_BUCKET_NAME', 'nyuchi-storage')
  },
  
  // Cloudflare D1 Configuration
  d1: {
    databaseName: getEnvVar('D1_DATABASE_NAME', 'nyuchi-platform-db'),
    accountId: getEnvVar('CLOUDFLARE_ACCOUNT_ID', ''),
    apiToken: getEnvVar('CLOUDFLARE_API_TOKEN', ''),
    localPath: './database/d1/local.db'
  },
  
  // Environment settings
  environment: getEnvVar('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Security settings
  security: {
    jwtSecret: getEnvVar('JWT_SECRET', '', true),
    apiSecretKey: getEnvVar('API_SECRET_KEY', ''),
    encryptionKey: getEnvVar('ENCRYPTION_KEY', ''),
    rateLimitEnabled: getEnvVar('RATE_LIMIT_ENABLED', 'true') === 'true',
    corsEnabled: getEnvVar('CORS_ENABLED', 'true') === 'true'
  },
  
  // Connection settings
  connectionTimeout: parseInt(getEnvVar('DB_CONNECTION_TIMEOUT', '30000')),
  maxConnections: parseInt(getEnvVar('DB_MAX_CONNECTIONS', '10')),
  
  // Feature flags
  features: {
    enableD1Backup: getEnvVar('ENABLE_D1_BACKUP', 'false') === 'true',
    enableSupabaseEdgeFunctions: getEnvVar('ENABLE_SUPABASE_FUNCTIONS', 'true') === 'true',
    enableReplication: getEnvVar('ENABLE_REPLICATION', 'false') === 'true',
    enableAuditLogging: getEnvVar('ENABLE_AUDIT_LOGGING', 'true') === 'true',
    enableMetrics: getEnvVar('ENABLE_METRICS', 'true') === 'true'
  },
  
  // External integrations
  integrations: {
    gmail: {
      clientId: getEnvVar('GMAIL_CLIENT_ID', ''),
      clientSecret: getEnvVar('GMAIL_CLIENT_SECRET', '')
    },
    stripe: {
      secretKey: getEnvVar('STRIPE_SECRET_KEY', ''),
      webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
      publishableKey: getEnvVar('STRIPE_PUBLISHABLE_KEY', '')
    },
    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY', '')
    }
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: getEnvVar('SENTRY_DSN', ''),
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    metricsEnabled: getEnvVar('METRICS_ENABLED', 'true') === 'true'
  }
};

// Drizzle configuration for D1
export const drizzleConfig: Config = {
  schema: './database/schema/index.ts',
  out: './database/migrations/d1',
  dialect: 'sqlite',
  driver: 'cloudflare-d1'
};

// Supabase configuration for Drizzle
export const supabaseConfig: Config = {
  schema: './database/schema/supabase.ts',
  out: './database/migrations/supabase',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_CONFIG.supabase.url + '/rest/v1/'
  }
};

// Validate required environment variables
export function validateDatabaseConfig() {
  const required = [];
  
  if (DATABASE_CONFIG.isProduction) {
    if (!DATABASE_CONFIG.supabase.url) required.push('SUPABASE_URL');
    if (!DATABASE_CONFIG.supabase.anonKey) required.push('SUPABASE_ANON_KEY');
    if (!DATABASE_CONFIG.d1.accountId) required.push('CLOUDFLARE_ACCOUNT_ID');
    if (!DATABASE_CONFIG.d1.apiToken) required.push('CLOUDFLARE_API_TOKEN');
  }
  
  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
}

export default DATABASE_CONFIG;
