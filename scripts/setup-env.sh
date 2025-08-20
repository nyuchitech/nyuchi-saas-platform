#!/bin/bash

# Nyuchi Platform - Environment Setup Script
# This script helps set up the basic environment configuration

set -e

echo "🚀 Setting up Nyuchi Platform environment..."
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Copy template
echo "📋 Copying environment template..."
cp env.example .env.local

# Generate secure secrets
echo "🔐 Generating secure secrets..."

if command -v openssl > /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
    API_SECRET=$(openssl rand -hex 32)
    
    # Update the template with generated secrets
    sed -i.bak "s/your-super-secure-jwt-secret-at-least-32-characters-long/$JWT_SECRET/" .env.local
    sed -i.bak "s/your-api-secret-key/$API_SECRET/" .env.local
    rm -f .env.local.bak
    
    echo "✅ Generated secure JWT and API secrets"
else
    echo "⚠️  OpenSSL not found. You'll need to manually set JWT_SECRET and API_SECRET_KEY"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Edit .env.local and update the placeholder values"
echo "2. Get your Supabase credentials from https://supabase.com"
echo "3. Set up Cloudflare D1 database: npx wrangler d1 create nyuchi-platform-db"
echo "4. Configure payment providers (Paynow, Stripe)"
echo "5. Run: npm run dev"
echo ""
echo "📖 For detailed setup instructions, see: docs/ENVIRONMENT_SETUP.md"
echo ""
echo "✨ Environment template created at .env.local"
