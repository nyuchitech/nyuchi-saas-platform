#!/usr/bin/env node

// Simple script to test table creation via HTTP API
const SUPABASE_URL = 'https://zylxjonmgjvqursoxdde.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc284ZGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDk2MTgsImV4cCI6MjA3MTE4NTYxOH0.LZDuNNKUhL_yLB2T9Ln0T2VBjogzx3XQz8-lbuFIl8A';

async function insertSampleData() {
  console.log('🚀 Setting up basic product data...');
  
  try {
    // First, let's see what tables exist by trying to insert into products
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: 'MailSense',
        slug: 'mailsense',
        description: 'AI-powered email management and organization platform',
        status: 'active',
        pricing_model: 'subscription',
        features: ['AI email sorting', 'Smart filters', 'Analytics dashboard'],
        is_active: true
      })
    });

    if (response.ok) {
      console.log('✅ Successfully inserted product data!');
    } else {
      const error = await response.text();
      console.log('📝 Response:', response.status, error);
      
      if (error.includes('relation "public.products" does not exist')) {
        console.log('🔧 Products table needs to be created through Supabase dashboard');
        console.log('📋 Please create the products table manually in the Supabase SQL editor');
      }
    }
    
    // Test reading data
    console.log('🔍 Testing data read...');
    const readResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?limit=5`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    if (readResponse.ok) {
      const data = await readResponse.json();
      console.log('📊 Products found:', data.length);
      if (data.length > 0) {
        console.log('📋 Sample product:', data[0]);
      }
    } else {
      const error = await readResponse.text();
      console.log('⚠️  Read error:', readResponse.status, error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
insertSampleData().catch(console.error);