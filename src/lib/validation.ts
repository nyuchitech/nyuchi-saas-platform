// Input validation and security utilities
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

// Common validations
export const EmailSchema = z.string().email('Invalid email format').max(254);
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').min(1).max(100);
export const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

// User role validation
export const UserRoleSchema = z.enum(['super_admin', 'admin', 'manager', 'user', 'viewer']);
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended']);

// Organization validation
export const OrganizationNameSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid organization name');

export const OrganizationSchema = z.object({
  name: OrganizationNameSchema,
  description: z.string().max(500).optional(),
  plan_type: z.enum(['free', 'pro', 'business', 'enterprise']).default('free')
});

export const OrganizationUpdateSchema = z.object({
  organization_id: z.string().min(1),
  name: OrganizationNameSchema.optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional()
});

// API request validation
export const PaginationSchema = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(50)
});

// Date validation
export const DateStringSchema = z.string().datetime({ offset: true });
export const DateRangeSchema = z.object({
  start_date: DateStringSchema.optional(),
  end_date: DateStringSchema.optional()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, { message: 'Start date must be before end date' });

// =====================================================
// PRODUCT-SPECIFIC SCHEMAS
// =====================================================

// Mail Organizer
export const EmailAccountSchema = z.object({
  email: EmailSchema,
  provider: z.enum(['gmail', 'outlook', 'yahoo', 'imap']),
  account_name: z.string().min(1).max(100).optional()
});

export const EmailCategorySchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid category name'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
  icon: z.string().max(50).default('folder')
});

export const EmailMessageSchema = z.object({
  subject: z.string().max(998), // RFC 5322 limit
  sender: EmailSchema,
  recipient: EmailSchema,
  content: z.string().max(100000), // 100KB limit
  category: z.string().max(50).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

// SEO Manager
export const WordPressSiteSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid URL format').max(255),
  wp_api_key: z.string().max(255).optional(),
  wp_username: z.string().max(100).optional()
});

export const SEOTaskSchema = z.object({
  site_id: z.number().int().positive(),
  task_type: z.enum(['optimize_content', 'bulk_optimize', 'analyze_keywords']),
  content_data: z.record(z.any()).optional()
});

// Analytics Pro
export const AnalyticsEventSchema = z.object({
  event_type: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid event type'),
  event_data: z.record(z.any()).default({}),
  session_id: z.string().max(100).optional(),
  user_agent: z.string().max(500).optional()
});

export const DashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  widgets: z.array(z.record(z.any())).default([]),
  layout: z.enum(['grid', 'list', 'custom']).default('grid')
});

// Travel Platform
export const TravelSubmissionSchema = z.object({
  submitter_name: z.string().min(1).max(100),
  submitter_email: EmailSchema,
  business_name: z.string().min(1).max(200),
  business_type: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  website: z.string().url().max(255).optional(),
  phone: z.string().max(20).optional()
});

// Content Hub
export const ContentItemSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  content_type: z.enum(['post', 'page', 'article', 'video', 'image']),
  platform: z.enum(['wordpress', 'social', 'email', 'website']),
  scheduled_at: DateStringSchema.optional()
});

// Event Widget
export const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  start_time: DateStringSchema,
  end_time: DateStringSchema,
  timezone: z.string().max(50).default('UTC'),
  max_attendees: z.number().int().positive().optional(),
  rsvp_required: z.boolean().default(true)
}).refine(data => {
  return new Date(data.start_time) < new Date(data.end_time);
}, { message: 'Start time must be before end time' });

export const RSVPSchema = z.object({
  event_id: z.number().int().positive(),
  attendee_name: z.string().min(1).max(100),
  attendee_email: EmailSchema,
  status: z.enum(['attending', 'not_attending', 'maybe']).default('attending'),
  notes: z.string().max(500).optional()
});

// =====================================================
// ADMIN SCHEMAS
// =====================================================

export const UserManagementSchema = z.object({
  email: EmailSchema,
  role: UserRoleSchema,
  organization_id: UUIDSchema.optional(),
  permissions: z.array(z.string()).default([])
});

export const UserUpdateSchema = z.object({
  user_id: UUIDSchema,
  email: EmailSchema.optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  permissions: z.array(z.string()).optional()
});

export const RoleAssignmentSchema = z.object({
  user_id: UUIDSchema,
  role: UserRoleSchema
});

export const PermissionAssignmentSchema = z.object({
  user_id: UUIDSchema,
  permissions: z.array(z.string())
});

// =====================================================
// SECURITY UTILITIES
// =====================================================

// Sanitize HTML input to prevent XSS
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize SQL input (for dynamic query building)
export function sanitizeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

// Validate JSON input size
export function validateJsonSize(data: any, maxSizeBytes: number = 1024 * 1024): boolean {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size <= maxSizeBytes;
}

// Rate limiting key generation
export function generateRateLimitKey(userId: string, endpoint: string): string {
  return `rate_limit:${userId}:${endpoint}`;
}

// Secure random string generation
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// IP address validation
export function isValidIpAddress(ip: string): boolean {
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// =====================================================
// VALIDATION MIDDLEWARE
// =====================================================

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (data: unknown): Promise<{ success: true; data: T } | { success: false; error: string }> => {
    try {
      const validated = schema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, error: errorMessages.join(', ') };
      }
      return { success: false, error: 'Invalid input data' };
    }
  };
}

// File upload validation
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: `File extension not allowed` };
    }
  }
  
  return { valid: true };
}

// Content Security Policy headers
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co https://*.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

// Security headers
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...CSP_HEADER
};
