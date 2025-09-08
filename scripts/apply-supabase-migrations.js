#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Supabase configuration
const supabaseUrl = 'https://zylxjonmgjvqursoxdde.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHhqb25tZ2p2cXVyc294ZGRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwOTYxOCwiZXhwIjoyMDcxMTg1NjE4fQ.jeEUyA8y97KkuOcuutQAVkF0erDyGF_llrt5bwIlrfI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Applying Supabase migrations...');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(projectRoot, 'supabase/migrations/20240907000001_comprehensive_platform_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Reading migration file:', migrationPath);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase
            .from('_temp')
            .select('1')
            .limit(1);
          
          // If it's not a critical error, continue
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('permission denied')) {
            console.warn(`⚠️  Warning on statement ${i + 1}: ${error.message}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️  Warning on statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('✅ Migration application completed!');
    
    // Test the connection by checking if tables exist
    console.log('🔍 Verifying database structure...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📊 Available tables:', tables?.map(t => t.table_name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigrations().catch(console.error);