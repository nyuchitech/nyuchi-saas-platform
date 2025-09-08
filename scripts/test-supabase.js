#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifies that we can connect to our Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

console.log('🟢 Testing Supabase Connection...\n');

// Initialize Supabase client
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_KEY || env.SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    console.log('📡 Testing basic connection...');
    console.log(`   URL: ${env.SUPABASE_URL}`);
    
    // Test 1: Check if we can connect
    const { data: testData, error: testError } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.log('✅ Connection successful (table not found is expected)');
    } else if (testError) {
      console.log('❌ Connection failed:', testError.message);
      return false;
    } else {
      console.log('✅ Connection successful');
    }
    
    // Test 2: Check authentication
    console.log('\n🔐 Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  No authenticated user (this is normal for initial setup)');
    } else if (user) {
      console.log('✅ User is authenticated:', user.email);
    } else {
      console.log('ℹ️  No active session');
    }
    
    // Test 3: List existing tables
    console.log('\n📋 Checking database schema...');
    
    // This will fail if no tables exist, but that's okay
    const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
      sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    });
    
    if (tableError) {
      console.log('ℹ️  Could not list tables (this might be normal)');
      console.log('   You may need to run migrations to create tables');
    } else {
      console.log('✅ Database accessible, tables:', tableData);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function checkEnvironmentConfig() {
  console.log('\n🔧 Checking environment configuration...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET'
  ];
  
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  present.forEach(varName => {
    const value = env[varName];
    const masked = value.length > 20 
      ? `${value.substring(0, 20)}...${value.slice(-4)}`
      : '*'.repeat(Math.min(value.length, 10));
    console.log(`✅ ${varName}: ${masked}`);
  });
  
  if (missing.length > 0) {
    console.log('\n❌ Missing environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    return false;
  }
  
  return true;
}

async function main() {
  console.log('Starting Supabase connection tests...\n');
  
  // Check environment variables
  const envOK = await checkEnvironmentConfig();
  if (!envOK) {
    console.log('\n❌ Environment configuration incomplete');
    return;
  }
  
  // Test connection
  const connectionOK = await testConnection();
  
  console.log('\n📊 Test Results:');
  console.log(`Environment Config: ${envOK ? '✅ Complete' : '❌ Incomplete'}`);
  console.log(`Database Connection: ${connectionOK ? '✅ Working' : '❌ Failed'}`);
  
  if (envOK && connectionOK) {
    console.log('\n🎉 Supabase is properly configured!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run supabase:push');
    console.log('2. Generate types: npm run supabase:types');
    console.log('3. Test your application');
  } else {
    console.log('\n⚠️  There are issues that need to be resolved.');
  }
}

main().catch(console.error);
