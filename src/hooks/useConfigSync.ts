import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { configRepo } from '@/lib/configRepo';
import { useAuth } from './useAuth';

/**
 * Hook pour synchroniser automatiquement toutes les données entre sessions
 * Écoute les changements en temps réel via Supabase sur toutes les tables importantes
 */
export function useConfigSync() {
  const { isAuthenticated } = useAuth();

  const syncConfig = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // Force la synchronisation depuis Supabase
      const config = await configRepo.get();
      console.log('🔄 Configuration synchronisée:', { 
        principalGuildId: config.principalGuildId,
        enterpriseCount: Object.keys(config.enterprises || {}).length
      });
      
      // Déclenche un event pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('config-sync', { detail: config }));
    } catch (error) {
      console.error('❌ Erreur de synchronisation config:', error);
    }
  }, [isAuthenticated]);

  const triggerDataRefresh = useCallback((tableName: string) => {
    console.log(`🔄 Données mises à jour dans la table: ${tableName}`);
    // Déclenche un event générique pour rafraîchir toutes les données
    window.dispatchEvent(new CustomEvent('data-sync', { detail: { table: tableName } }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Synchronisation initiale
    syncConfig();

    // Écoute les changements en temps réel sur toutes les tables importantes
    const channel = supabase
      .channel('global-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discord_config'
        },
        () => {
          console.log('Configuration Discord mise à jour');
          syncConfig();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enterprises'
        },
        () => triggerDataRefresh('enterprises')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dotation_reports'
        },
        () => triggerDataRefresh('dotation_reports')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dotation_rows'
        },
        () => triggerDataRefresh('dotation_rows')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'archives'
        },
        () => triggerDataRefresh('archives')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tax_brackets'
        },
        () => triggerDataRefresh('tax_brackets')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blanchiment_rows'
        },
        () => triggerDataRefresh('blanchiment_rows')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_configs'
        },
        () => triggerDataRefresh('company_configs')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grade_rules'
        },  
        () => triggerDataRefresh('grade_rules')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blanchiment_global'
        },
        () => triggerDataRefresh('blanchiment_global')
      )
      .subscribe();

    // Synchronisation périodique toutes les 30 secondes
    const interval = setInterval(() => {
      syncConfig();
      triggerDataRefresh('periodic');
    }, 30000);

    // Synchronisation lors du focus de la fenêtre
    const handleFocus = () => {
      syncConfig();
      triggerDataRefresh('focus');
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, syncConfig, triggerDataRefresh]);

  return { syncConfig, triggerDataRefresh };
}