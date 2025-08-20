# Environment Variables Setup Guide

## 🚀 Quick Setup

1. **Copy the template file:**

   ```bash

   cp env.example .env.local

   ```

2. **Follow the setup sections below to get your API keys**

3. **Update `.env.local` with your actual values**

4. **Test the setup:**

   ```bash

   npm run dev

   ```

## 📋 Required Services Setup

### 🟢 **1. Supabase (Database & Auth)**

**Priority: REQUIRED** - The platform won't work without this.

1. **Create account:** Go to [supabase.com](https://supabase.com)
2. **Create new project:** Choose a region close to your users
3. **Get your keys from Project Settings → API:**

   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

### 🟠 **2. Cloudflare (Hosting & D1 Database)**

**Priority: REQUIRED** - For production deployment.

1. **Create account:** Go to [cloudflare.com](https://dash.cloudflare.com)
2. **Create D1 database:**

   ```bash

   npx wrangler d1 create nyuchi-platform-db

   ```

3. **Get your credentials:**

   - `CLOUDFLARE_API_TOKEN`: Create from "My Profile" → "API Tokens"
   - `CLOUDFLARE_ACCOUNT_ID`: Found in right sidebar of dashboard

### 💳 **3. Payment Providers**

#### **Paynow (Primary - Zimbabwe)**

**Priority: HIGH** - Main payment processor for local market.

1. **Create account:** Go to [paynow.co.zw](https://www.paynow.co.zw)
2. **Get developer access:** Visit [developers.paynow.co.zw](https://developers.paynow.co.zw)
3. **Get your keys:**

   - `PAYNOW_INTEGRATION_ID`: Your integration ID
   - `PAYNOW_INTEGRATION_KEY`: Your integration key

#### **Stripe (Secondary - International)**

**Priority: MEDIUM** - Fallback for international payments.

1. **Create account:** Go to [stripe.com](https://dashboard.stripe.com)
2. **Get your keys from Dashboard:**

   - `STRIPE_SECRET_KEY`: sk_test_... (use test keys initially)
   - `STRIPE_PUBLISHABLE_KEY`: pk_test_...
   - `STRIPE_WEBHOOK_SECRET`: Create webhook endpoint first

## 🛠️ Optional Services

### **Gmail Integration**

For email organization features.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add to Gmail API scope

### **AI Services**

For advanced features.

- **OpenAI:** Get API key from [platform.openai.com](https://platform.openai.com)
- **Anthropic:** Get API key from [console.anthropic.com](https://console.anthropic.com)

## 🔐 Security Configuration

### **JWT Secrets**

Generate secure random strings:

```bash

# Generate JWT secret (32+ characters)

openssl rand -base64 32

# Generate API secret key

openssl rand -hex 32

```text
Add these to your `.env.local`:

```env
JWT_SECRET=your-generated-jwt-secret-here
API_SECRET_KEY=your-generated-api-secret-key-here

```text

## 🏃‍♂️ Development Workflow

### **Minimal Setup (Basic functionality)**

Only set these for basic development:

```env
ENVIRONMENT=development
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-jwt-secret

```text

### **Full Setup (All features)**

Set all variables in the template for complete functionality.

### **Production Setup**

1. **Never commit `.env.local` to git**
2. **Use production keys (not test keys)**
3. **Store secrets in secure environment (GitHub Secrets, etc.)**
4. **Enable all monitoring services**

## 🧪 Testing Your Setup

### **1. Check Environment Loading**

```bash
npm run dev

```text
Look for any missing environment variable errors.

### **2. Test Database Connection**

Visit: `http://localhost:4321/api/admin/health`
Should return database status.

### **3. Test Payment Integration**

Visit: `http://localhost:4321/dashboard/payments`
Should show available payment methods.

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Missing required environment variable" error**

   - Check your `.env.local` file exists
   - Verify variable names match exactly
   - Ensure no extra spaces around `=`

2. **Supabase connection failed**

   - Verify URL format: `https://xxx.supabase.co`
   - Check anon key starts with `eyJ`
   - Ensure project is active (not paused)

3. **Payment methods not showing**

   - Check payment provider credentials
   - Verify webhook URLs are accessible
   - Test with sandbox/test credentials first

4. **Build fails with auth errors**

   - Ensure all required auth variables are set
   - Check JWT secret is long enough (32+ chars)

## 📁 File Structure

```text
├── .env.local              # Your local development env (DO NOT COMMIT)
├── env.example             # Template file (safe to commit)
├── .env.production         # Production env (if needed)
└── wrangler.toml           # Cloudflare configuration

```text

## 🎯 Next Steps

1. Set up the basic required services (Supabase + Cloudflare)
2. Configure payment providers for your market
3. Add optional services as needed
4. Test everything in development
5. Deploy to production with secure secrets

Need help with any specific service setup? Check our detailed guides or ask for assistance!
