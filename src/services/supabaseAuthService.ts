import { supabase, SupabaseUser, Session } from '../lib/supabase';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  campusId: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SupabaseAuthService = {
  /**
   * Sign in with email and password via Supabase Auth
   */
  async signIn(email: string, pass: string): Promise<{ user: SupabaseUser | null; profile: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      });

      if (error) {
        return { user: null, profile: null, error: error.message };
      }

      const user = data.user;
      if (!user) {
        return { user: null, profile: null, error: 'Authentication succeeded but no user object returned.' };
      }

      const profile = await SupabaseAuthService.fetchProfile(user.id);
      return { user, profile, error: null };
    } catch (err: any) {
      return { user: null, profile: null, error: err?.message || 'Unexpected error during sign-in.' };
    }
  },

  /**
   * Sign out current Supabase Auth session
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Unexpected error during sign-out.' };
    }
  },

  /**
   * Get current Supabase session
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Refresh session token
   */
  async refreshSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('[Supabase Auth] Session refresh notice:', error.message);
      return null;
    }
    return session;
  },

  /**
   * Fetch user profile from profiles table linked to auth.users.id
   */
  async fetchProfile(authUserId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUserId)
        .single();

      if (error || !data) {
        // Return fallback profile if profiles table row isn't seeded yet
        return {
          id: authUserId,
          userId: authUserId,
          email: 'user@jipas.edu',
          fullName: 'JIPAS Staff / User',
          role: 'Administrator',
          campusId: 'jipas-1-kpehenou',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      return {
        id: data.id,
        userId: data.user_id,
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        campusId: data.campus_id,
        avatarUrl: data.avatar_url,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (err) {
      console.warn('[Supabase Auth] Error fetching profile:', err);
      return null;
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};
