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

/**
 * Hook d'authentification consolidé et sécurisé
 * Remplace les anciens useStandardAuth et useSecureAuth
 * Utilise uniquement l'authentification Supabase standard avec gestion des rôles sécurisée
 */
export function useAuthConsolidated() {
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
        console.error('Erreur lors de la récupération du rôle:', error);
        return 'user';
      }
      return data || 'user';
    } catch (error) {
      console.error('Erreur dans fetchUserRole:', error);
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
        console.error('Erreur lors de la récupération du profil:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Erreur dans fetchProfile:', error);
      return null;
    }
  }, []);

  const updateAuthState = useCallback(async (session: Session | null) => {
    if (session?.user) {
      // Mise à jour immédiate avec les données de base
      setState(prev => ({
        ...prev,
        user: session.user,
        session,
        isLoading: false,
        isAuthenticated: true,
      }));
      
      // Récupération différée des données supplémentaires pour éviter les blocages
      setTimeout(async () => {
        try {
          const [userRole, profile] = await Promise.all([
            fetchUserRole(session.user.id),
            fetchProfile(session.user.id)
          ]);
          
          setState(prev => ({
            ...prev,
            profile,
            userRole,
          }));
        } catch (error) {
          console.error('Erreur lors de la mise à jour des données utilisateur:', error);
        }
      }, 0);
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
    // Configuration de l'écoute des changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Changement d\'état d\'authentification:', event);
        updateAuthState(session);
      }
    );

    // Récupération de la session initiale
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
    if (!state.user) return { error: new Error('Non authentifié') };
    
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
      return { error: new Error('Seuls les superadmins peuvent assigner des rôles') };
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

  const isSuperadmin = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_current_user_superadmin');
      if (error) {
        console.error('Erreur vérification superadmin:', error);
        return false;
      }
      return data || false;
    } catch (error) {
      console.error('Erreur dans isSuperadmin:', error);
      return false;
    }
  }, []);

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
    isSuperadmin,
  };
}