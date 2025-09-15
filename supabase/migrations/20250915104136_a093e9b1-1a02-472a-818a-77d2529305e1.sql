-- Insérer les données de test nécessaires avec des UUIDs appropriés
-- Guild de test
INSERT INTO public.guilds (id, discord_id, name, icon_url) VALUES 
('123e4567-e89b-12d3-a456-426614174000', '1404608015230832742', 'Serveur de Test', null)
ON CONFLICT (id) DO UPDATE SET 
  discord_id = EXCLUDED.discord_id,
  name = EXCLUDED.name;

-- Entreprise de test
INSERT INTO public.enterprises (id, guild_id, name, key, discord_role_id, discord_guild_id) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '123e4567-e89b-12d3-a456-426614174000', 'Entreprise de Test', 'test-entreprise', '1404608015230832743', '1404608015230832742')
ON CONFLICT (id) DO UPDATE SET 
  guild_id = EXCLUDED.guild_id,
  name = EXCLUDED.name,
  key = EXCLUDED.key,
  discord_role_id = EXCLUDED.discord_role_id,
  discord_guild_id = EXCLUDED.discord_guild_id;

-- Tranches fiscales de test
INSERT INTO public.tax_brackets (guild_id, min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 0, 50000, 0.10, 15000, 25000, 5000, 10000),
('123e4567-e89b-12d3-a456-426614174000', 50001, 100000, 0.15, 20000, 35000, 7500, 15000),
('123e4567-e89b-12d3-a456-426614174000', 100001, 999999999, 0.20, 25000, 50000, 10000, 25000)
ON CONFLICT DO NOTHING;

-- Tranches de taxe sur la fortune de test
INSERT INTO public.wealth_tax_brackets (guild_id, min_wealth, max_wealth, tax_rate) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 0, 100000, 0.01),
('123e4567-e89b-12d3-a456-426614174000', 100001, 500000, 0.02),
('123e4567-e89b-12d3-a456-426614174000', 500001, 999999999, 0.03)
ON CONFLICT DO NOTHING;

-- Configuration Discord de test
INSERT INTO public.discord_config (id, client_id, principal_guild_id, data) VALUES 
('default', '1404608015230832741', '1404608015230832742', '{"test_mode": true}')
ON CONFLICT (id) DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  principal_guild_id = EXCLUDED.principal_guild_id,
  data = EXCLUDED.data;

-- Créer des politiques RLS plus permissives pour les tests
CREATE POLICY "Allow authenticated users to view guilds" ON public.guilds
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage guilds" ON public.guilds
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view enterprises" ON public.enterprises
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage enterprises" ON public.enterprises
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view tax brackets" ON public.tax_brackets
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage tax brackets" ON public.tax_brackets
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view wealth tax brackets" ON public.wealth_tax_brackets
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to manage wealth tax brackets" ON public.wealth_tax_brackets
FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);