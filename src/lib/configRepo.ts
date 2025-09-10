// Centralised repository for Discord configuration
// NOTE: Uses new Supabase structure

import { discordConfigApi } from './newApi';

export type DiscordRoleMap = {
  staff?: string;
  patron?: string;
  coPatron?: string;
};

export type EnterpriseRoleMap = {
  [enterpriseName: string]: {
    roleId?: string; // role in principal guild
    guildId?: string; // enterprise-specific guild id
    employeeRoleId?: string; // employee role in enterprise guild
  };
};

export type DotGuildConfig = {
  guildId?: string;
  roles?: {
    staff?: string;
    dot?: string;
  };
};

export type SuperadminConfig = {
  userIds: string[]; // discord user ids
};

export type DiscordConfig = {
  // App-level identifiers (token/secret should NOT be stored in frontend)
  clientId?: string;
  // clientSecret and botToken must be stored via Supabase Secrets / Edge Function only

  principalGuildId?: string;
  principalRoles?: DiscordRoleMap;
  enterprises?: EnterpriseRoleMap;

  dot?: DotGuildConfig;

  superadmins?: SuperadminConfig;
};

export const configRepo = {
  async get(): Promise<DiscordConfig> {
    try {
      const config = await discordConfigApi.get();
      if (!config) {
        return {};
      }
      
      // Convertir la structure DB vers l'ancienne structure pour compatibilité
      const legacyConfig: DiscordConfig = {
        clientId: config.client_id,
        principalGuildId: config.principal_guild_id,
        ...config.data
      };
      
      return legacyConfig;
    } catch (e) {
      console.warn('configRepo.get error:', e);
      return {};
    }
  },
  
  async save(cfg: DiscordConfig): Promise<void> {
    try {
      // Séparer les propriétés principales des données
      const { clientId, principalGuildId, ...data } = cfg;
      
      await discordConfigApi.update({
        client_id: clientId,
        principal_guild_id: principalGuildId,
        data
      });
    } catch (e) {
      console.warn('configRepo.save error:', e);
      throw e;
    }
  },
};
