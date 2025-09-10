// Types pour le portail Discord Multi-Guilde avec nouvelle structure DB

export type Role = 'staff' | 'patron' | 'co-patron' | 'dot' | 'employe';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  discriminator?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  discord_id?: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Guild {
  id: string;
  discord_id: string;
  name: string;
  icon_url?: string;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Enterprise {
  id: string;
  guild_id: string;
  name: string;
  key: string;
  discord_role_id?: string;
  discord_guild_id?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  profile_id: string;
  enterprise_id: string;
  grade: string;
  salary: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollReport {
  id: string;
  enterprise_id: string;
  created_by?: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  employee_count: number;
  data: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: string;
  report_id: string;
  employee_id: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_amount: number;
  hours_worked?: number;
  data: Record<string, any>;
  created_at: string;
}

// Configuration Discord
export interface DiscordConfig {
  id: string;
  client_id?: string;
  principal_guild_id?: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Types legacy pour compatibilité
export interface UserGuildRole {
  guildId: string;
  roles: string[];
  entreprise?: string;
}

export interface DotationRow {
  id: string;
  name: string;
  run: number;
  facture: number;
  vente: number;
  ca_total: number;
  salaire: number;
  prime: number;
}

export interface DotationData {
  rows: DotationRow[];
  soldeActuel: number;
  expenses?: number;
  withdrawals?: number;
  commissions?: number;
  interInvoices?: number;
}

export interface DashboardSummary {
  ca_brut: number;
  depenses?: number;
  depenses_deductibles?: number;
  benefice: number;
  taux_imposition: number;
  montant_impots: number;
  employee_count?: number;
}

export interface Bracket {
  min: number;
  max: number;
  taux: number;
  sal_min_emp: number;
  sal_max_emp: number;
  sal_min_pat: number;
  sal_max_pat: number;
  pr_min_emp: number;
  pr_max_emp: number;
  pr_min_pat: number;
  pr_max_pat: number;
}

export interface Wealth {
  min: number;
  max: number;
  taux: number;
}

export interface PalierConfig extends Bracket {}

// Legacy types pour entreprises
export interface Entreprise {
  id: string;
  name: string;
}

// Configuration avancée
export interface TierConfig {
  seuil: number;
  bonus: number;
}

export interface CalculParam {
  label: string;
  actif: boolean;
  poids: number;
  cumulatif: boolean;
  paliers: TierConfig[];
}

export interface GradeRule {
  grade: string;
  roleDiscordId?: string;
  pourcentageCA: number;
  tauxHoraire: number;
}

export interface PrimeTier {
  seuil: number;
  prime: number;
}

export interface SalaryConfig {
  pourcentageCA: number;
  modes?: {
    caEmploye: boolean;
    heuresService: boolean;
    additionner: boolean;
  };
  primeBase: {
    active: boolean;
    montant: number;
  };
  paliersPrimes: PrimeTier[];
}

export interface CompanyConfig {
  identification: {
    label: string;
    type: string;
    description: string;
  };
  salaire: SalaryConfig;
  parametres: {
    RUN: CalculParam;
    FACTURE: CalculParam;
    VENTE: CalculParam;
    CA_TOTAL: CalculParam;
    GRADE: CalculParam;
    HEURE_SERVICE: CalculParam;
  };
  gradeRules: GradeRule[];
  errorTiers: TierConfig[];
  roleDiscord: string;
}

export interface CompanyConfigData {
  cfg: CompanyConfig;
  employees: Employee[];
}

// Blanchiment
export interface BlanchimentState {
  enabled: boolean;
  useGlobal?: boolean;
  percEntreprise?: number;
  percGroupe?: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface EmployeeCountResponse {
  count: number;
}