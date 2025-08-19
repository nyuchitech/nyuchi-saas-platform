#!/bin/bash

# Nyuchi Platform Deployment Script

set -e

echo "🚀 Deploying Nyuchi Platform..."

# Build all applications
echo "🏗️  Building applications..."
npm run build

# Deploy Supabase functions
echo "⚡ Deploying Edge Functions..."
supabase functions deploy api-router
supabase functions deploy seo-analyzer
supabase functions deploy wordpress-sync
supabase functions deploy report-generator

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
cd apps/web && vercel --prod
cd ../dashboard && vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Marketing: https://nyuchi.com"
echo "📊 Dashboard: https://dashboard.nyuchi.com"
