import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

export interface CustomAuthState {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHwipBlocked: boolean;
}

export function useCustomAuth() {
  const [authState, setAuthState] = useState<CustomAuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isHwipBlocked: false,
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (session?.user) {
        // Récupérer le profil complet de l'utilisateur
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Vérifier le HWIP si disponible
        const currentHwip = await getCurrentHwip();
        const { data: hwipCheck } = await supabase.rpc('check_hwip_access', {
          target_hwip: currentHwip,
          target_profile_id: profile.id
        });

        if (hwipCheck && typeof hwipCheck === 'object' && 'allowed' in hwipCheck && !hwipCheck.allowed) {
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isHwipBlocked: true,
          });
          
          // Déconnecter l'utilisateur
          await supabase.auth.signOut();
          return;
        }

        const user: User = {
          id: session.user.id,
          name: profile.username || profile.unique_id || 'Utilisateur',
          avatar: profile.avatar_url,
          discriminator: profile.discord_id || '',
        };

        setAuthState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isHwipBlocked: false,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isHwipBlocked: false,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        isHwipBlocked: false,
      });
    }
  }, []);

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        await checkAuthStatus();
      }
    );

    // Vérification initiale
    checkAuthStatus();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuthStatus]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    try {
      // Appeler l'edge function d'authentification
      const hwip = await getCurrentHwip();
      
      const { data, error } = await supabase.functions.invoke('custom-auth', {
        body: {
          action: 'login',
          identifier,
          password,
          hwip
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (userData: {
    uniqueId: string;
    discordId: string;
    email: string;
    password: string;
  }) => {
    try {
      const hwip = await getCurrentHwip();
      
      const { data, error } = await supabase.functions.invoke('custom-auth', {
        body: {
          action: 'register',
          ...userData,
          hwip
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const resetHwip = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase.rpc('reset_hwip', {
        target_profile_id: profileId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Reset HWIP error:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetHwip,
    refreshAuth: checkAuthStatus,
  };
}

// Fonction utilitaire pour obtenir le HWIP actuel
async function getCurrentHwip(): Promise<string> {
  // Générer un HWIP basé sur plusieurs facteurs du navigateur
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('HWIP', 10, 50);
  const canvasFingerprint = canvas.toDataURL();
  
  const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const languageFingerprint = navigator.language;
  const platformFingerprint = navigator.platform;
  
  const combined = `${canvasFingerprint}-${screenFingerprint}-${timezoneFingerprint}-${languageFingerprint}-${platformFingerprint}`;
  
  // Hash simple (dans un vrai projet, utilisez une lib crypto)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}