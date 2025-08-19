// Unified database client export
// This follows the Cloudflare SaaS admin template architecture

export * from './config';
export * from './clients/supabase';
export * from './clients/d1';
export * from './schema';

// Re-export database types
export type {
  User,
  NewUser,
  Organization,
  NewOrganization,
  MailAccount,
  NewMailAccount,
  MailMessage,
  NewMailMessage
} from './schema';

// Main database client factory
import { D1Client } from './clients/d1';
import { supabaseAdmin, supabaseClient } from './clients/supabase';
import { DATABASE_CONFIG, validateDatabaseConfig } from './config';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private d1Client: D1Client | null = null;
  
  private constructor() {
    validateDatabaseConfig();
  }
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  // Initialize D1 client with Cloudflare binding
  initializeD1(binding: any): D1Client {
    this.d1Client = D1Client.create(binding);
    return this.d1Client;
  }
  
  // Get D1 client
  getD1(): D1Client {
    if (!this.d1Client) {
      throw new Error('D1 client not initialized. Call initializeD1() first.');
    }
    return this.d1Client;
  }
  
  // Get Supabase admin client
  getSupabaseAdmin() {
    return supabaseAdmin;
  }
  
  // Get Supabase client
  getSupabaseClient() {
    return supabaseClient;
  }
  
  // Health check for both databases
  async healthCheck() {
    const results = {
      d1: { status: 'unknown', latency: 0, error: null },
      supabase: { status: 'unknown', latency: 0, error: null }
    };
    
    // Test D1
    if (this.d1Client) {
      try {
        const startTime = Date.now();
        await this.d1Client.first('SELECT 1');
        results.d1.latency = Date.now() - startTime;
        results.d1.status = 'healthy';
      } catch (error) {
        results.d1.status = 'error';
        results.d1.error = error.message;
      }
    } else {
      results.d1.status = 'not_initialized';
    }
    
    // Test Supabase
    try {
      const startTime = Date.now();
      const { error } = await supabaseAdmin.from('organizations').select('id').limit(1);
      results.supabase.latency = Date.now() - startTime;
      results.supabase.status = error ? 'error' : 'healthy';
      if (error) results.supabase.error = error.message;
    } catch (error) {
      results.supabase.status = 'error';
      results.supabase.error = error.message;
    }
    
    return results;
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Legacy exports for backward compatibility
export { supabaseAdmin, supabaseClient, D1Client };
export * from './clients/supabase';
export * from './clients/d1';
