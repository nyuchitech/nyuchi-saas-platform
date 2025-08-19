#!/bin/bash

# Nyuchi Platform Setup Script
# Run after repository creation to complete setup

set -e

echo "🚀 Setting up Nyuchi Platform development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "📥 Installing Supabase CLI..."
    npm install -g @supabase/cli
fi

# Setup environment file
if [ ! -f .env.local ]; then
    echo "⚙️  Creating environment file..."
    cp .env.example .env.local
    echo "✅ Created .env.local - Please update with your configuration"
else
    echo "⚙️  Environment file already exists"
fi

# Setup Supabase
echo "🗄️  Setting up Supabase..."
echo "Please run the following commands after updating .env.local:"
echo "  supabase login"
echo "  supabase link --project-ref YOUR_PROJECT_REF"
echo "  supabase db push"

echo ""
echo "🎉 Setup complete! Next steps:"
echo "  1. Update .env.local with your Supabase credentials"
echo "  2. Run 'supabase login' and link your project"
echo "  3. Run 'npm run dev' to start development servers"
echo "  4. Visit http://localhost:3000 (marketing) and http://localhost:3001 (dashboard)"
echo ""
echo "📚 Documentation: https://github.com/nyuchitech/nyuchi-platform"
