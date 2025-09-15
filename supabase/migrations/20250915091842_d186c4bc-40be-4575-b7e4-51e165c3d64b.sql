-- Fonction helper pour déterminer si un utilisateur est staff
CREATE OR REPLACE FUNCTION public.is_user_staff(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT count(DISTINCT e.enterprise_id) > 1
    FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE p.user_id = user_id_param AND e.is_active = true
  ), false);
$$;

-- Système de configuration fiscale et comptable
CREATE TABLE public.tax_brackets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL,
  min_profit NUMERIC NOT NULL DEFAULT 0,
  max_profit NUMERIC NOT NULL DEFAULT 999999999,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  max_employee_salary NUMERIC NOT NULL DEFAULT 0,
  max_boss_salary NUMERIC NOT NULL DEFAULT 0,
  max_employee_bonus NUMERIC NOT NULL DEFAULT 0,
  max_boss_bonus NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Système d'impôt sur la richesse
CREATE TABLE public.wealth_tax_brackets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL,
  min_wealth NUMERIC NOT NULL DEFAULT 0,
  max_wealth NUMERIC NOT NULL DEFAULT 999999999,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comptabilité d'entreprise
CREATE TABLE public.company_accounting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  accounting_period_start DATE NOT NULL,
  accounting_period_end DATE NOT NULL,
  gross_revenue NUMERIC NOT NULL DEFAULT 0,
  deductible_expenses NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  profit_after_tax NUMERIC NOT NULL DEFAULT 0,
  total_bonuses NUMERIC NOT NULL DEFAULT 0,
  profit_after_bonuses NUMERIC NOT NULL DEFAULT 0,
  wealth_tax NUMERIC NOT NULL DEFAULT 0,
  bank_balance NUMERIC NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions comptables (retraits/dépôts)
CREATE TABLE public.accounting_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accounting_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'salary', 'bonus', 'expense', 'revenue')),
  justification TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Diplômes et qualifications employés
CREATE TABLE public.employee_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  patronage_diploma BOOLEAN DEFAULT false,
  accounting_diploma BOOLEAN DEFAULT false,
  management_diploma BOOLEAN DEFAULT false,
  hr_diploma BOOLEAN DEFAULT false,
  start_date DATE,
  phone TEXT,
  unique_identifier TEXT,
  bank_details TEXT,
  arrival_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Calculs de salaires avec les nouvelles règles
CREATE TABLE public.salary_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  calculation_period_start DATE NOT NULL,
  calculation_period_end DATE NOT NULL,
  run_count INTEGER DEFAULT 0,
  invoices_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  calculated_salary NUMERIC NOT NULL DEFAULT 0,
  calculated_bonus NUMERIC NOT NULL DEFAULT 0,
  tax_bracket_used UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_calculations ENABLE ROW LEVEL SECURITY;