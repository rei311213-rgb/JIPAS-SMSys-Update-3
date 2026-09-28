import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseAuthService, UserProfile } from '../services/supabaseAuthService';
import { SupabaseUser, Session } from '../lib/supabase';

export type AuthState = 
  | 'AUTH_LOADING' 
  | 'AUTHENTICATED' 
  | 'AUTHENTICATED_WITH_PROFILE' 
  | 'UNAUTHENTICATED' 
  | 'AUTH_ERROR';

interface SupabaseAuthContextType {
  authState: AuthState;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('AUTH_LOADING');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessionAndProfile = async () => {
    try {
      setAuthState('AUTH_LOADING');
      const currentSession = await SupabaseAuthService.getCurrentSession();
      setSession(currentSession);

      if (!currentSession || !currentSession.user) {
        setUser(null);
        setProfile(null);
        setAuthState('UNAUTHENTICATED');
        return;
      }

      const currentUser = currentSession.user;
      setUser(currentUser);
      setAuthState('AUTHENTICATED');

      const userProfile = await SupabaseAuthService.fetchProfile(currentUser.id);
      if (userProfile) {
        setProfile(userProfile);
        setAuthState('AUTHENTICATED_WITH_PROFILE');
        
        // Only set initial campus if not already configured in localStorage
        if (typeof localStorage !== 'undefined' && !localStorage.getItem('jipas_active_campus')) {
          if (userProfile && userProfile.campusId) {
            localStorage.setItem('jipas_active_campus', userProfile.campusId);
            localStorage.setItem('jipas_selected_campus', userProfile.campusId);
            window.dispatchEvent(new Event('jipas_campus_changed'));
          }
        }
      } else {
        setAuthState('AUTHENTICATED');
      }
    } catch (err: any) {
      console.error('[SupabaseAuthProvider] Error loading auth session:', err);
      setError(err?.message || 'Failed to authenticate');
      setAuthState('AUTH_ERROR');
    }
  };

  useEffect(() => {
    loadSessionAndProfile();

    const { data: authListener } = SupabaseAuthService.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        setAuthState('AUTHENTICATED');
        const userProfile = await SupabaseAuthService.fetchProfile(newSession.user.id);
        if (userProfile) {
          setProfile(userProfile);
          setAuthState('AUTHENTICATED_WITH_PROFILE');
          
          // Initialize active campus only if none exists yet
          if (typeof localStorage !== 'undefined') {
            const activeCampus = localStorage.getItem('jipas_active_campus');
            if (!activeCampus && userProfile.campusId) {
              localStorage.setItem('jipas_active_campus', userProfile.campusId);
              localStorage.setItem('jipas_selected_campus', userProfile.campusId);
              window.dispatchEvent(new Event('jipas_campus_changed'));
            }
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setAuthState('UNAUTHENTICATED');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState('AUTH_LOADING');
    setError(null);
    const { user: authUser, profile: userProfile, error: authError } = await SupabaseAuthService.signIn(email, pass);

    if (authError || !authUser) {
      setError(authError || 'Authentication failed');
      setAuthState('AUTH_ERROR');
      return { success: false, error: authError || 'Authentication failed' };
    }

    setUser(authUser);
    setProfile(userProfile);
    
    // --- ADDED: Campus State Correction ---
    if (userProfile && typeof localStorage !== 'undefined') {
      const activeCampus = localStorage.getItem('jipas_active_campus');
      if (activeCampus !== userProfile.campusId) {
        localStorage.setItem('jipas_active_campus', userProfile.campusId);
        localStorage.setItem('jipas_selected_campus', userProfile.campusId);
        window.dispatchEvent(new Event('jipas_campus_changed'));
      }
    }
    // --------------------------------------

    const currentSession = await SupabaseAuthService.getCurrentSession();
    setSession(currentSession);
    setAuthState(userProfile ? 'AUTHENTICATED_WITH_PROFILE' : 'AUTHENTICATED');
    return { success: true };
  };

  const handleSignOut = async () => {
    await SupabaseAuthService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setAuthState('UNAUTHENTICATED');
  };

  const refreshAuth = async () => {
    await loadSessionAndProfile();
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        authState,
        user,
        profile,
        session,
        isLoading: authState === 'AUTH_LOADING',
        error,
        signIn,
        signOut: handleSignOut,
        refreshAuth
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
