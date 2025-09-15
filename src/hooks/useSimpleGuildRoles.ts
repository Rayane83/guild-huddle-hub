import { useState, useEffect, useCallback } from 'react';
import { Role } from '@/lib/types';
import { useAuthConsolidated } from './useAuthConsolidated';

export interface SimpleGuildRolesState {
  roles: string[];
  currentRole: Role;
  entreprise: string;
  isLoading: boolean;
  error: string | null;
}

export function useSimpleGuildRoles(guildId: string) {
  const { userRole, isAuthenticated } = useAuthConsolidated();
  const [state, setState] = useState<SimpleGuildRolesState>({
    roles: [],
    currentRole: 'employe',
    entreprise: '',
    isLoading: false,
    error: null,
  });

  const fetchRoles = useCallback(async () => {
    if (!guildId || !isAuthenticated) {
      setState(prev => ({
        ...prev,
        roles: [],
        currentRole: 'employe',
        entreprise: 'Aucune Entreprise',
        isLoading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Pour les superadmins, on leur donne le rôle staff par défaut
      if (userRole === 'superadmin') {
        setState({
          roles: ['Staff'],
          currentRole: 'staff',
          entreprise: 'Administration',
          isLoading: false,
          error: null,
        });
        return;
      }

      // Pour les autres utilisateurs, rôle employé par défaut
      // À terme, ici on peut intégrer avec Discord ou d'autres systèmes
      setState({
        roles: ['Employé'],
        currentRole: 'employe',
        entreprise: 'Entreprise Standard',
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      setState({
        roles: [],
        currentRole: 'employe',
        entreprise: 'Aucune Entreprise',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur lors du chargement des rôles',
      });
    }
  }, [guildId, isAuthenticated, userRole]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refetch = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    ...state,
    refetch,
  };
}