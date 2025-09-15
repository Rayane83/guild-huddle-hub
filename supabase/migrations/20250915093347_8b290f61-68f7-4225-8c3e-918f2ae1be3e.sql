-- Supprimer temporairement les politiques qui dépendent de guild_id
DROP POLICY IF EXISTS "Users can view guilds they belong to" ON public.guilds;
DROP POLICY IF EXISTS "Staff can manage all guilds" ON public.guilds;
DROP POLICY IF EXISTS "Users can view enterprises of their guild" ON public.enterprises;
DROP POLICY IF EXISTS "Staff can manage all enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Users can view tax brackets of their guild" ON public.tax_brackets;
DROP POLICY IF EXISTS "Staff can manage tax brackets" ON public.tax_brackets;
DROP POLICY IF EXISTS "Users can view wealth tax brackets of their guild" ON public.wealth_tax_brackets;
DROP POLICY IF EXISTS "Staff can manage wealth tax brackets" ON public.wealth_tax_brackets;

-- Modifier les types de colonnes guild_id pour accepter les Discord IDs (strings)
ALTER TABLE public.guilds ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.enterprises ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.tax_brackets ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.wealth_tax_brackets ALTER COLUMN guild_id TYPE TEXT;

-- Recréer les politiques avec les nouveaux types
CREATE POLICY "Users can view guilds they belong to" ON public.guilds
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id = guilds.id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Staff can manage all guilds" ON public.guilds
FOR ALL USING (is_user_staff());

CREATE POLICY "Users can view enterprises of their guild" ON public.enterprises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN profiles p ON p.id = e.profile_id
    WHERE p.user_id = auth.uid()
    AND e.enterprise_id = enterprises.id
    AND e.is_active = true
  )
);

CREATE POLICY "Staff can manage all enterprises" ON public.enterprises
FOR ALL USING (is_user_staff());

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