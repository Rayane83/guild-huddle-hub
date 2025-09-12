import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

export interface SecureAuthState {
  user: User | null;
  profile: any | null;
  credentials: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHwidBlocked: boolean;
}

export function useSecureAuth() {
  const [authState, setAuthState] = useState<SecureAuthState>({
    user: null,
    profile: null,
    credentials: null,
    isLoading: true,
    isAuthenticated: false,
    isHwidBlocked: false,
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
        // Récupérer le profil (données publiques)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        // Récupérer les credentials (données sensibles) - seulement pour l'utilisateur actuel
        const { data: credentials, error: credentialsError } = await supabase
          .from('auth_credentials')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError);
        }

        if (credentialsError) {
          console.error('Credentials error:', credentialsError);
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Vérifier le HWID si les credentials existent
        if (credentials) {
          const currentHwid = await getCurrentHwid();
          const { data: hwidCheck } = await supabase.rpc('check_hwid_access_secure', {
            target_hwid: currentHwid,
            target_user_id: session.user.id
          });

          if (hwidCheck && typeof hwidCheck === 'object' && 'allowed' in hwidCheck && !hwidCheck.allowed) {
            setAuthState({
              user: null,
              profile: null,
              credentials: null,
              isLoading: false,
              isAuthenticated: false,
              isHwidBlocked: true,
            });
            
            // Déconnecter l'utilisateur
            await supabase.auth.signOut();
            return;
          }
        }

        const user: User = {
          id: session.user.id,
          name: credentials?.unique_id || profile?.username || 'Utilisateur',
          avatar: profile?.avatar_url,
          discriminator: credentials?.unique_id || '',
        };

        setAuthState({
          user,
          profile,
          credentials,
          isLoading: false,
          isAuthenticated: true,
          isHwidBlocked: false,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          credentials: null,
          isLoading: false,
          isAuthenticated: false,
          isHwidBlocked: false,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        profile: null,
        credentials: null,
        isLoading: false,
        isAuthenticated: false,
        isHwidBlocked: false,
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
      const hwid = await getCurrentHwid();
      
      const { data, error } = await supabase.functions.invoke('custom-auth-secure', {
        body: {
          action: 'login',
          identifier,
          password,
          hwid
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
      const hwid = await getCurrentHwid();
      
      const { data, error } = await supabase.functions.invoke('custom-auth-secure', {
        body: {
          action: 'register',
          ...userData,
          hwid
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

  const resetHwid = useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('reset_hwid_secure', {
        target_user_id: targetUserId
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Reset HWID error:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetHwid,
    refreshAuth: checkAuthStatus,
  };
}

// Fonction utilitaire pour obtenir le HWID actuel (identique à l'ancienne)
async function getCurrentHwid(): Promise<string> {
  try {
    const hwComponents = [];
    
    hwComponents.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}x${devicePixelRatio}`);
    hwComponents.push(`platform:${navigator.platform}`);
    hwComponents.push(`useragent:${navigator.userAgent.slice(0, 50)}`);
    hwComponents.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    hwComponents.push(`lang:${navigator.language}`);
    
    if ('hardwareConcurrency' in navigator) {
      hwComponents.push(`cores:${navigator.hardwareConcurrency}`);
    }
    
    if ('deviceMemory' in navigator) {
      hwComponents.push(`ram:${(navigator as any).deviceMemory}`);
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('HWID-Generator-2024', 2, 2);
      hwComponents.push(`canvas:${canvas.toDataURL().slice(-20)}`);
    }
    
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      if (gl && 'getParameter' in gl) {
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        hwComponents.push(`gpu:${vendor}-${renderer}`.slice(0, 30));
      }
    } catch (e) {
      // Ignorer les erreurs WebGL
    }
    
    hwComponents.push(`offset:${new Date().getTimezoneOffset()}`);
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput').length;
        const videoInputs = devices.filter(d => d.kind === 'videoinput').length;
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput').length;
        hwComponents.push(`media:${audioInputs}a${videoInputs}v${audioOutputs}o`);
      }
    } catch (e) {
      // Permissions pas accordées
    }
    
    const combined = hwComponents.join('|');
    
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hwid = `HWID-${Math.abs(hash).toString(16).toUpperCase()}`;
    
    console.log('Generated HWID:', hwid);
    return hwid;
    
  } catch (error) {
    console.error('Error generating HWID:', error);
    const fallback = `HWID-FALLBACK-${Math.random().toString(16).slice(2).toUpperCase()}`;
    return fallback;
  }
}