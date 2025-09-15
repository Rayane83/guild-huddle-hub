-- Désactiver RLS temporairement sur toutes les tables concernées
ALTER TABLE public.guilds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_brackets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_tax_brackets DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques sur ces tables
DROP POLICY IF EXISTS "Users can view guilds they belong to" ON public.guilds;
DROP POLICY IF EXISTS "Staff can manage all guilds" ON public.guilds;
DROP POLICY IF EXISTS "Users can view enterprises of their guild" ON public.enterprises;
DROP POLICY IF EXISTS "Staff can manage all enterprises" ON public.enterprises;
DROP POLICY IF EXISTS "Users can view tax brackets of their guild" ON public.tax_brackets;
DROP POLICY IF EXISTS "Staff can manage tax brackets" ON public.tax_brackets;
DROP POLICY IF EXISTS "Users can view wealth tax brackets of their guild" ON public.wealth_tax_brackets;
DROP POLICY IF EXISTS "Staff can manage wealth tax brackets" ON public.wealth_tax_brackets;

-- Supprimer les contraintes FK
ALTER TABLE public.enterprises DROP CONSTRAINT IF EXISTS enterprises_guild_id_fkey;

-- Modifier les types de colonnes
ALTER TABLE public.guilds ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.enterprises ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.tax_brackets ALTER COLUMN guild_id TYPE TEXT;
ALTER TABLE public.wealth_tax_brackets ALTER COLUMN guild_id TYPE TEXT;

-- Réactiver RLS
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_tax_brackets ENABLE ROW LEVEL SECURITY;