-- D'abord, supprimer toutes les contraintes et politiques existantes
DROP POLICY IF EXISTS "Allow authenticated users to view guilds" ON public.guilds;
DROP POLICY IF EXISTS "Allow authenticated users to manage guilds" ON public.guilds;
DROP POLICY IF EXISTS "Allow authenticated users to view enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Allow authenticated users to manage enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Allow authenticated users to view tax brackets" ON public.tax_brackets;
DROP POLICY IF EXISTS "Allow authenticated users to manage tax brackets" ON public.tax_brackets;
DROP POLICY IF EXISTS "Allow authenticated users to view wealth tax brackets" ON public.wealth_tax_brackets;
DROP POLICY IF EXISTS "Allow authenticated users to manage wealth tax brackets" ON public.wealth_tax_brackets;

-- Vider toutes les tables concernées
TRUNCATE public.tax_brackets CASCADE;
TRUNCATE public.wealth_tax_brackets CASCADE;
TRUNCATE public.enterprises CASCADE;
TRUNCATE public.guilds CASCADE;

-- Changer tous les types de colonnes guild_id vers TEXT
ALTER TABLE public.guilds ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.enterprises ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.tax_brackets ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.wealth_tax_brackets ALTER COLUMN guild_id TYPE TEXT;

-- Maintenant insérer les données de test avec des IDs TEXT
INSERT INTO public.guilds (id, discord_id, name, icon_url) VALUES 
('1404608015230832742', '1404608015230832742', 'Serveur de Test', null);

INSERT INTO public.enterprises (id, guild_id, name, key, discord_role_id, discord_guild_id) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '1404608015230832742', 'Entreprise de Test', 'test-entreprise', '1404608015230832743', '1404608015230832742');

INSERT INTO public.tax_brackets (guild_id, min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus) VALUES 
('1404608015230832742', 0, 50000, 0.10, 15000, 25000, 5000, 10000),
('1404608015230832742', 50001, 100000, 0.15, 20000, 35000, 7500, 15000),
('1404608015230832742', 100001, 999999999, 0.20, 25000, 50000, 10000, 25000);

INSERT INTO public.wealth_tax_brackets (guild_id, min_wealth, max_wealth, tax_rate) VALUES 
('1404608015230832742', 0, 100000, 0.01),
('1404608015230832742', 100001, 500000, 0.02),
('1404608015230832742', 500001, 999999999, 0.03);

-- Politiques RLS très permissives pour les tests
CREATE POLICY "Test - allow all for authenticated users" ON public.guilds
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Test - allow all for authenticated users" ON public.enterprises
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Test - allow all for authenticated users" ON public.tax_brackets
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Test - allow all for authenticated users" ON public.wealth_tax_brackets
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);