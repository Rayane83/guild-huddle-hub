-- Créer des données de test simples pour permettre la connexion

-- Insérer une guilde de test (en utilisant UUID pour l'instant)
INSERT INTO public.guilds (id, name, is_active, config) 
SELECT 
  gen_random_uuid(),
  'Flashback FA Test Guild',
  true,
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM guilds LIMIT 1);

-- Insérer des entreprises de test
INSERT INTO public.enterprises (guild_id, key, name, config) 
SELECT 
  g.id,
  'flashback-fa',
  'Flashback FA',
  '{}'::jsonb
FROM guilds g
WHERE NOT EXISTS (SELECT 1 FROM enterprises LIMIT 1)
LIMIT 1;

INSERT INTO public.enterprises (guild_id, key, name, config) 
SELECT 
  g.id,
  'test-corp',
  'Test Corporation',
  '{}'::jsonb
FROM guilds g
WHERE NOT EXISTS (SELECT 1 FROM enterprises WHERE key = 'test-corp')
LIMIT 1;

-- Insérer des tranches fiscales de test
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
    (100000, 249999, 0.23, 55000, 60000, 27500, 30000)
) AS bracket_data(min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus)
WHERE NOT EXISTS (SELECT 1 FROM tax_brackets LIMIT 1);

-- Configuration Discord de base
INSERT INTO public.discord_config (id, data) VALUES 
('default', '{"principalGuildId": "1404608015230832742"}')
ON CONFLICT (id) DO UPDATE SET 
data = '{"principalGuildId": "1404608015230832742"}';