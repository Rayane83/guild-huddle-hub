import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string;
}

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
      // Charger le profil utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        // Créer le profil s'il n'existe pas
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            username: user.user_metadata?.preferred_username || user.email,
            display_name: user.user_metadata?.full_name || user.user_metadata?.preferred_username || user.email,
            discord_id: user.user_metadata?.provider_id,
            avatar_url: user.user_metadata?.avatar_url
          })
          .select()
          .single();

        if (profileError) throw profileError;
        
        setAuthState(prev => ({
          ...prev,
          user,
          profile: newProfile,
          isAuthenticated: true,
          isLoading: false
        }));
        return;
      }

      // Charger l'employé actif
      const { data: employee } = await supabase
        .from('employees')
        .select(`
          *,
          enterprises!inner(*)
        `)
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .single();

      // Déterminer le rôle utilisateur
      let userRole: AuthState['userRole'] = 'employe';

      // Vérifier si superadmin
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (userRoles?.some(r => r.role === 'superadmin')) {
        userRole = 'superadmin';
      } else if (userRoles?.some(r => r.role === 'admin')) {
        userRole = 'admin';
      } else if (employee) {
        const grade = employee.grade.toLowerCase();
        if (grade === 'patron') userRole = 'patron';
        else if (grade === 'co-patron') userRole = 'co-patron';
        else if (grade === 'dot') userRole = 'dot';
        else userRole = 'employe';
      }

      setAuthState({
        user,
        profile,
        employee: employee || null,
        enterprise: employee?.enterprises || null,
        userRole,
        isLoading: false,
        isAuthenticated: true
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false
      }));
    }
  }, []);

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
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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