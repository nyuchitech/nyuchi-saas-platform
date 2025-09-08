#!/bin/bash

# Nyuchi Platform Deployment Script
# This script builds and deploys the marketing site and admin dashboard

set -e

echo "🚀 Starting Nyuchi Platform deployment..."

# Check if environment is specified
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh [staging|production]"
  echo "Example: ./deploy.sh production"
  exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "❌ Invalid environment. Use 'staging' or 'production'"
  exit 1
fi

echo "📦 Environment: $ENVIRONMENT"

# Check if required tools are installed
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }
command -v wrangler >/dev/null 2>&1 || { echo "❌ wrangler is required but not installed. Run 'npm install -g wrangler'" >&2; exit 1; }

# Install dependencies
echo "📥 Installing dependencies..."
npm ci

# Run tests (if any)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
  echo "🧪 Running tests..."
  npm test
fi

# Build the application
echo "🏗️  Building application..."
npm run build

# Build marketing site separately
echo "🏗️  Building marketing site..."
npm run build:marketing

# Deploy to Cloudflare
echo "☁️  Deploying to Cloudflare ($ENVIRONMENT)..."

if [ "$ENVIRONMENT" = "production" ]; then
  wrangler deploy --env production
  echo "✅ Deployed to production"
  echo "✅ Marketing site: https://www.nyuchi.com"
  echo "✅ Admin dashboard: https://admin.nyuchi.com"
  echo "✅ Blog: https://www.nyuchi.com/blog"
  echo "✅ Identity: https://identity.nyuchi.com"
elif [ "$ENVIRONMENT" = "staging" ]; then
  wrangler deploy --env staging
  echo "✅ Deployed to staging"
  echo "✅ Marketing site: https://staging-www.nyuchi.com"
  echo "✅ Admin dashboard: https://staging-admin.nyuchi.com"
  echo "✅ Blog: https://staging-www.nyuchi.com/blog"
  echo "✅ Identity: https://identity.nyuchi.com"
fi

# Run deployment verification
echo "🔍 Running deployment verification..."

# Check if the main site is accessible
if [ "$ENVIRONMENT" = "production" ]; then
  MARKETING_URL="https://www.nyuchi.com"
  ADMIN_URL="https://admin.nyuchi.com"
else
  MARKETING_URL="https://staging-www.nyuchi.com"
  ADMIN_URL="https://staging-admin.nyuchi.com"
fi

# Simple health checks
if curl -f -s "$MARKETING_URL" > /dev/null; then
  echo "✅ Marketing site is accessible"
else
  echo "⚠️  Warning: Marketing site may not be accessible yet (DNS propagation)"
fi

if curl -f -s "$ADMIN_URL" > /dev/null; then
  echo "✅ Admin dashboard is accessible"
else
  echo "⚠️  Warning: Admin dashboard may not be accessible yet (DNS propagation)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Marketing Site: $MARKETING_URL"
echo "   Admin Dashboard: $ADMIN_URL"
echo "   Blog: $MARKETING_URL/blog"
echo "   Identity/Auth: https://identity.nyuchi.com"
echo ""
echo "🔐 Admin Access Roles:"
echo "   - Super Admin: Full platform access"
echo "   - IT Admin: System management and monitoring"
echo "   - Data Specialist: Analytics and data export"
echo "   - Contributor: Blog and content management"
echo "   - Viewer: Read-only access to analytics"
echo ""
echo "📧 For support: support@nyuchi.com"