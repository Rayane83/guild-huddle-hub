-- Ajouter la table archives manquante
CREATE TABLE public.archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id TEXT NOT NULL,
  enterprise_key TEXT,
  type TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  montant DECIMAL DEFAULT 0,
  statut TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur la table archives
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les archives
CREATE POLICY "Allow all for authenticated users" ON public.archives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_archives_updated_at
    BEFORE UPDATE ON public.archives
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les performances
CREATE INDEX idx_archives_guild_id ON public.archives(guild_id);
CREATE INDEX idx_archives_enterprise_key ON public.archives(enterprise_key);
CREATE INDEX idx_archives_date ON public.archives(date DESC);