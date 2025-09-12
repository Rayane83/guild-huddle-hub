import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

export interface CustomAuthState {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHwidBlocked: boolean;
}

export function useCustomAuth() {
  const [authState, setAuthState] = useState<CustomAuthState>({
    user: null,
    profile: null,
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

        // Vérifier le HWID si disponible
        const currentHwid = await getCurrentHwid();
        const { data: hwidCheck } = await supabase.rpc('check_hwid_access', {
          target_hwid: currentHwid,
          target_profile_id: profile.id
        });

        if (hwidCheck && typeof hwidCheck === 'object' && 'allowed' in hwidCheck && !hwidCheck.allowed) {
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isHwidBlocked: true,
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
          isHwidBlocked: false,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
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
      // Appeler l'edge function d'authentification
      const hwid = await getCurrentHwid();
      
      const { data, error } = await supabase.functions.invoke('custom-auth', {
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
      
      const { data, error } = await supabase.functions.invoke('custom-auth', {
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

  const resetHwid = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase.rpc('reset_hwid', {
        target_profile_id: profileId
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

// Fonction utilitaire pour obtenir le HWID actuel
async function getCurrentHwid(): Promise<string> {
  try {
    // Collecte des informations hardware/système disponibles dans le navigateur
    const hwComponents = [];
    
    // 1. Informations écran (résolution native, densité pixels)
    hwComponents.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}x${devicePixelRatio}`);
    
    // 2. Informations navigateur/OS
    hwComponents.push(`platform:${navigator.platform}`);
    hwComponents.push(`useragent:${navigator.userAgent.slice(0, 50)}`); // Limité pour éviter les variations
    
    // 3. Timezone (stable pour une machine)
    hwComponents.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    
    // 4. Langues système
    hwComponents.push(`lang:${navigator.language}`);
    
    // 5. Informations matérielles disponibles
    if ('hardwareConcurrency' in navigator) {
      hwComponents.push(`cores:${navigator.hardwareConcurrency}`);
    }
    
    // 6. Informations mémoire (si disponible)
    if ('deviceMemory' in navigator) {
      hwComponents.push(`ram:${(navigator as any).deviceMemory}`);
    }
    
    // 7. Canvas fingerprint (stable pour même GPU/drivers)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('HWID-Generator-2024', 2, 2);
      hwComponents.push(`canvas:${canvas.toDataURL().slice(-20)}`); // Derniers 20 chars seulement
    }
    
    // 8. WebGL fingerprint (GPU spécifique)
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
    
    // 9. Fuseau horaire offset (plus stable que Date.now())
    hwComponents.push(`offset:${new Date().getTimezoneOffset()}`);
    
    // 10. Informations MediaDevices (audio/vidéo hardware)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput').length;
        const videoInputs = devices.filter(d => d.kind === 'videoinput').length;
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput').length;
        hwComponents.push(`media:${audioInputs}a${videoInputs}v${audioOutputs}o`);
      }
    } catch (e) {
      // Permissions pas accordées ou pas supportées
    }
    
    // Combiner tous les composants
    const combined = hwComponents.join('|');
    
    // Générer un hash stable
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convertir en hexadécimal avec préfixe pour identifier le type
    const hwid = `HWID-${Math.abs(hash).toString(16).toUpperCase()}`;
    
    console.log('Generated HWID:', hwid);
    return hwid;
    
  } catch (error) {
    console.error('Error generating HWID:', error);
    // Fallback simple si erreur
    const fallback = `HWID-FALLBACK-${Math.random().toString(16).slice(2).toUpperCase()}`;
    return fallback;
  }
}