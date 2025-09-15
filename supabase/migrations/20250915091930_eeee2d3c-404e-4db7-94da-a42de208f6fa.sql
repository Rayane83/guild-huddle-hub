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
FOR ALL USING (is_user_staff());

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
FOR ALL USING (is_user_staff());

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