#!/usr/bin/env node

/**
 * Database Setup Script for Cloudflare D1 and Supabase
 * Sets up production, staging, and development databases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Nyuchi SaaS Platform Databases...\n');

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

// 1. Check Wrangler Installation
function checkWrangler() {
  console.log('🔍 Checking Wrangler CLI...');
  const version = runCommand('wrangler --version', 'Check Wrangler version');
  if (version) {
    console.log(`   Version: ${version.trim()}\n`);
    return true;
  } else {
    console.log('   Install with: npm install -g wrangler\n');
    return false;
  }
}

// 2. Create D1 Databases
function createD1Databases() {
  console.log('📦 Creating Cloudflare D1 Databases...\n');
  
  const databases = [
    { name: 'nyuchi-platform-prod', env: 'production' },
    { name: 'nyuchi-platform-staging', env: 'staging' },
    { name: 'nyuchi-platform-dev', env: 'development' }
  ];

  databases.forEach(db => {
    const output = runCommand(
      `wrangler d1 create ${db.name}`,
      `Create ${db.env} database: ${db.name}`
    );
    
    if (output) {
      // Extract database ID from output
      const match = output.match(/database_id = "([^"]+)"/);
      if (match) {
        console.log(`   Database ID: ${match[1]}`);
        console.log(`   Add to wrangler.toml [env.${db.env}] section\n`);
      }
    }
  });
}

// 3. Run Database Migrations
function runMigrations() {
  console.log('🔄 Running Database Migrations...\n');
  
  const migrationPath = path.join(__dirname, '../database/migrations/d1');
  
  if (fs.existsSync(migrationPath)) {
    runCommand(
      'wrangler d1 migrations apply nyuchi-platform-dev --local',
      'Apply migrations to development database'
    );
    
    console.log('\nFor production, run:');
    console.log('wrangler d1 migrations apply nyuchi-platform-prod');
    console.log('wrangler d1 migrations apply nyuchi-platform-staging\n');
  } else {
    console.log('⚠️  No D1 migrations found in database/migrations/d1/\n');
  }
}

// 4. Test Database Connections
function testConnections() {
  console.log('🧪 Testing Database Connections...\n');
  
  // Test local D1
  runCommand(
    'wrangler d1 execute nyuchi-platform-dev --local --command "SELECT 1 as test"',
    'Test local D1 database connection'
  );
  
  console.log('\n');
}

// 5. Generate Wrangler Config Update
function generateConfigUpdate() {
  console.log('📝 Generating wrangler.toml updates...\n');
  
  console.log('Add these database bindings to your wrangler.toml:');
  console.log('');
  console.log('# Production');
  console.log('[[env.production.d1_databases]]');
  console.log('binding = "DB"');
  console.log('database_name = "nyuchi-platform-prod"');
  console.log('database_id = "YOUR_PROD_DATABASE_ID"');
  console.log('');
  console.log('# Staging');
  console.log('[[env.staging.d1_databases]]');
  console.log('binding = "DB"');
  console.log('database_name = "nyuchi-platform-staging"');
  console.log('database_id = "YOUR_STAGING_DATABASE_ID"');
  console.log('');
  console.log('# Development');
  console.log('[[env.development.d1_databases]]');
  console.log('binding = "DB"');
  console.log('database_name = "nyuchi-platform-dev"');
  console.log('database_id = "YOUR_DEV_DATABASE_ID"');
  console.log('');
}

// 6. Supabase Setup Instructions
function supabaseInstructions() {
  console.log('🟢 Supabase Setup Instructions:\n');
  
  console.log('1. Create project at https://supabase.com/dashboard');
  console.log('2. Go to Settings > API to get your keys');
  console.log('3. Update your .env.local with:');
  console.log('   SUPABASE_URL=https://your-project.supabase.co');
  console.log('   SUPABASE_ANON_KEY=your-anon-key');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('');
  console.log('4. For production, set secrets with wrangler:');
  console.log('   wrangler secret put SUPABASE_URL');
  console.log('   wrangler secret put SUPABASE_ANON_KEY');
  console.log('   wrangler secret put SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
}

// Main execution
async function main() {
  const hasWrangler = checkWrangler();
  
  if (!hasWrangler) {
    console.log('❌ Wrangler CLI is required. Please install it first.');
    return;
  }
  
  // Ask user what they want to do
  console.log('What would you like to set up?');
  console.log('1. Create D1 databases');
  console.log('2. Run migrations');
  console.log('3. Test connections');
  console.log('4. Show config examples');
  console.log('5. All of the above');
  console.log('');
  
  // For now, just show all information
  createD1Databases();
  runMigrations();
  testConnections();
  generateConfigUpdate();
  supabaseInstructions();
  
  console.log('✨ Database setup completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update wrangler.toml with the database IDs shown above');
  console.log('2. Set up your Supabase project and update environment variables');
  console.log('3. Run: npm run test-connections (from scripts/test-connections.js)');
  console.log('4. Deploy: wrangler pages deploy dist');
}

main().catch(console.error);
