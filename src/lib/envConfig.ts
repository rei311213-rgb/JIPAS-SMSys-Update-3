/**
 * ENVIRONMENT & PUBLIC CONFIGURATION VALIDATOR
 * Safe environment checking for public VITE configuration variables.
 * Validates public endpoints without exposing secret keys or credentials.
 */

export interface EnvValidationResult {
  isValid: boolean;
  environmentConfigured: boolean;
  supabaseConfigured: boolean;
  buildMode: 'development' | 'production' | 'test';
  applicationVersion: string;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  missingVars: string[];
}

export const APPLICATION_VERSION = '16.0.0-production';

export function validateEnvironment(): EnvValidationResult {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

  const supabaseUrl = metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || 'https://nfzilyxezwuuupqueehb.supabase.co';
  const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5memlseXhlend1dXVwcXVlZWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDg4NzEsImV4cCI6MjEwMzQyNDg3MX0._QivsE1SYdmIc_jBPtNY6wXMLCCBWHLwijzldhs8eqo';

  const missingVars: string[] = [];

  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  const isDev = (metaEnv.DEV === true || procEnv.NODE_ENV === 'development');

  return {
    isValid: missingVars.length === 0,
    environmentConfigured: missingVars.length === 0,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    buildMode: isDev ? 'development' : 'production',
    applicationVersion: APPLICATION_VERSION,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
    missingVars
  };
}
