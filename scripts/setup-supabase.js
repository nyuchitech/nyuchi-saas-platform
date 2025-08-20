#!/usr/bin/env node

/**
 * Supabase Setup and Sync Script
 * Links local project to existing Supabase project and syncs schema
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🟢 Setting up Supabase for Nyuchi SaaS Platform...\n');

// Configuration
const SUPABASE_PROJECT_REF = 'zylxjonmgjvqursoxdde';
const SUPABASE_URL = 'https://zylxjonmgjvqursoxdde.supabase.co';

// Helper function to run commands
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ Success: ${description}`);
    return output;
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

// 1. Check if already logged in
function checkSupabaseLogin() {
  console.log('🔍 Checking Supabase authentication...');
  const result = runCommand('npx supabase projects list', 'Check Supabase login status');
  
  if (result && result.includes(SUPABASE_PROJECT_REF)) {
    console.log('✅ Already logged in and can access project\n');
    return true;
  } else {
    console.log('⚠️  Not logged in or cannot access project');
    console.log('   Please run: npx supabase login\n');
    return false;
  }
}

// 2. Link to existing project
function linkToProject() {
  console.log('🔗 Linking to existing Supabase project...');
  
  // Check if already linked
  if (fs.existsSync('.supabase/config.toml')) {
    console.log('ℹ️  Project already linked to Supabase');
    return true;
  }
  
  const result = runCommand(
    `npx supabase link --project-ref ${SUPABASE_PROJECT_REF}`,
    `Link to project ${SUPABASE_PROJECT_REF}`
  );
  
  return result !== null;
}

// 3. Pull existing schema (if any)
function pullExistingSchema() {
  console.log('📥 Pulling existing database schema...');
  
  const result = runCommand(
    'npx supabase db pull',
    'Pull existing schema from remote database'
  );
  
  if (result) {
    console.log('   Existing schema saved to supabase/migrations/');
  }
  
  return result !== null;
}

// 4. Push local migrations
function pushMigrations() {
  console.log('📤 Pushing local migrations to database...');
  
  // Check if migrations exist
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️  No migrations found to push');
    return true;
  }
  
  const result = runCommand(
    'npx supabase db push',
    'Push local migrations to remote database'
  );
  
  return result !== null;
}

// 5. Generate TypeScript types
function generateTypes() {
  console.log('📝 Generating TypeScript types...');
  
  const result = runCommand(
    'npx supabase gen types typescript --local > database/types/supabase.ts',
    'Generate TypeScript types from database schema'
  );
  
  if (result) {
    console.log('   Types saved to database/types/supabase.ts');
  }
  
  return result !== null;
}

// 6. Create seed data (optional)
function createSeedData() {
  console.log('🌱 Creating seed data...');
  
  const seedPath = path.join(__dirname, '../supabase/seed.sql');
  const seedContent = `
-- Seed data for Nyuchi SaaS Platform

-- Create a default organization
INSERT INTO public.organizations (id, name, slug, description, subscription_plan) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization', 
  'default-org',
  'Default organization for initial setup',
  'free'
) ON CONFLICT (id) DO NOTHING;

-- Create default mail categories
INSERT INTO public.mail_categories (id, organization_id, user_id, name, description, color, is_system)
VALUES 
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', null, 'Important', 'High priority emails', '#EF4444', true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', null, 'Work', 'Work-related emails', '#3B82F6', true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', null, 'Personal', 'Personal emails', '#10B981', true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', null, 'Promotions', 'Marketing and promotional emails', '#F59E0B', true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', null, 'Spam', 'Spam and unwanted emails', '#6B7280', true)
ON CONFLICT DO NOTHING;
`;

  try {
    fs.writeFileSync(seedPath, seedContent);
    console.log('✅ Seed file created at supabase/seed.sql');
    
    // Apply seed data
    const result = runCommand(
      'npx supabase db seed --file supabase/seed.sql',
      'Apply seed data to database'
    );
    
    return result !== null;
  } catch (error) {
    console.log(`❌ Failed to create seed data: ${error.message}`);
    return false;
  }
}

// 7. Test database connection
function testConnection() {
  console.log('🧪 Testing database connection...');
  
  const result = runCommand(
    'npx supabase db inspect --db-url="postgresql://postgres:[password]@db.zylxjonmgjvqursoxdde.supabase.co:5432/postgres"',
    'Test database connection'
  );
  
  if (result) {
    console.log('✅ Database connection successful');
  }
  
  return result !== null;
}

// 8. Show project status
function showProjectStatus() {
  console.log('📊 Project Status:');
  console.log('');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📋 Project Reference: ${SUPABASE_PROJECT_REF}`);
  console.log('');
  
  // Show available commands
  console.log('🎯 Available Commands:');
  console.log('  npx supabase status     - Show local development status');
  console.log('  npx supabase start      - Start local development environment');
  console.log('  npx supabase stop       - Stop local development environment');
  console.log('  npx supabase db diff    - Show database schema differences');
  console.log('  npx supabase db push    - Push local migrations to remote');
  console.log('  npx supabase db pull    - Pull remote schema to local');
  console.log('  npx supabase gen types  - Generate TypeScript types');
  console.log('');
}

// Main execution
async function main() {
  console.log('Starting Supabase setup process...\n');
  
  // Check login status
  const isLoggedIn = checkSupabaseLogin();
  
  if (!isLoggedIn) {
    console.log('❌ Please login to Supabase first:');
    console.log('   npx supabase login');
    console.log('');
    console.log('   Then re-run this script.');
    return;
  }
  
  // Link to project
  const linked = linkToProject();
  if (!linked) {
    console.log('❌ Failed to link to Supabase project');
    return;
  }
  
  // Pull existing schema (optional)
  pullExistingSchema();
  
  // Push our migrations
  const pushed = pushMigrations();
  if (pushed) {
    console.log('✅ Migrations applied successfully');
  }
  
  // Generate TypeScript types
  generateTypes();
  
  // Create seed data
  createSeedData();
  
  // Show final status
  showProjectStatus();
  
  console.log('🎉 Supabase setup completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Check your Supabase dashboard: https://supabase.com/dashboard');
  console.log('2. Verify tables were created correctly');
  console.log('3. Set up Row Level Security policies if needed');
  console.log('4. Test your application authentication');
}

main().catch(console.error);
