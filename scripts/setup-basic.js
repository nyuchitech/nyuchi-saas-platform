#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Use the anon key for basic operations
const supabaseUrl = 'https://zylxjonmgjvqursoxdde.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc294ZGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDk2MTgsImV4cCI6MjA3MTE4NTYxOH0.LZDuNNKUhL_yLB2T9Ln0T2VBjogzx3XQz8-lbuFIl8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('products')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.log('📝 Database needs setup. Error:', error.message);
      
      // Try to check what tables exist
      console.log('📊 Checking existing tables...');
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables');
      
      if (tablesError) {
        console.log('⚠️  Cannot check tables:', tablesError.message);
      } else {
        console.log('📋 Existing tables:', tables);
      }
    } else {
      console.log('✅ Connection successful! Found', data || 0, 'products');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

// Run the test
testConnection().catch(console.error);