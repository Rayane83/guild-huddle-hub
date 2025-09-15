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

-- RLS Policies for tax_brackets
CREATE POLICY "Users can view tax brackets of their guild" ON public.tax_brackets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id = tax_brackets.guild_id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Staff can manage tax brackets" ON public.tax_brackets
FOR ALL USING (
  SELECT count(DISTINCT e.enterprise_id) > 1
  FROM employees e
  JOIN profiles p ON p.id = e.profile_id
  WHERE p.user_id = auth.uid() AND e.is_active = true
);

-- RLS Policies for wealth_tax_brackets
CREATE POLICY "Users can view wealth tax brackets of their guild" ON public.wealth_tax_brackets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id = wealth_tax_brackets.guild_id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Staff can manage wealth tax brackets" ON public.wealth_tax_brackets
FOR ALL USING (
  SELECT count(DISTINCT e.enterprise_id) > 1
  FROM employees e
  JOIN profiles p ON p.id = e.profile_id
  WHERE p.user_id = auth.uid() AND e.is_active = true
);

-- RLS Policies for company_accounting
CREATE POLICY "Users can view accounting of their enterprise" ON public.company_accounting
FOR SELECT USING (user_can_access_enterprise(enterprise_id));

CREATE POLICY "Users can insert accounting of their enterprise" ON public.company_accounting
FOR INSERT WITH CHECK (user_can_access_enterprise(enterprise_id));

CREATE POLICY "Users can update accounting of their enterprise" ON public.company_accounting
FOR UPDATE USING (user_can_access_enterprise(enterprise_id));

-- RLS Policies for accounting_transactions
CREATE POLICY "Users can view transactions of their enterprise" ON public.accounting_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM company_accounting ca
    WHERE ca.id = accounting_transactions.accounting_id
    AND user_can_access_enterprise(ca.enterprise_id)
  )
);

CREATE POLICY "Users can insert transactions of their enterprise" ON public.accounting_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_accounting ca
    WHERE ca.id = accounting_transactions.accounting_id
    AND user_can_access_enterprise(ca.enterprise_id)
  )
);

CREATE POLICY "Users can update transactions of their enterprise" ON public.accounting_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM company_accounting ca
    WHERE ca.id = accounting_transactions.accounting_id
    AND user_can_access_enterprise(ca.enterprise_id)
  )
);

-- RLS Policies for employee_qualifications
CREATE POLICY "Users can view qualifications of their enterprise employees" ON public.employee_qualifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = employee_qualifications.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

CREATE POLICY "Users can insert qualifications of their enterprise employees" ON public.employee_qualifications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = employee_qualifications.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

CREATE POLICY "Users can update qualifications of their enterprise employees" ON public.employee_qualifications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = employee_qualifications.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

-- RLS Policies for salary_calculations
CREATE POLICY "Users can view salary calculations of their enterprise employees" ON public.salary_calculations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = salary_calculations.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

CREATE POLICY "Users can insert salary calculations of their enterprise employees" ON public.salary_calculations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = salary_calculations.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

CREATE POLICY "Users can update salary calculations of their enterprise employees" ON public.salary_calculations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees emp
    WHERE emp.id = salary_calculations.employee_id
    AND user_can_access_enterprise(emp.enterprise_id)
  )
);

-- Foreign key constraints
ALTER TABLE public.accounting_transactions 
ADD CONSTRAINT fk_accounting_transactions_accounting 
FOREIGN KEY (accounting_id) REFERENCES public.company_accounting(id) ON DELETE CASCADE;

ALTER TABLE public.employee_qualifications 
ADD CONSTRAINT fk_employee_qualifications_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.salary_calculations 
ADD CONSTRAINT fk_salary_calculations_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tax_brackets_updated_at
BEFORE UPDATE ON public.tax_brackets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_accounting_updated_at
BEFORE UPDATE ON public.company_accounting
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_qualifications_updated_at
BEFORE UPDATE ON public.employee_qualifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tax brackets for existing guilds (based on Excel data)
INSERT INTO public.tax_brackets (guild_id, min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus)
SELECT 
  g.id as guild_id,
  bracket_data.min_profit,
  bracket_data.max_profit,
  bracket_data.tax_rate,
  bracket_data.max_employee_salary,
  bracket_data.max_boss_salary,
  bracket_data.max_employee_bonus,
  bracket_data.max_boss_bonus
FROM guilds g
CROSS JOIN (
  VALUES 
    (100, 9999, 0.07, 5000, 8000, 2500, 4000),
    (10000, 29999, 0.09, 10000, 15000, 5000, 7500),
    (30000, 49999, 0.16, 20000, 25000, 10000, 12500),
    (50000, 99999, 0.21, 35000, 40000, 17500, 20000),
    (100000, 249999, 0.23, 55000, 60000, 27500, 30000),
    (250000, 449999, 0.26, 65000, 70000, 32500, 35000),
    (450000, 599999, 0.29, 75000, 80000, 37500, 40000),
    (600000, 899999, 0.32, 85000, 90000, 42500, 45000),
    (900000, 1499999, 0.36, 95000, 100000, 47500, 50000),
    (1500000, 1799999, 0.38, 105000, 110000, 52500, 55000),
    (1800000, 2499999, 0.44, 115000, 125000, 57500, 62500),
    (2500000, 4999999, 0.47, 145000, 150000, 72500, 75000),
    (5000000, 99000000, 0.49, 155000, 170000, 77500, 85000)
) AS bracket_data(min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus);

-- Insert default wealth tax brackets
INSERT INTO public.wealth_tax_brackets (guild_id, min_wealth, max_wealth, tax_rate)
SELECT 
  g.id as guild_id,
  wealth_data.min_wealth,
  wealth_data.max_wealth,
  wealth_data.tax_rate
FROM guilds g
CROSS JOIN (
  VALUES 
    (1500000, 2500000, 0.02),
    (2500000, 3500000, 0.03),
    (3500000, 5000000, 0.04),
    (5000000, 99000000, 0.05)
) AS wealth_data(min_wealth, max_wealth, tax_rate);