import { createClient } from '@supabase/supabase-js';
import { DATABASE_CONFIG } from '../config';

// Supabase client for server-side operations
export const supabaseAdmin = createClient(
  DATABASE_CONFIG.supabase.url,
  DATABASE_CONFIG.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Supabase client for client-side operations
export const supabaseClient = createClient(
  DATABASE_CONFIG.supabase.url,
  DATABASE_CONFIG.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// User management functions
export class SupabaseUserManager {
  static async createUser(email: string, password: string, metadata?: any) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });
    
    if (error) throw error;
    return data.user;
  }
  
  static async updateUser(userId: string, updates: any) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updates
    );
    
    if (error) throw error;
    return data.user;
  }
  
  static async deleteUser(userId: string) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
  
  static async getUserById(userId: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  }
  
  static async listUsers(page = 1, perPage = 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });
    
    if (error) throw error;
    return data;
  }
}

// Authentication functions
export class SupabaseAuth {
  static async signIn(email: string, password: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }
  
  static async signUp(email: string, password: string) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }
  
  static async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }
  
  static async getCurrentUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    return user;
  }
  
  static async verifyToken(token: string) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) throw error;
    return data.user;
  }
}

// Database operations
export class SupabaseDB {
  static async query(table: string, query?: any) {
    let request = supabaseAdmin.from(table).select('*');
    
    if (query) {
      Object.keys(query).forEach(key => {
        request = request.eq(key, query[key]);
      });
    }
    
    const { data, error } = await request;
    if (error) throw error;
    return data;
  }
  
  static async insert(table: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return result;
  }
  
  static async update(table: string, id: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return result;
  }
  
  static async delete(table: string, id: string) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export { supabaseAdmin as default };
