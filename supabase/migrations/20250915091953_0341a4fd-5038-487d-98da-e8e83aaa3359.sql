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
) AS bracket_data(min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus)
WHERE NOT EXISTS (
  SELECT 1 FROM tax_brackets tb WHERE tb.guild_id = g.id
);

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
) AS wealth_data(min_wealth, max_wealth, tax_rate)
WHERE NOT EXISTS (
  SELECT 1 FROM wealth_tax_brackets wtb WHERE wtb.guild_id = g.id
);