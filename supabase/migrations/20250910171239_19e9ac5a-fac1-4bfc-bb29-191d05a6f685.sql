-- Supprimer toutes les tables existantes
DROP TABLE IF EXISTS public.app_storage CASCADE;
DROP TABLE IF EXISTS public.archives CASCADE;
DROP TABLE IF EXISTS public.blanchiment_global CASCADE;
DROP TABLE IF EXISTS public.blanchiment_rows CASCADE;
DROP TABLE IF EXISTS public.blanchiment_settings CASCADE;
DROP TABLE IF EXISTS public.company_configs CASCADE;
DROP TABLE IF EXISTS public.company_prime_tiers CASCADE;
DROP TABLE IF EXISTS public.discord_config CASCADE;
DROP TABLE IF EXISTS public.dotation_reports CASCADE;
DROP TABLE IF EXISTS public.dotation_rows CASCADE;
DROP TABLE IF EXISTS public.enterprises CASCADE;
DROP TABLE IF EXISTS public.grade_rules CASCADE;
DROP TABLE IF EXISTS public.tax_brackets CASCADE;
DROP TABLE IF EXISTS public.wealth_brackets CASCADE;

-- Supprimer les types si ils existent
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Reconstruire une structure propre et simplifiée

-- Table des profils utilisateur
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de configuration Discord globale
CREATE TABLE public.discord_config (
  id TEXT NOT NULL DEFAULT 'default' PRIMARY KEY,
  client_id TEXT,
  principal_guild_id TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des guildes/serveurs
CREATE TABLE public.guilds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des entreprises simplifiée
CREATE TABLE public.enterprises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  discord_role_id TEXT,
  discord_guild_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, key)
);

-- Table des employés et leurs rôles
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  grade TEXT NOT NULL DEFAULT 'employe',
  salary DECIMAL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, enterprise_id)
);

-- Table des rapports de paie simplifiée
CREATE TABLE public.payroll_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des lignes de paie
CREATE TABLE public.payroll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.payroll_reports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary DECIMAL NOT NULL DEFAULT 0,
  bonus DECIMAL NOT NULL DEFAULT 0,
  deductions DECIMAL NOT NULL DEFAULT 0,
  net_amount DECIMAL NOT NULL DEFAULT 0,
  hours_worked INTEGER DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- Politiques RLS basiques (tout accessible pour les utilisateurs authentifiés)
CREATE POLICY "Allow all for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.discord_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.guilds FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.enterprises FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.payroll_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.payroll_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discord_config_updated_at
    BEFORE UPDATE ON public.discord_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guilds_updated_at
    BEFORE UPDATE ON public.guilds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprises_updated_at
    BEFORE UPDATE ON public.enterprises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_reports_updated_at
    BEFORE UPDATE ON public.payroll_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les performances
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX idx_enterprises_guild_id ON public.enterprises(guild_id);
CREATE INDEX idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX idx_employees_enterprise_id ON public.employees(enterprise_id);
CREATE INDEX idx_payroll_reports_enterprise_id ON public.payroll_reports(enterprise_id);
CREATE INDEX idx_payroll_entries_report_id ON public.payroll_entries(report_id);