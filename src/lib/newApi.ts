// Nouvelles API utilisant Supabase avec la structure DB simplifiée

import { supabase } from '@/integrations/supabase/client';
import type { 
  NewGuild as Guild, 
  Enterprise, 
  PayrollReport, 
  PayrollEntry, 
  Employee,
  Profile,
  DiscordConfig 
} from './types';

/**
 * API pour les Guildes
 */
export const guildsApi = {
  async getAll(): Promise<Guild[]> {
    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Guild | null> {
    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByDiscordId(discordId: string): Promise<Guild | null> {
    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(guild: Omit<Guild, 'id' | 'created_at' | 'updated_at'>): Promise<Guild> {
    const { data, error } = await supabase
      .from('guilds')
      .insert(guild)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Guild>): Promise<Guild> {
    const { data, error } = await supabase
      .from('guilds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour les Entreprises
 */
export const enterprisesApi = {
  async getByGuild(guildId: string): Promise<Enterprise[]> {
    const { data, error } = await supabase
      .from('enterprises')
      .select('*')
      .eq('guild_id', guildId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Enterprise | null> {
    const { data, error } = await supabase
      .from('enterprises')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByKey(guildId: string, key: string): Promise<Enterprise | null> {
    const { data, error } = await supabase
      .from('enterprises')
      .select('*')
      .eq('guild_id', guildId)
      .eq('key', key)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(enterprise: Omit<Enterprise, 'id' | 'created_at' | 'updated_at'>): Promise<Enterprise> {
    const { data, error } = await supabase
      .from('enterprises')
      .insert(enterprise)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Enterprise>): Promise<Enterprise> {
    const { data, error } = await supabase
      .from('enterprises')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour les Employés
 */
export const employeesApi = {
  async getByEnterprise(enterpriseId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('created_at');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour les Rapports de Paie
 */
export const payrollReportsApi = {
  async getByEnterprise(enterpriseId: string, limit = 10): Promise<PayrollReport[]> {
    const { data, error } = await supabase
      .from('payroll_reports')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async getLatest(enterpriseId: string): Promise<PayrollReport | null> {
    const { data, error } = await supabase
      .from('payroll_reports')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<PayrollReport | null> {
    const { data, error } = await supabase
      .from('payroll_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(report: Omit<PayrollReport, 'id' | 'created_at' | 'updated_at'>): Promise<PayrollReport> {
    const { data, error } = await supabase
      .from('payroll_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PayrollReport>): Promise<PayrollReport> {
    const { data, error } = await supabase
      .from('payroll_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour les Entrées de Paie
 */
export const payrollEntriesApi = {
  async getByReport(reportId: string): Promise<PayrollEntry[]> {
    const { data, error } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<PayrollEntry | null> {
    const { data, error } = await supabase
      .from('payroll_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(entry: Omit<PayrollEntry, 'id' | 'created_at'>): Promise<PayrollEntry> {
    const { data, error } = await supabase
      .from('payroll_entries')
      .insert(entry)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createMany(entries: Omit<PayrollEntry, 'id' | 'created_at'>[]): Promise<PayrollEntry[]> {
    const { data, error } = await supabase
      .from('payroll_entries')
      .insert(entries)
      .select();
    
    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: Partial<PayrollEntry>): Promise<PayrollEntry> {
    const { data, error } = await supabase
      .from('payroll_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour les Profils
 */
export const profilesApi = {
  async getByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByDiscordId(discordId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * API pour la Configuration Discord
 */
export const discordConfigApi = {
  async get(): Promise<DiscordConfig | null> {
    const { data, error } = await supabase
      .from('discord_config')
      .select('*')
      .eq('id', 'default')
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(updates: Partial<DiscordConfig>): Promise<DiscordConfig> {
    const { data, error } = await supabase
      .from('discord_config')
      .upsert({ id: 'default', ...updates })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

/**
 * Helper pour gérer les erreurs API
 */
export function handleApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message;
  }
  return 'Une erreur inattendue est survenue.';
}