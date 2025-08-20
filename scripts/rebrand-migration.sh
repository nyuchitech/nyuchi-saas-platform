#!/bin/bash

# MailSense Rebrand - Database Migration Script
# Run this script after completing the code changes

echo "🔄 Starting MailSense rebrand database migration..."

# D1 Database Migration
echo "📦 Migrating D1 database..."
npx wrangler d1 execute nyuchi-d1 --file=./database/migrations/d1/002_mailsense_rebrand.sql

# Supabase Database Migration  
echo "🗄️ Migrating Supabase database..."
# Uncomment and configure based on your Supabase setup
# npx supabase db push --file ./database/migrations/supabase/002_mailsense_rebrand.sql

echo "✅ Database migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the extension in Chrome"
echo "2. Verify API endpoints work at /api/mailsense/"  
echo "3. Check dashboard at /dashboard/mailsense"
echo "4. Update Chrome Web Store listing"
echo ""
echo "🎉 MailSense rebrand Phase 1 complete!"
