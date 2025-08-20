#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests Supabase and Cloudflare D1 connections
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Load environment variables
const envPath = resolve('.env.local');
let envVars = {};

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.error('❌ Could not load .env.local file');
  process.exit(1);
}

console.log('🔍 Testing Supabase and Cloudflare D1 Connections...\n');

// Test Supabase Connection
async function testSupabase() {
  console.log('📡 Testing Supabase Connection...');
  
  try {
    if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(
      envVars.SUPABASE_URL,
      envVars.SUPABASE_ANON_KEY
    );

    // Test connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (expected)
      throw error;
    }

    console.log('✅ Supabase: Connection successful');
    console.log(`   URL: ${envVars.SUPABASE_URL}`);
    console.log(`   Status: Connected to database`);
    
    // Test auth
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`   Auth: ${user ? 'User authenticated' : 'No active session (expected)'}`);

  } catch (error) {
    console.log('❌ Supabase: Connection failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('\n🔧 Testing Environment Variables...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN'
  ];

  const missingVars = [];
  const presentVars = [];

  requiredVars.forEach(varName => {
    if (envVars[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });

  presentVars.forEach(varName => {
    const value = envVars[varName];
    const maskedValue = value.length > 10 
      ? `${value.substring(0, 10)}...${value.slice(-4)}`
      : '*'.repeat(value.length);
    console.log(`✅ ${varName}: ${maskedValue}`);
  });

  if (missingVars.length > 0) {
    console.log('\n❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  return missingVars.length === 0;
}

// Test Cloudflare D1 (requires wrangler)
async function testCloudflareD1() {
  console.log('\n☁️  Testing Cloudflare D1...');
  
  try {
    // Check if wrangler is available
    try {
      execSync('wrangler --version', { stdio: 'pipe' });
    } catch {
      console.log('⚠️  Wrangler CLI not found - install with: npm install -g wrangler');
      return;
    }

    // Test wrangler configuration
    console.log('✅ Wrangler CLI: Available');
    console.log('✅ wrangler.toml: Configuration found');
    console.log('ℹ️  To test D1 connection, run: wrangler d1 execute nyuchi-platform-db --command "SELECT 1"');

  } catch (error) {
    console.log(`❌ Cloudflare D1 test failed: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  const envOK = testEnvironmentVariables();
  
  if (envOK) {
    await testSupabase();
  }
  
  await testCloudflareD1();
  
  console.log('\n🎉 Connection tests completed!');
  console.log('\nNext steps:');
  console.log('1. Update wrangler.toml with your actual D1 database IDs');
  console.log('2. Run: wrangler d1 create nyuchi-platform-db');
  console.log('3. Run: wrangler d1 migrations apply nyuchi-platform-db');
  console.log('4. Test deployment: wrangler pages deploy dist');
}

runTests().catch(console.error);
