-- Sécurisation critique : Séparation des données d'authentification et de profil (VERSION CORRIGÉE)

-- 1. Supprimer d'abord tous les triggers et dépendances existants
DROP TRIGGER IF EXISTS trigger_log_hwid_attempt ON public.profiles;
DROP FUNCTION IF EXISTS public.log_hwid_attempt();

-- 2. Créer la table sécurisée pour les données d'authentification
CREATE TABLE IF NOT EXISTS public.auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  hwid TEXT,
  hwid_reset_count INTEGER DEFAULT 0,
  last_hwid_reset TIMESTAMP WITH TIME ZONE,
  is_superstaff BOOLEAN DEFAULT FALSE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajouter les contraintes après création
ALTER TABLE public.auth_credentials ADD CONSTRAINT auth_credentials_user_id_unique UNIQUE (user_id);
ALTER TABLE public.auth_credentials ADD CONSTRAINT auth_credentials_unique_id_unique UNIQUE (unique_id);
ALTER TABLE public.auth_credentials ADD CONSTRAINT auth_credentials_email_unique UNIQUE (email);

-- 3. Enable RLS avec des politiques très strictes
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS ultra-sécurisées pour auth_credentials
CREATE POLICY "Users can view their own auth credentials only"
ON public.auth_credentials
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own auth credentials only"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Superstaff can view all auth credentials"
ON public.auth_credentials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.user_id = auth.uid()
    AND ac.is_superstaff = true
  )
);

CREATE POLICY "Superstaff can manage other users credentials"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.user_id = auth.uid()
    AND ac.is_superstaff = true
  )
);

CREATE POLICY "Allow insert for registration"
ON public.auth_credentials
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5. Migrer les données existantes uniquement si elles existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'unique_id') THEN
    INSERT INTO public.auth_credentials (
      user_id,
      unique_id,
      email,
      password_hash,
      hwid,
      hwid_reset_count,
      last_hwid_reset,
      is_superstaff,
      registration_date
    )
    SELECT 
      user_id,
      COALESCE(unique_id, 'user_' || user_id::text),
      COALESCE(email, user_id::text || '@temp.local'),
      COALESCE(password_hash, 'temp_hash'),
      hwid,
      COALESCE(hwid_reset_count, 0),
      last_hwid_reset,
      COALESCE(is_superstaff, false),
      COALESCE(registration_date, now())
    FROM public.profiles
    WHERE user_id IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON public.auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_unique_id ON public.auth_credentials(unique_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON public.auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_hwid ON public.auth_credentials(hwid);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_superstaff ON public.auth_credentials(is_superstaff) WHERE is_superstaff = true;

-- 7. Créer les nouvelles fonctions sécurisées
CREATE OR REPLACE FUNCTION public.check_hwid_access_secure(target_hwid TEXT, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_credentials public.auth_credentials;
BEGIN
  SELECT * INTO existing_credentials
  FROM public.auth_credentials
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'credentials_not_found'
    );
  END IF;
  
  IF existing_credentials.hwid IS NULL THEN
    UPDATE public.auth_credentials
    SET hwid = target_hwid, updated_at = now()
    WHERE user_id = target_user_id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwid_registered'
    );
  END IF;
  
  IF existing_credentials.hwid = target_hwid THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwid_match'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'hwid_mismatch'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_hwid_secure(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_credentials public.auth_credentials;
  target_credentials public.auth_credentials;
BEGIN
  SELECT * INTO current_user_credentials
  FROM public.auth_credentials
  WHERE user_id = auth.uid();
  
  IF NOT FOUND OR NOT current_user_credentials.is_superstaff THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_permissions'
    );
  END IF;
  
  SELECT * INTO target_credentials
  FROM public.auth_credentials
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'credentials_not_found'
    );
  END IF;
  
  UPDATE public.auth_credentials
  SET 
    hwid = NULL,
    hwid_reset_count = COALESCE(hwid_reset_count, 0) + 1,
    last_hwid_reset = now(),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'hwid_reset_successful'
  );
END;
$$;

-- 8. Trigger pour les timestamps sur auth_credentials
CREATE TRIGGER update_auth_credentials_updated_at
  BEFORE UPDATE ON public.auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Mettre à jour la table hwid_audit si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hwid_audit') THEN
    -- Ajouter la nouvelle colonne si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hwid_audit' AND column_name = 'auth_credential_id') THEN
      ALTER TABLE public.hwid_audit ADD COLUMN auth_credential_id UUID REFERENCES public.auth_credentials(id) ON DELETE CASCADE;
    END IF;
    
    -- Migrer les références existantes
    UPDATE public.hwid_audit 
    SET auth_credential_id = ac.id
    FROM public.auth_credentials ac
    INNER JOIN public.profiles p ON p.user_id = ac.user_id
    WHERE hwid_audit.profile_id = p.id
    AND hwid_audit.auth_credential_id IS NULL;
  END IF;
END $$;

-- 10. Nouveau trigger d'audit sécurisé
CREATE OR REPLACE FUNCTION public.log_hwid_attempt_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer un log d'audit si la table existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hwid_audit') THEN
    INSERT INTO public.hwid_audit (auth_credential_id, hwid, success, reason)
    VALUES (
      NEW.id,
      NEW.hwid,
      true,
      'hwid_update'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_hwid_attempt_secure
  AFTER UPDATE OF hwid ON public.auth_credentials
  FOR EACH ROW
  WHEN (OLD.hwid IS DISTINCT FROM NEW.hwid)
  EXECUTE FUNCTION public.log_hwid_attempt_secure();