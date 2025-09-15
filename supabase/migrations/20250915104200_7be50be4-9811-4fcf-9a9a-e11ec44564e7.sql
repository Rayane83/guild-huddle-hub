-- Insérer les données de test avec des UUIDs corrects
-- Guild de test avec UUID généré
INSERT INTO public.guilds (id, discord_id, name, icon_url) VALUES 
(gen_random_uuid(), '1404608015230832742', 'Serveur de Test', null)
ON CONFLICT (discord_id) DO NOTHING;

-- Récupérer l'UUID de la guild créée
WITH guild_info AS (
  SELECT id as guild_uuid FROM public.guilds WHERE discord_id = '1404608015230832742' LIMIT 1
)
-- Entreprise de test avec UUID généré et référence à la guild
INSERT INTO public.enterprises (id, guild_id, name, key, discord_role_id, discord_guild_id) 
SELECT 
  gen_random_uuid(),
  guild_info.guild_uuid,
  'Entreprise de Test',
  'test-entreprise',
  '1404608015230832743',
  '1404608015230832742'
FROM guild_info
ON CONFLICT DO NOTHING;

-- Insérer les tranches fiscales avec la guild_id correcte (TEXT)
INSERT INTO public.tax_brackets (guild_id, min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus) VALUES 
('1404608015230832742', 0, 50000, 0.10, 15000, 25000, 5000, 10000),
('1404608015230832742', 50001, 100000, 0.15, 20000, 35000, 7500, 15000),
('1404608015230832742', 100001, 999999999, 0.20, 25000, 50000, 10000, 25000)
ON CONFLICT DO NOTHING;

-- Insérer les tranches de taxe sur la fortune
INSERT INTO public.wealth_tax_brackets (guild_id, min_wealth, max_wealth, tax_rate) VALUES 
('1404608015230832742', 0, 100000, 0.01),
('1404608015230832742', 100001, 500000, 0.02),
('1404608015230832742', 500001, 999999999, 0.03)
ON CONFLICT DO NOTHING;

-- Configuration Discord de test
INSERT INTO public.discord_config (id, client_id, principal_guild_id, data) VALUES 
('default', '1404608015230832741', '1404608015230832742', '{"test_mode": true}')
ON CONFLICT (id) DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  principal_guild_id = EXCLUDED.principal_guild_id,
  data = EXCLUDED.data;

-- Créer des politiques RLS permissives pour les tests
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