#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zylxjonmgjvqursoxdde.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc294ZGRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwOTYxOCwiZXhwIjoyMDcxMTg1NjE4fQ.jeEUyA8y97KkuOcuutQAVkF0erDyGF_llrt5bwIlrfI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...');
  
  try {
    // Create basic tables using individual queries
    console.log('📝 Creating users table...');
    
    // Create users table (extends auth.users)
    const { error: usersError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT,
          avatar_url TEXT,
          role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin', 'employee', 'support')),
          company_name TEXT,
          phone TEXT,
          timezone TEXT DEFAULT 'UTC',
          locale TEXT DEFAULT 'en',
          is_active BOOLEAN DEFAULT true,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.log('⚠️  Users table might already exist:', usersError.message);
    }

    // Create organizations table
    console.log('📝 Creating organizations table...');
    const { error: orgsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.organizations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          domain TEXT,
          logo_url TEXT,
          plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
          settings JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (orgsError) {
      console.log('⚠️  Organizations table might already exist:', orgsError.message);
    }

    // Create products table
    console.log('📝 Creating products table...');
    const { error: productsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.products (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          logo_url TEXT,
          version TEXT DEFAULT '1.0.0',
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated', 'coming_soon')),
          repository_url TEXT,
          repository_type TEXT CHECK (repository_type IN ('github', 'gitlab', 'bitbucket')),
          branch TEXT DEFAULT 'main',
          deployment_config JSONB DEFAULT '{}',
          environment_variables JSONB DEFAULT '{}',
          api_endpoint TEXT,
          api_key_required BOOLEAN DEFAULT false,
          webhook_url TEXT,
          pricing_model TEXT DEFAULT 'free' CHECK (pricing_model IN ('free', 'subscription', 'usage_based', 'one_time')),
          base_price DECIMAL(10,2) DEFAULT 0,
          currency TEXT DEFAULT 'USD',
          features JSONB DEFAULT '[]',
          integrations JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (productsError) {
      console.log('⚠️  Products table might already exist:', productsError.message);
    }

    // Insert seed data
    console.log('📝 Inserting seed data...');
    
    // Check if products already exist
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (!existingProducts || existingProducts.length === 0) {
      const { error: seedError } = await supabase
        .from('products')
        .insert([
          {
            name: 'MailSense',
            slug: 'mailsense',
            description: 'AI-powered email management and organization platform',
            status: 'active',
            features: ['AI email sorting', 'Smart filters', 'Analytics dashboard'],
            pricing_model: 'subscription'
          },
          {
            name: 'SEO Manager',
            slug: 'seo-manager',
            description: 'Comprehensive SEO analysis and optimization toolkit',
            status: 'active',
            features: ['Keyword research', 'Site audit', 'Rank tracking'],
            pricing_model: 'subscription'
          },
          {
            name: 'Analytics Pro',
            slug: 'analytics-pro',
            description: 'Advanced analytics and reporting platform',
            status: 'active',
            features: ['Real-time analytics', 'Custom reports', 'Data visualization'],
            pricing_model: 'subscription'
          }
        ]);

      if (seedError) {
        console.log('⚠️  Seed data might already exist:', seedError.message);
      } else {
        console.log('✅ Seed data inserted successfully');
      }
    } else {
      console.log('✅ Seed data already exists');
    }

    // Enable RLS
    console.log('📝 Enabling Row Level Security...');
    const rlsTables = ['users', 'organizations', 'products'];
    
    for (const table of rlsTables) {
      const { error: rlsError } = await supabase.rpc('exec', {
        sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (rlsError && !rlsError.message.includes('already enabled')) {
        console.log(`⚠️  RLS might already be enabled on ${table}:`, rlsError.message);
      }
    }

    // Create basic RLS policies
    console.log('📝 Creating RLS policies...');
    
    // Products are publicly readable
    const { error: productPolicyError } = await supabase.rpc('exec', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Products are publicly readable" 
        ON public.products FOR SELECT 
        USING (is_active = true);
      `
    });
    
    if (productPolicyError) {
      console.log('⚠️  Product policy might already exist:', productPolicyError.message);
    }

    console.log('✅ Database setup completed!');
    
    // Verify setup
    console.log('🔍 Verifying database setup...');
    const { data: products, error: verifyError } = await supabase
      .from('products')
      .select('name, slug, status')
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying setup:', verifyError);
    } else {
      console.log('📊 Products in database:', products);
    }
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(console.error);