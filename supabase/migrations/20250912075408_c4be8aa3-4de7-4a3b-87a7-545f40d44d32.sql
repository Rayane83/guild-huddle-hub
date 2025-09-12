-- Modification du système d'authentification pour supporter inscription personnalisée et gestion HWIP

-- Ajout de colonnes aux profils existants
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS hwip TEXT,
ADD COLUMN IF NOT EXISTS hwip_reset_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_hwip_reset TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_superstaff BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_unique_id ON public.profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_profiles_hwip ON public.profiles(hwip);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);

-- Table pour l'audit des connexions HWIP
CREATE TABLE IF NOT EXISTS public.hwip_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  hwip TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT FALSE,
  reason TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour l'audit HWIP
CREATE INDEX IF NOT EXISTS idx_hwip_audit_profile_id ON public.hwip_audit(profile_id);
CREATE INDEX IF NOT EXISTS idx_hwip_audit_attempted_at ON public.hwip_audit(attempted_at);

-- Enable RLS sur la nouvelle table
ALTER TABLE public.hwip_audit ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour hwip_audit
CREATE POLICY "Users can view their own hwip audit"
ON public.hwip_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = hwip_audit.profile_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Superstaff can view all hwip audits"
ON public.hwip_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_superstaff = true
  )
);

CREATE POLICY "System can insert hwip audit logs"
ON public.hwip_audit
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = hwip_audit.profile_id
    AND p.user_id = auth.uid()
  )
);

-- Fonction pour vérifier les HWIP
CREATE OR REPLACE FUNCTION public.check_hwip_access(target_hwip TEXT, target_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_profile public.profiles;
  result JSONB;
BEGIN
  -- Récupérer le profil
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE id = target_profile_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'profile_not_found'
    );
  END IF;
  
  -- Si pas de HWIP enregistré, autoriser et l'enregistrer
  IF existing_profile.hwip IS NULL THEN
    UPDATE public.profiles
    SET hwip = target_hwip
    WHERE id = target_profile_id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwip_registered'
    );
  END IF;
  
  -- Si HWIP correspond, autoriser
  IF existing_profile.hwip = target_hwip THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwip_match'
    );
  END IF;
  
  -- HWIP différent, refuser
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'hwip_mismatch'
  );
END;
$$;

-- Fonction pour reset HWIP (superstaff uniquement)
CREATE OR REPLACE FUNCTION public.reset_hwip(target_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_profile public.profiles;
  target_profile public.profiles;
BEGIN
  -- Vérifier si l'utilisateur actuel est superstaff
  SELECT * INTO current_user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF NOT FOUND OR NOT current_user_profile.is_superstaff THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_permissions'
    );
  END IF;
  
  -- Récupérer le profil cible
  SELECT * INTO target_profile
  FROM public.profiles
  WHERE id = target_profile_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'profile_not_found'
    );
  END IF;
  
  -- Reset le HWIP
  UPDATE public.profiles
  SET 
    hwip = NULL,
    hwip_reset_count = COALESCE(hwip_reset_count, 0) + 1,
    last_hwip_reset = now()
  WHERE id = target_profile_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'hwip_reset_successful'
  );
END;
$$;

-- Mise à jour des politiques profiles pour supporter les nouvelles fonctionnalités
DROP POLICY IF EXISTS "Superstaff can manage all profiles" ON public.profiles;
CREATE POLICY "Superstaff can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_superstaff = true
  )
);

-- Trigger pour l'audit automatique des tentatives de connexion
CREATE OR REPLACE FUNCTION public.log_hwip_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer un log d'audit lors de chaque tentative de connexion
  INSERT INTO public.hwip_audit (profile_id, hwip, success, reason)
  VALUES (
    NEW.id,
    NEW.hwip,
    true,
    'login_attempt'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_log_hwip_attempt ON public.profiles;
CREATE TRIGGER trigger_log_hwip_attempt
  AFTER UPDATE OF hwip ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hwip_attempt();