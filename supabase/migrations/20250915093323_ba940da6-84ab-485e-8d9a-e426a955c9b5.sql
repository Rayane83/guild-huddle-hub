-- Corriger le type de guild_id pour les Discord IDs (ce sont des strings, pas des UUID)
ALTER TABLE public.enterprises 
ALTER COLUMN guild_id TYPE TEXT;

ALTER TABLE public.tax_brackets 
ALTER COLUMN guild_id TYPE TEXT;

ALTER TABLE public.wealth_tax_brackets 
ALTER COLUMN guild_id TYPE TEXT;

-- Ajouter quelques données de test pour la guilde Discord
INSERT INTO public.enterprises (guild_id, key, name, discord_role_id, discord_guild_id) VALUES
('1404608015230832742', 'flashback', 'Flashback FA', NULL, '1404608015230832742'),
('1404608015230832742', 'test-corp', 'Test Corporation', NULL, '1404608015230832742')
ON CONFLICT DO NOTHING;

-- Ajouter des tranches fiscales pour cette guilde
INSERT INTO public.tax_brackets (guild_id, min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus) 
SELECT 
  '1404608015230832742' as guild_id,
  bracket_data.min_profit,
  bracket_data.max_profit,
  bracket_data.tax_rate,
  bracket_data.max_employee_salary,
  bracket_data.max_boss_salary,
  bracket_data.max_employee_bonus,
  bracket_data.max_boss_bonus
FROM (
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
ON CONFLICT DO NOTHING;

-- Ajouter une configuration Discord de base
INSERT INTO public.discord_config (id, data) VALUES 
('default', '{"principalGuildId": "1404608015230832742", "dot": {"guildId": "1404608015230832742"}}')
ON CONFLICT (id) DO UPDATE SET 
data = '{"principalGuildId": "1404608015230832742", "dot": {"guildId": "1404608015230832742"}}';