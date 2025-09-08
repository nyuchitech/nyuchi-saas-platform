# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nyuchi Platform is a microservices-based SaaS ecosystem with independent subdomain deployments. Each subdomain is a separate Cloudflare Worker allowing independent updates and scaling. The platform features MailSense, SEO Manager, Analytics Pro, and other productivity tools with enterprise-grade security.

## Tech Stack & Architecture

- **Frontend**: Astro 4.x with Tailwind CSS
- **Architecture**: Microservices with independent subdomain deployments
- **Deployment**: Separate Cloudflare Workers per subdomain
- **Database**: Dual database architecture:
  - **Supabase**: Centralized authentication and user management
  - **Cloudflare D1**: Service-specific application data
- **Authentication**: Supabase Auth with centralized identity.nyuchi.com
- **Subdomains**: Independent services with separate deployments

## Essential Commands

### Development
```bash
# Microservice Development (separate ports):
npm run dev:marketing   # Marketing site on port 4322 (www.nyuchi.com)
npm run dev:admin      # Admin dashboard on port 4321 (admin.nyuchi.com)
npm run dev:dashboard  # Customer dashboard on port 4323 (dashboard.nyuchi.com)

# Legacy (still works, runs admin):
npm run dev           # Main development server on port 4321

# Build for production (per service)
npm run build:marketing  # Marketing site build
npm run build:admin     # Admin dashboard build
npm run build:dashboard # Customer dashboard build

# Preview production builds
npm run preview
npm run preview:marketing
```

### Database Operations
```bash
# Setup D1 (Application Data)
npm run db:generate      # Generate schemas from migrations
npm run db:migrate       # Apply D1 migrations
npm run db:seed          # Seed D1 with test data

# Setup Supabase (Auth & Profiles)
npm run supabase:start   # Start local Supabase
npm run supabase:migrate # Apply Supabase migrations
npm run supabase:types   # Generate TypeScript types

# Health checks
npm run test:supabase    # Test Supabase connection
npm run test:connections # Test all database connections
```

### Deployment

**⚠️ OAuth Authentication Required**: Cloudflare deployments now use OAuth instead of API tokens for full DNS management permissions.

```bash
# First-time setup: OAuth login (opens browser)
npx wrangler login

# Deploy individual services with OAuth
npx wrangler deploy --env production --config ./workers/marketing/wrangler.toml
npx wrangler deploy --env production --config ./workers/dashboard/wrangler.toml  
npx wrangler deploy --env production --config ./workers/admin/wrangler.toml

# Deploy to preview environment
npx wrangler deploy --env preview --config ./workers/marketing/wrangler.toml
npx wrangler deploy --env preview --config ./workers/dashboard/wrangler.toml
npx wrangler deploy --env preview --config ./workers/admin/wrangler.toml

# Local Cloudflare testing
wrangler dev --config ./workers/marketing/wrangler.toml
wrangler dev --config ./workers/dashboard/wrangler.toml  
wrangler dev --config ./workers/admin/wrangler.toml
```

**Domain Configuration**: Workers automatically attach to domains via routes configured in wrangler.toml:
- `www.nyuchi.com/*` → Marketing Worker
- `dashboard.nyuchi.com/*` → Dashboard Worker  
- `admin.nyuchi.com/*` → Admin Worker

### Linting & Type Checking
The project uses ESLint and TypeScript. Always run these before committing:
```bash
npx eslint . --fix      # Lint and fix issues
npx tsc --noEmit        # Type check without compilation
```

## Architecture Overview

### Microservices Architecture (CRITICAL)
The platform uses independent subdomain deployments as separate Cloudflare Workers:

**Marketing Service** (`www.nyuchi.com`):
- Static marketing site with blog
- Runs on port 4322 in dev
- Independent deployment: `wrangler.toml` (main)
- Build: `npm run build:marketing`
- Deploy: `scripts/deploy-marketing.sh`

**Admin Service** (`admin.nyuchi.com`):
- Internal employee dashboard
- Runs on port 4321 in dev
- Independent deployment: `workers/admin/wrangler.toml`
- Build: `npm run build:admin`
- Deploy: `scripts/deploy-admin.sh`

**Customer Dashboard** (`dashboard.nyuchi.com`):
- Customer SaaS products (MailSense, SEO Manager, etc.)
- Runs on port 4323 in dev
- Independent deployment: `workers/dashboard/wrangler.toml`
- Build: `npm run build:dashboard`  
- Deploy: `scripts/deploy-dashboard.sh`

**Identity Service** (`identity.nyuchi.com`):
- Supabase-managed authentication for all services
- Centralized login, profiles, password management
- No separate deployment (hosted by Supabase)

**Key Benefits:**
- Independent deployments and updates
- Service-specific scaling and optimization
- Isolated failure domains
- Separate databases per service

### Security-First Design
All API endpoints implement enterprise security layers:
1. Rate limiting (per user/IP)
2. Input validation (Zod schemas)
3. JWT authentication verification
4. RBAC permission checks
5. Input sanitization (XSS prevention)
6. Audit logging (admin actions)
7. Error sanitization (no data leaks)

### Database Architecture
- **Unified Access**: All database operations go through `database/` directory
- **D1 Client**: Application data with parameterized queries and organization isolation
- **Supabase Client**: Authentication with RLS policies and JWT verification
- **DatabaseManager**: Singleton pattern for unified database access

### API Structure
All APIs follow `/api/[product]/[...action].ts` pattern with catch-all routing:
- `/api/mailsense/[...action].ts` - MailSense email management
- `/api/analytics-pro/[...action].ts` - Analytics and tracking
- `/api/organizations/[...action].ts` - Organization management
- `/api/admin/[...action].ts` - Admin operations (role-protected)

### Role-Based Access Control (RBAC)
5-tier hierarchy: `super_admin` → `admin` → `manager` → `user` → `viewer`

**Key Auth Functions** (`src/lib/auth.ts`):
- `verifyToken()` - JWT verification with Supabase
- `requireAdmin()` - Admin access middleware
- `requirePermission()` - Permission-based access
- `hasRoleLevel()` - Role hierarchy checks

**Permission System**:
- Granular product permissions (e.g., `MAIL_ORGANIZER.USE`, `SEO_MANAGER.BULK_OPERATIONS`)
- Organization-level isolation
- Admin hierarchy restrictions

### Input Validation
Comprehensive Zod schemas in `src/lib/validation.ts`:
- 30+ validation schemas for all data types
- XSS prevention with `sanitizeHtml()`
- SQL injection prevention with parameterized queries
- File upload validation with size/type restrictions

## Development Guidelines

### Environment Setup
1. Copy `env.example` to `.env.local`
2. Never commit real secrets - all template values are safe placeholders
3. Required variables are validated on startup

### Database Development
- Always use the unified `database/` clients - never direct database calls
- D1 queries must use parameterized statements via the D1Client
- Supabase operations should go through the admin client for server-side
- Test database connections with `npm run test:connections`

### API Development
- All endpoints require authentication and validation
- Use middleware functions from `auth.ts` for access control
- Validate all inputs with Zod schemas from `validation.ts`
- Return consistent error responses with `createCustomerError()`

### Security Requirements
- Never log or expose sensitive data in error messages
- All user inputs must be validated and sanitized
- Use role-based access for all protected resources
- Implement rate limiting for API endpoints
- Follow CSP and security header requirements

### Testing Strategy
- Use mock tokens from `auth.ts` for development testing
- Test with different role levels (super_admin, admin, manager, user, viewer)
- Verify organization isolation in multi-tenant features
- Test database health checks before production deployment

## Common Patterns

### API Endpoint Structure
```typescript
// src/pages/api/[product]/[...action].ts
import { requirePermission, createCustomerError } from '../../../lib/auth';
import { validateRequest } from '../../../lib/validation';
import { db } from '../../../../database';

export async function POST(request: Request) {
  // 1. Extract action from URL
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();
  
  // 2. Verify authentication & permissions
  const user = await requirePermission(request, 'product.permission');
  if (user instanceof Response) return user;
  
  // 3. Validate input
  const body = await request.json();
  const validation = await validateRequest(YourSchema)(body);
  if (!validation.success) {
    return createCustomerError(validation.error);
  }
  
  // 4. Business logic with database
  const result = await db.getD1().prepare('SELECT * FROM table WHERE org_id = ?')
    .bind(user.organizationId)
    .all();
  
  return new Response(JSON.stringify({ success: true, data: result }));
}
```

### Database Access Pattern
```typescript
import { db } from '../../database';

// Get database clients
const d1 = db.getD1();
const supabase = db.getSupabaseAdmin();

// D1 parameterized queries
const result = await d1.prepare('SELECT * FROM emails WHERE user_id = ? AND org_id = ?')
  .bind(userId, organizationId)
  .all();

// Supabase with RLS
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('organization_id', organizationId);
```

## Package Structure

- **packages/mailsense-extension/**: Chrome extension for Gmail integration
- **packages/ui/**: Shared UI components across the platform
- **packages/wordpress-plugin/**: SEO Manager WordPress integration
- **packages/utils/**: Shared utilities and helpers

## Recent Changes & Updates

### Domain Configuration & OAuth Setup (Latest)
- **OAuth Authentication**: Switched from limited API tokens to full OAuth authentication for Cloudflare deployments
- **Domain Attachment**: Workers now automatically attach to custom domains via wrangler.toml routes configuration
- **Zone Management**: Fixed zone_id configuration (049bd85976a3767c9bfa4aaee38fc937) for nyuchi.com domain
- **Centralized Configuration**: Removed duplicate wrangler.toml files and cleaned up project structure
- **Authentication Flow**: Environment-aware authentication redirects for preview vs production domains

### Environment Configuration
```bash
# OAuth Login (required for domain management)
npx wrangler login

# Environment Variables
# - Removed CLOUDFLARE_API_TOKEN from .env.local (uses OAuth now)
# - Supabase configuration centralized in /config/supabase.ts
```

### Domain Setup Status
- ✅ **Workers Deployed**: All three workers deployed with correct routes
- ✅ **OAuth Authentication**: Full permissions for DNS management  
- ✅ **Zone Configuration**: Correct zone_id for nyuchi.com domain
```

## Important Files

- `database/index.ts` - Unified database client and manager
- `src/lib/auth.ts` - Authentication and RBAC system
- `src/lib/validation.ts` - Input validation schemas and security utilities
- `src/lib/security.ts` - Rate limiting and security headers
- `astro.config.mjs` - Cloudflare adapter configuration
- `workers/*/wrangler.toml` - Cloudflare Workers configuration per service
- `turbo.json` - Monorepo build pipeline
- `DOMAIN_SETUP_STATUS.md` - Current domain configuration status and next steps