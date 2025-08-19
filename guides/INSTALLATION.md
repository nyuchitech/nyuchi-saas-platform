# Nyuchi Platform Installation Guide

Setting up the FREE Nyuchi Platform with freemium products.

## 📋 Prerequisites

### Development Requirements
- Node.js 18+ and npm 9+
- Supabase CLI
- Git
- Vercel CLI

### Production Requirements
- Vercel account (free tier works)
- Supabase account (free tier works)
- Domain control for nyuchi.com
- GitHub account

## 🚀 Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/nyuchitech/nyuchi-platform.git
cd nyuchi-platform

npm install
npm install -g supabase vercel
```

### 2. Supabase Configuration

#### Create Free Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Create project "nyuchi-platform"
3. Use free tier (sufficient for development)

#### Environment Variables
```bash
cp .env.example .env.local

# Edit .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Platform Configuration
NEXT_PUBLIC_PLATFORM_FREE=true
NEXT_PUBLIC_TRAVEL_FREE=true

# Product Tiers
NEXT_PUBLIC_SEO_FREE_SITES=1
NEXT_PUBLIC_CONTENT_FREE_CHANNELS=3
NEXT_PUBLIC_EVENT_FREE_NOTIFICATIONS=100
```

#### Database Schema
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
supabase db seed
```

The schema includes:
- User management (free accounts)
- Product subscriptions (free/paid tiers)
- Travel platform tables (always free)
- Usage tracking (for tier limits)

### 3. Local Development

```bash
npm run dev

# Access locally:
# Marketing: http://localhost:3000
# Dashboard: http://localhost:3001 (FREE)
# API: http://localhost:54321/functions/v1
```

## 🌐 Production Deployment

### 1. DNS Setup (Only 3 Records)

```
Type    Name        Value                   Purpose
A       www         76.76.21.21            Marketing site
CNAME   dashboard   cname.vercel-dns.com   Free dashboard
CNAME   api         your-project.supabase.co   API endpoint
```

### 2. Deploy Marketing Site

```bash
cd apps/web
vercel --prod

# Environment Variables:
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Nyuchi Platform
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.nyuchi.com
NEXT_PUBLIC_PLATFORM_FREE=true
```

### 3. Deploy Dashboard (Free Access)

```bash
cd apps/dashboard
vercel --prod

# Environment Variables:
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Free Platform Settings
NEXT_PUBLIC_PLATFORM_FREE=true
NEXT_PUBLIC_SIGNUP_FREE=true

# Product Settings
NEXT_PUBLIC_SEO_MANAGER_ENABLED=true
NEXT_PUBLIC_TRAVEL_ENABLED=true
NEXT_PUBLIC_TRAVEL_ALWAYS_FREE=true
NEXT_PUBLIC_CONTENT_HUB_ENABLED=false
NEXT_PUBLIC_EVENT_WIDGET_ENABLED=false

# Free Tier Limits
NEXT_PUBLIC_SEO_FREE_SITES=1
NEXT_PUBLIC_SEO_FREE_UPDATES=10
NEXT_PUBLIC_API_FREE_CALLS=1000

# Payment Integration (Phase 2)
NEXT_PUBLIC_PAYMENT_ENABLED=false
NEXT_PUBLIC_DONATION_URL=https://buymeacoffee.com/bryany
```

### 4. Configure Free Tiers

#### Product Configuration
```typescript
// Product tier configuration
const productTiers = {
  'wordpress-seo-manager': {
    free: {
      sites: 1,
      updates_per_day: 10,
      features: ['basic_seo', 'manual_update'],
      support: 'community'
    },
    starter: {
      price: 29,
      sites: 3,
      updates_per_day: 100,
      features: ['all_free', 'automation', 'api'],
      support: 'email'
    }
  },
  'travel': {
    free: {
      unlimited: true,
      features: ['all'],
      support: 'community'
    }
    // No paid tiers - always free
  }
};
```

### 5. Supabase Edge Functions

```bash
# Deploy functions
supabase functions deploy api-router
supabase functions deploy usage-tracker
supabase functions deploy tier-enforcer
```

#### Usage Tracking Function
```typescript
// Track usage against free tier limits
const trackUsage = async (userId: string, product: string, action: string) => {
  const limits = getFreeTierLimits(product);
  const usage = await getCurrentUsage(userId, product);
  
  if (usage[action] >= limits[action]) {
    return {
      allowed: false,
      message: 'Free tier limit reached. Upgrade to continue.',
      upgradeUrl: `/pricing/${product}`
    };
  }
  
  await incrementUsage(userId, product, action);
  return { allowed: true };
};
```

## 🔧 Free Tier Implementation

### Tier Enforcement
```typescript
// Middleware to check tier limits
export async function checkTierLimit(
  userId: string, 
  product: string, 
  feature: string
) {
  const subscription = await getSubscription(userId, product);
  const tier = subscription?.tier || 'free';
  const limits = productLimits[product][tier];
  
  if (feature === 'basic') return true; // Always allow basic features
  
  if (tier === 'free' && !limits.features.includes(feature)) {
    throw new TierLimitError('Feature not available in free tier');
  }
  
  return true;
}
```

### Travel Platform (Always Free)
```typescript
// No tier checking for travel platform
const travelRoutes = [
  '/travel/*',
  '/api/v1/travel/*'
];

// Skip tier enforcement for travel
if (travelRoutes.some(route => pathname.match(route))) {
  return NextResponse.next();
}
```

## 🚀 Freemium Features

### Free Dashboard Features
```typescript
const freeDashboardFeatures = {
  products: 'Access all products',
  analytics: 'Basic analytics for all products',
  team: 'Invite 2 team members',
  api: '1,000 API calls/day',
  support: 'Community forums',
  storage: '1GB file storage'
};
```

### Product Free Tiers
```javascript
// SEO Manager Free
const seoManagerFree = {
  sites: 1,
  manual_updates: true,
  basic_seo: true,
  keywords: 10,
  reports: 'monthly'
};

// Travel Platform Free (Everything)
const travelPlatformFree = {
  submissions: 'unlimited',
  businesses: 'unlimited',
  api_access: 'rate_limited',
  analytics: 'full',
  features: 'all'
};
```

## 🐛 Troubleshooting

### Free Tier Issues

#### "Limit Reached" Errors
```sql
-- Check user's usage
SELECT * FROM usage_tracking 
WHERE user_id = ? AND product = 'seo-manager'
AND period_start = date_trunc('day', now());

-- Reset daily limits (runs automatically)
UPDATE usage_tracking 
SET count = 0 
WHERE period_type = 'daily' 
AND period_start < date_trunc('day', now());
```

#### Travel Platform Access
```bash
# Travel should never show paid features
# Check environment variable
echo $NEXT_PUBLIC_TRAVEL_ALWAYS_FREE # Should be "true"
```

## 📈 Monitoring Free Users

### Analytics Setup
```javascript
// Track free tier usage patterns
const analytics = {
  track_signups: true,
  track_feature_usage: true,
  track_upgrade_triggers: true,
  track_tier_limits_hit: true
};

// Conversion funnel
const conversionEvents = [
  'free_signup',
  'first_product_use',
  'hit_free_limit',
  'viewed_pricing',
  'started_upgrade',
  'completed_upgrade'
];
```

### Success Metrics
- Free user activation rate
- Free → Paid conversion rate
- Feature usage by tier
- Travel platform engagement
- Community growth rate

## 🎯 Launch Strategy

### Phase 1: Free Platform Launch
1. Enable free signups
2. No payment required
3. All products in free tier
4. Travel platform fully available
5. Community features active

### Phase 2: Premium Features (Month 2)
1. Add payment processing
2. Enable paid tiers
3. Grandfather early users
4. Launch upgrade campaigns
5. Add premium support

## 🔒 Security for Free Users

### Same Security for All
```javascript
// No security compromises for free tier
const securityFeatures = {
  encryption: true, // All tiers
  backups: true, // All tiers
  ssl: true, // All tiers
  privacy: true, // All tiers
  gdpr: true // All tiers
};
```

### **Sponsor Development**
Support ongoing development and new features:
- 💖 [GitHub Sponsors](https://github.com/sponsors/bryanfawcett)
- ☕ [Buy me a coffee](https://buymeacoffee.com/bryany)
- 🏢 [Professional services](https://nyuchi.com)

**📧 Contact:**
- **Website**: [https://nyuchi.com](https://nyuchi.com)
- **GitHub**: [https://github.com/nyuchitech](https://github.com/nyuchitech)
- **Email**: [hello@nyuchi.com](mailto:hello@nyuchi.com)