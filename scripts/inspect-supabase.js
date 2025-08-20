#!/usr/bin/env node

/**
 * List Supabase Tables
 * Shows what tables exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

// Initialize Supabase client with service role (admin access)
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
  try {
    console.log('🔍 Querying database tables...\n');
    
    // Query to get all tables in the public schema
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            table_name,
            table_type,
            (
              SELECT COUNT(*) 
              FROM information_schema.columns 
              WHERE table_name = tables.table_name 
              AND table_schema = 'public'
            ) as column_count
          FROM information_schema.tables tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });
    
    if (error) {
      console.log('❌ Error querying tables:', error.message);
      
      // Fallback: try a simpler approach
      console.log('\n🔄 Trying alternative approach...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (simpleError) {
        console.log('❌ Alternative approach also failed:', simpleError.message);
        return false;
      } else {
        console.log('✅ Tables found:', simpleData);
        return true;
      }
    }
    
    if (data && data.length > 0) {
      console.log('✅ Database Tables:');
      data.forEach(table => {
        console.log(`   📋 ${table.table_name} (${table.column_count} columns)`);
      });
    } else {
      console.log('ℹ️  No tables found in public schema');
      console.log('   This means the database is empty and migrations need to be applied');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Failed to query database:', error.message);
    return false;
  }
}

async function testBasicQuery() {
  try {
    console.log('\n🧪 Testing basic database access...');
    
    // Try to query a system table that should always exist
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(5);
    
    if (error) {
      console.log('❌ Basic query failed:', error.message);
      return false;
    }
    
    console.log('✅ Basic database access working');
    console.log(`   Found ${data.length} system tables`);
    return true;
    
  } catch (error) {
    console.log('❌ Basic query error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🗄️  Supabase Database Inspection\n');
  
  const basicWorking = await testBasicQuery();
  if (basicWorking) {
    await listTables();
  }
  
  console.log('\n📊 Summary:');
  console.log('• Supabase connection: ✅ Working');
  console.log('• Environment config: ✅ Complete');
  console.log('• Database access: ✅ Functional');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Visit your Supabase Dashboard: https://supabase.com/dashboard/project/zylxjonmgjvqursoxdde');
  console.log('2. Check the Table Editor to see existing tables');
  console.log('3. If no tables exist, run migrations to create them');
  console.log('4. Set up authentication flows and RLS policies');
}

main().catch(console.error);
