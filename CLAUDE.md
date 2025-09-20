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
npm run dev:frontend   # Marketing site on port 4322 (www.nyuchi.com)
npm run dev:platform   # Customer dashboard on port 4321 (dashboard.nyuchi.com)

# Legacy (still works, runs platform):
npm run dev           # Main development server on port 4321

# Build for production (per service)
npm run build:frontend  # Marketing site build
npm run build:platform  # Customer dashboard build

# Preview production builds
npm run preview
npm run preview:frontend
```

### Database Operations
```bash
# Supabase Operations
npx supabase login     # Login to Supabase
npx supabase start     # Start local Supabase instance
npx supabase stop      # Stop local Supabase
npx supabase status    # Check Supabase status
npx supabase gen types typescript --local > shared/database/types/supabase.ts  # Generate TypeScript types

# Environment setup
bash scripts/setup-env.sh  # Setup environment variables
```

### Deployment

**⚠️ OAuth Authentication Required**: Cloudflare deployments now use OAuth instead of API tokens for full DNS management permissions.

```bash
# First-time setup: OAuth login (opens browser)
npx wrangler login

# Deploy individual services with OAuth
npx wrangler deploy --env production --config ./frontend/wrangler.toml
npx wrangler deploy --env production --config ./platform/wrangler.toml

# Deploy to preview environment
npx wrangler deploy --env preview --config ./frontend/wrangler.toml
npx wrangler deploy --env preview --config ./platform/wrangler.toml

# Local Cloudflare testing
wrangler dev --config ./frontend/wrangler.toml
wrangler dev --config ./platform/wrangler.toml
```

**Domain Configuration**: Workers automatically attach to domains via routes configured in wrangler.toml:
- `www.nyuchi.com/*` → Frontend Worker
- `dashboard.nyuchi.com/*` → Platform Worker

### Linting & Type Checking
```bash
# Linting and type checking
npx eslint .           # Run ESLint
npx tsc --noEmit       # TypeScript type checking
```

## Architecture Overview

### Microservices Architecture (CRITICAL)
The platform uses independent subdomain deployments as separate Cloudflare Workers:

**Frontend Service** (`www.nyuchi.com`):
- Static marketing site with blog
- Runs on port 4322 in dev
- Independent deployment: `frontend/wrangler.toml`
- Build: `npm run build:frontend`
- Deploy: `npx wrangler deploy --config ./frontend/wrangler.toml`

**Platform Service** (`dashboard.nyuchi.com`):
- Customer SaaS products (MailSense, SEO Manager, etc.)
- Runs on port 4321 in dev
- Independent deployment: `platform/wrangler.toml`
- Build: `npm run build:platform`
- Deploy: `npx wrangler deploy --config ./platform/wrangler.toml`

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
- **Unified Access**: All database operations go through `shared/database/` directory
- **D1 Client**: Application data with parameterized queries and organization isolation
- **Supabase Client**: Authentication with RLS policies and JWT verification
- **DatabaseManager**: Singleton pattern for unified database access

### API Structure
All APIs are located in `src/pages/api/` with Astro's file-based routing:
- API endpoints follow standard REST patterns
- Authentication and authorization handled via Supabase
- Input validation and security implemented per endpoint

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication system
- **User Management**: Centralized user profiles and organization management
- **Security**: Role-based access control where implemented
- **Integration**: Seamless integration across all subdomain services

## Development Guidelines

### Environment Setup
1. Copy `env.example` to `.env.local`
2. Never commit real secrets - all template values are safe placeholders
3. Required variables are validated on startup

### Database Development
- Always use the unified `shared/database/` clients - never direct database calls
- D1 queries must use parameterized statements via the D1Client
- Supabase operations should go through the admin client for server-side
- Test database connections with `npm run test:connections`

### Astro Development Patterns
- **File-based Routing**: Pages in `src/pages/` map directly to URLs
- **Subdomain Handling**: Use Astro.url.hostname to detect current subdomain
- **SSR Mode**: Application runs in server-side rendering mode for dynamic content
- **API Routes**: Create API endpoints as `.ts` files in `src/pages/api/`
- **Component Organization**: Shared components in `core/components/`, service-specific in `src/[service]/`

### Security Requirements
- All API routes should implement authentication where required
- Use Supabase Row Level Security (RLS) for database access control
- Validate user inputs and sanitize outputs
- Never expose sensitive data in client-side code
- Use environment variables for all secrets and configuration

## Common Patterns

### API Endpoint Structure
```typescript
// src/pages/api/example.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Get request data
    const body = await request.json();

    // 2. Initialize Supabase client
    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
    }

    // 4. Business logic
    const { data, error } = await supabase
      .from('your_table')
      .insert(body);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }));
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
```

### Database Access Pattern
```typescript
import { db } from '../../shared/database';

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

### Subdomain Detection Pattern
```typescript
// In Astro pages or API routes
const hostname = Astro.url.hostname;
const subdomain = hostname.split('.')[0];

switch (subdomain) {
  case 'dashboard':
    // Dashboard-specific logic
    break;
  case 'admin':
    // Admin-specific logic
    break;
  case 'www':
  case 'nyuchi':
  default:
    // Marketing site logic
    break;
}
```

## Project Structure

### Core Directories
- **`frontend/`** - Marketing site Astro application
  - **`src/pages/`** - Marketing site pages and routing
  - **`src/components/`** - Marketing site components
  - **`wrangler.toml`** - Frontend worker configuration
- **`platform/`** - Customer dashboard Astro application
  - **`src/pages/`** - Dashboard pages and API routes
  - **`src/components/`** - Dashboard components
  - **`wrangler.toml`** - Platform worker configuration
- **`shared/`** - Shared business logic and utilities
  - **`database/`** - Database clients, types, and configuration
  - **`components/`** - Shared UI components
  - **`lib/`** - Utility functions and helpers
- **`scripts/`** - Build and deployment scripts

## Configuration Files

### Key Configuration Files
- **`frontend/astro.config.mjs`** - Frontend Astro configuration
- **`platform/astro.config.mjs`** - Platform Astro configuration
- **`frontend/wrangler.toml`** - Frontend worker configuration
- **`platform/wrangler.toml`** - Platform worker configuration
- **`package.json`** - Root project dependencies and scripts
- **`eslint.config.js`** - ESLint configuration

### Environment Configuration
- **`env.example`** - Environment variable template
- **`.env.local`** - Local environment variables (not committed)
- Environment variables are loaded by Astro/Vite automatically
- Supabase configuration is handled in `core/database/`

## Deployment Architecture

### Microservice Deployment
- Two independent Cloudflare Workers with separate configurations
- Frontend: `nyuchi-frontend-prod` handling www.nyuchi.com
- Platform: `nyuchi-dashboard-prod` handling dashboard.nyuchi.com
- Each service has its own environment configuration
- Independent scaling and resource allocation

### Key Features
- **OAuth Authentication**: Full DNS management permissions
- **Subdomain Routing**: Intelligent routing based on hostname
- **Environment-Specific**: Separate configurations for production and preview
- **Resource Management**: KV, R2, and other Cloudflare resources properly configured