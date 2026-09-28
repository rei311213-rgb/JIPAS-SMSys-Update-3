import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

// Environment variables configuration
const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

export const SUPABASE_URL = 
  metaEnv.VITE_SUPABASE_URL || 
  procEnv.VITE_SUPABASE_URL || 
  'https://nfzilyxezwuuupqueehb.supabase.co';

export const SUPABASE_ANON_KEY = 
  metaEnv.VITE_SUPABASE_ANON_KEY || 
  procEnv.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5memlseXhlend1dXVwcXVlZWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDg4NzEsImV4cCI6MjEwMzQyNDg3MX0._QivsE1SYdmIc_jBPtNY6wXMLCCBWHLwijzldhs8eqo';

// Initialize Supabase singleton client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== 'undefined',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Promise that resolves once Supabase Auth has completed its initial state check on load.
 */
export async function waitForSupabaseAuthInit(): Promise<SupabaseUser | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Supabase Auth] Session fetch notice:', error.message);
      return null;
    }
    return session?.user || null;
  } catch (err) {
    console.warn('[Supabase Auth] Init error:', err);
    return null;
  }
}

/**
 * Storage helpers for Student Documents, Certificates, and School Assets
 */
export const StorageService = {
  async uploadFile(bucket: string, path: string, file: File | Blob): Promise<{ publicUrl?: string; error?: any }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream'
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { publicUrl: urlData.publicUrl };
    } catch (err: any) {
      console.error(`[Supabase Storage] Error uploading to ${bucket}/${path}:`, err);
      return { error: err.message || err };
    }
  },

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.warn(`[Supabase Storage] Error generating signed URL for ${bucket}/${path}:`, err);
      return null;
    }
  },

  async deleteFile(bucket: string, paths: string[]): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`[Supabase Storage] Error deleting from ${bucket}:`, err);
      return false;
    }
  }
};

export type { SupabaseUser, Session };
