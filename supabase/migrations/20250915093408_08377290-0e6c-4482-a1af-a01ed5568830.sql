-- Supprimer la contrainte FK temporairement
ALTER TABLE public.enterprises DROP CONSTRAINT IF EXISTS enterprises_guild_id_fkey;

-- Modifier les types (guilds.id était déjà modifié dans la migration précédente)
-- enterprises.guild_id était déjà modifié dans la migration précédente

-- Ajouter des données de test
INSERT INTO public.guilds (id, name, is_active) VALUES 
('1404608015230832742', 'Flashback FA Guild', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enterprises (guild_id, key, name, discord_role_id, discord_guild_id) VALUES
('1404608015230832742', 'flashback', 'Flashback FA', NULL, '1404608015230832742'),
('1404608015230832742', 'test-corp', 'Test Corporation', NULL, '1404608015230832742')
ON CONFLICT (guild_id, key) DO NOTHING;

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
    (100000, 249999, 0.23, 55000, 60000, 27500, 30000)
) AS bracket_data(min_profit, max_profit, tax_rate, max_employee_salary, max_boss_salary, max_employee_bonus, max_boss_bonus)
ON CONFLICT DO NOTHING;

-- Ajouter une configuration Discord de base
INSERT INTO public.discord_config (id, data) VALUES 
('default', '{"principalGuildId": "1404608015230832742", "dot": {"guildId": "1404608015230832742"}}')
ON CONFLICT (id) DO UPDATE SET 
data = '{"principalGuildId": "1404608015230832742", "dot": {"guildId": "1404608015230832742"}}';

-- Recréer la contrainte FK avec les nouveaux types
ALTER TABLE public.enterprises 
ADD CONSTRAINT enterprises_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(id);