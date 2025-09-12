import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'user' | 'admin' | 'superadmin';

interface Profile {
  id: string;
  user_id: string;
  email?: string;
  unique_id?: string;
  discord_id?: string;
  display_name?: string;
  avatar_url?: string;
  username?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useStandardAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    userRole: 'user',
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase.rpc('get_user_highest_role', { _user_id: userId });
      if (error) {
        console.error('Error fetching user role:', error);
        return 'user';
      }
      return data || 'user';
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return 'user';
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  const updateAuthState = useCallback(async (session: Session | null) => {
    if (session?.user) {
      // Defer role and profile fetching to avoid potential deadlocks
      setTimeout(async () => {
        const [userRole, profile] = await Promise.all([
          fetchUserRole(session.user.id),
          fetchProfile(session.user.id)
        ]);
        
        setState({
          user: session.user,
          session,
          profile,
          userRole,
          isLoading: false,
          isAuthenticated: true,
        });
      }, 0);
      
      // Set immediate state without role/profile
      setState(prev => ({
        ...prev,
        user: session.user,
        session,
        isLoading: false,
        isAuthenticated: true,
      }));
    } else {
      setState({
        user: null,
        session: null,
        profile: null,
        userRole: 'user',
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [fetchUserRole, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        updateAuthState(session);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  const signUp = useCallback(async (email: string, password: string, metadata?: { 
    unique_id?: string; 
    discord_id?: string;
    display_name?: string;
  }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata || {}
      }
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.user) return { error: new Error('Not authenticated') };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', state.user.id)
      .select()
      .single();
      
    if (!error && data) {
      setState(prev => ({ ...prev, profile: data }));
    }
    
    return { data, error };
  }, [state.user]);

  const assignRole = useCallback(async (userId: string, role: UserRole) => {
    if (state.userRole !== 'superadmin') {
      return { error: new Error('Only superadmins can assign roles') };
    }
    
    const { error } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role,
        assigned_by: state.user?.id
      });
      
    return { error };
  }, [state.userRole, state.user?.id]);

  const refreshAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await updateAuthState(session);
  }, [updateAuthState]);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    assignRole,
    refreshAuth,
  };
}