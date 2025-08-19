// Security middleware and utilities
import type { APIRoute } from 'astro';
import { SECURITY_HEADERS, isValidIpAddress } from './validation';

// =====================================================
// RATE LIMITING
// =====================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  constructor(private config: RateLimitConfig) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }
    
    if (entry.count >= this.config.maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  getRemainingRequests(key: string): number {
    const entry = this.requests.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - entry.count);
  }
  
  getResetTime(key: string): number {
    const entry = this.requests.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.config.windowMs;
    }
    return entry.resetTime;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Different rate limiters for different endpoints
export const rateLimiters = {
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }), // 5 auth attempts per 15 minutes
  api: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 API calls per minute
  admin: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 200 }), // 200 admin calls per minute
  upload: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }) // 10 uploads per minute
};

// Clean up rate limiters periodically
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup());
}, 5 * 60 * 1000); // Every 5 minutes

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

export function createSecureAPIRoute(handler: APIRoute, options: {
  rateLimiter?: RateLimiter;
  requireHttps?: boolean;
  maxBodySize?: number;
  allowedMethods?: string[];
} = {}): APIRoute {
  const {
    rateLimiter = rateLimiters.api,
    requireHttps = true,
    maxBodySize = 1024 * 1024, // 1MB
    allowedMethods = ['POST', 'GET', 'PUT', 'DELETE', 'PATCH']
  } = options;

  return async (context) => {
    const { request } = context;
    
    try {
      // Check HTTPS in production
      if (requireHttps && process.env.NODE_ENV === 'production') {
        const url = new URL(request.url);
        if (url.protocol !== 'https:') {
          return new Response('HTTPS required', { 
            status: 403,
            headers: SECURITY_HEADERS
          });
        }
      }
      
      // Validate HTTP method
      if (!allowedMethods.includes(request.method)) {
        return new Response('Method not allowed', { 
          status: 405,
          headers: { 
            ...SECURITY_HEADERS,
            'Allow': allowedMethods.join(', ')
          }
        });
      }
      
      // Get client IP
      const clientIp = getClientIp(request);
      
      // Rate limiting
      if (rateLimiter && !rateLimiter.isAllowed(clientIp)) {
        const resetTime = Math.ceil((rateLimiter.getResetTime(clientIp) - Date.now()) / 1000);
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            'Retry-After': resetTime.toString(),
            'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(clientIp).toString(),
            'X-RateLimit-Reset': rateLimiter.getResetTime(clientIp).toString()
          }
        });
      }
      
      // Check body size for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxBodySize) {
          return new Response('Request entity too large', { 
            status: 413,
            headers: SECURITY_HEADERS
          });
        }
      }
      
      // Call the actual handler
      const response = await handler(context);
      
      // Add security headers to response
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Add rate limit headers
      if (rateLimiter) {
        response.headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(clientIp).toString());
        response.headers.set('X-RateLimit-Reset', rateLimiter.getResetTime(clientIp).toString());
      }
      
      return response;
      
    } catch (error) {
      console.error('Security middleware error:', error);
      return new Response('Internal server error', { 
        status: 500,
        headers: SECURITY_HEADERS
      });
    }
  };
}

// =====================================================
// IP ADDRESS UTILITIES
// =====================================================

export function getClientIp(request: Request): string {
  // Check various headers for the real IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  let ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
  
  // Validate IP address
  if (!isValidIpAddress(ip)) {
    ip = '127.0.0.1';
  }
  
  return ip;
}

export function isPrivateIp(ip: string): boolean {
  // Private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fe80:/
  ];
  
  return privateRanges.some(range => range.test(ip));
}

// =====================================================
// CORS UTILITIES
// =====================================================

export function createCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://nyuchi.com',
    'https://dashboard.nyuchi.com',
    'https://app.nyuchi.com'
  ];
  
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:4321');
  }
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
  
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = 'null';
  }
  
  return corsHeaders;
}

export function handleCorsRequest(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    return new Response(null, {
      status: 200,
      headers: {
        ...createCorsHeaders(origin),
        ...SECURITY_HEADERS
      }
    });
  }
  return null;
}

// =====================================================
// INPUT SANITIZATION
// =====================================================

export function sanitizeUserInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeUserInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize keys (no special characters)
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeUserInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
}

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function extractApiKey(request: Request): string | null {
  return request.headers.get('x-api-key') || 
         request.headers.get('api-key') ||
         new URL(request.url).searchParams.get('api_key');
}

// =====================================================
// AUDIT LOGGING
// =====================================================

export interface AuditLog {
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  clientIp: string;
  userAgent: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export function createAuditLog(request: Request, data: Partial<AuditLog>): AuditLog {
  return {
    action: data.action || 'unknown',
    resource: data.resource || 'unknown',
    clientIp: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    success: data.success ?? false,
    ...data,
    metadata: {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ...data.metadata
    }
  };
}

// =====================================================
// ERROR HANDLING
// =====================================================

export function createSecureErrorResponse(error: Error, statusCode: number = 500): Response {
  // In production, don't expose detailed error messages
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred while processing your request'
    : error.message;
  
  return new Response(JSON.stringify({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS
    }
  });
}

// =====================================================
// WEBHOOK SECURITY
// =====================================================

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const providedSignature = signature.replace(`${algorithm}=`, '');
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

// =====================================================
// FILE UPLOAD SECURITY
// =====================================================

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/json'
  ];
  
  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'csv', 'json'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File extension not allowed' };
  }
  
  return { valid: true };
}
