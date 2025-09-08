# Cloudflare Workers Configuration

This directory contains the Cloudflare Workers configuration for the Nyuchi platform.

## Structure

```
cloudflare/
├── .env.shared          # Shared environment variables
└── README.md           # This file
```

## Apps Structure

```
apps/
├── marketing/          # Marketing website worker
│   ├── dist/          # Build output
│   ├── package.json   # App-specific dependencies and scripts
│   └── wrangler.toml  # Worker configuration
├── dashboard/         # Customer dashboard worker
│   ├── dist/          # Build output
│   ├── package.json   # App-specific dependencies and scripts
│   └── wrangler.toml  # Worker configuration
└── admin/             # Admin panel worker
    ├── dist/          # Build output
    ├── package.json   # App-specific dependencies and scripts
    └── wrangler.toml  # Worker configuration
```

## Environment Management

### Shared Variables
Common environment variables are defined in `.env.shared` and should be consistent across all workers.

### Secrets Management
Sensitive data is managed using Wrangler secrets. Set secrets for each worker:

```bash
# Marketing worker secrets
cd apps/marketing
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put MAIL_ORGANIZER_API_KEY

# Dashboard worker secrets  
cd apps/dashboard
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SEO_MANAGER_API_KEY

# Admin worker secrets
cd apps/admin
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put ANALYTICS_PRO_API_KEY
```

## Deployment

### Individual App Deployment
```bash
# Deploy specific app to preview
cd apps/marketing
npm run deploy:preview

# Deploy specific app to production
cd apps/marketing  
npm run deploy:production
```

### Unified Deployment
```bash
# Deploy all apps to preview
npm run deploy:preview

# Deploy all apps to production
npm run deploy:all

# Deploy specific apps
bash scripts/deploy-unified.sh production marketing,dashboard
```

## Environments

### Preview Environment
- Uses `*.nyuchi.workers.dev` domains
- For testing and staging
- Automatically deployed on feature branches

### Production Environment
- Uses custom domains (www.nyuchi.com, dashboard.nyuchi.com, admin.nyuchi.com)
- Deployed manually or via CI/CD
- Requires proper DNS configuration

## Monitoring

Workers can be monitored via:
- Cloudflare Dashboard
- Wrangler CLI: `wrangler tail <worker-name>`
- Built-in observability logs

## Custom Domains

Production workers use custom domains configured in each `wrangler.toml`:

- Marketing: `www.nyuchi.com`, `nyuchi.com`
- Dashboard: `dashboard.nyuchi.com`  
- Admin: `admin.nyuchi.com`

Ensure DNS records point to Cloudflare and the zone ID is correct.
