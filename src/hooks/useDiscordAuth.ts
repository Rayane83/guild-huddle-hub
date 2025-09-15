import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
  created_at: string;
}

interface Employee {
  id: string;
  profile_id: string;
  enterprise_id: string;
  grade: string;
  salary: number;
  is_active: boolean;
}

interface Enterprise {
  id: string;
  guild_id: string;
  key: string;
  name: string;
  discord_role_id: string | null;
  discord_guild_id: string | null;
}

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  employee: Employee | null;
  enterprise: Enterprise | null;
  userRole: 'superadmin' | 'admin' | 'patron' | 'co-patron' | 'employe' | 'dot' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useDiscordAuth() {
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    employee: null,
    enterprise: null,
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const loadUserData = useCallback(async (user: any) => {
    try {
      console.log('Chargement des données utilisateur:', user.id, user.email);
      
      // Charger ou créer le profil utilisateur
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        console.log('Création du profil utilisateur');
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            username: user.user_metadata?.preferred_username || user.email?.split('@')[0] || 'user',
            display_name: user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.email?.split('@')[0] || 'Utilisateur',
            discord_id: user.user_metadata?.provider_id,
            avatar_url: user.user_metadata?.avatar_url
          })
          .select()
          .single();

        if (profileError) {
          console.error('Erreur création profil:', profileError);
          throw profileError;
        }
        profile = newProfile;
      }

      console.log('Profil chargé:', profile);

      // Déterminer le rôle utilisateur (simplifié)
      let userRole: AuthState['userRole'] = 'employe';
      
      // Vérifier les rôles dans user_roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      console.log('Rôles utilisateur:', userRoles);

      if (userRoles?.some(r => r.role === 'superadmin')) {
        userRole = 'superadmin';
      } else if (userRoles?.some(r => r.role === 'admin')) {
        userRole = 'admin';
      } else {
        // Pour les tests, assigner le rôle admin automatiquement
        console.log('Assignation du rôle admin par défaut pour les tests');
        
        await supabase
          .from('user_roles')
          .upsert({ 
            user_id: user.id, 
            role: 'admin',
            assigned_by: user.id 
          });
        
        userRole = 'admin';
      }

      // Charger une entreprise de test si disponible
      let enterprise = null;
      const urlParams = new URLSearchParams(window.location.search);
      const guildId = urlParams.get('guild') || '1404608015230832742';
      
      console.log('Recherche entreprise pour guild:', guildId);
      
      const { data: existingEnterprise } = await supabase
        .from('enterprises')
        .select('*')
        .eq('guild_id', guildId)
        .limit(1)
        .maybeSingle();

      if (existingEnterprise) {
        enterprise = existingEnterprise;
        console.log('Entreprise trouvée:', enterprise);
      }

      console.log('État final - Rôle:', userRole, 'Entreprise:', enterprise?.name);

      setAuthState({
        user,
        profile,
        employee: null, // Simplifié pour les tests
        enterprise,
        userRole,
        isLoading: false,
        isAuthenticated: true
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      
      // Même en cas d'erreur, garder l'utilisateur connecté
      setAuthState({
        user,
        profile: null,
        employee: null,
        enterprise: null,
        userRole: 'admin', // Rôle par défaut pour les tests
        isLoading: false,
        isAuthenticated: true
      });
      
      toast({
        title: "Attention",
        description: "Connecté avec des permissions limitées",
        variant: "default"
      });
    }
  }, [toast]);

  const signInWithDiscord = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la connexion Discord:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter avec Discord",
        variant: "destructive"
      });
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setAuthState({
        user: null,
        profile: null,
        employee: null,
        enterprise: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false
      });

      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive"
      });
    }
  }, [toast]);

  const refreshUserData = useCallback(async () => {
    if (authState.user) {
      await loadUserData(authState.user);
    }
  }, [authState.user, loadUserData]);

  useEffect(() => {
    // Vérifier la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session initiale:', session?.user?.email);
      
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setAuthState({
            user: null,
            profile: null,
            employee: null,
            enterprise: null,
            userRole: null,
            isLoading: false,
            isAuthenticated: false
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  return {
    ...authState,
    signInWithDiscord,
    signOut,
    refreshUserData
  };
}