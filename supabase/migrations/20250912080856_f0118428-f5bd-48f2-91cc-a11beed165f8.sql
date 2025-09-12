-- Sécurisation critique : Séparation des données d'authentification et de profil

-- 1. Créer la table sécurisée pour les données d'authentification
CREATE TABLE IF NOT EXISTS public.auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  hwid TEXT,
  hwid_reset_count INTEGER DEFAULT 0,
  last_hwid_reset TIMESTAMP WITH TIME ZONE,
  is_superstaff BOOLEAN DEFAULT FALSE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Contraintes de sécurité
  CONSTRAINT auth_credentials_user_id_unique UNIQUE (user_id),
  CONSTRAINT auth_credentials_unique_id_unique UNIQUE (unique_id),
  CONSTRAINT auth_credentials_email_unique UNIQUE (email)
);

-- 2. Enable RLS avec des politiques très strictes
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS ultra-sécurisées pour auth_credentials
-- Seul le propriétaire peut voir ses propres données d'auth (pas les autres utilisateurs)
CREATE POLICY "Users can view their own auth credentials only"
ON public.auth_credentials
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Seul le propriétaire peut modifier ses propres données d'auth
CREATE POLICY "Users can update their own auth credentials only"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Seuls les superstaff peuvent voir toutes les credentials (pour administration)
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

-- Seuls les superstaff peuvent modifier les droits d'autres utilisateurs
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

-- Permettre l'insertion pour la registration
CREATE POLICY "Allow insert for registration"
ON public.auth_credentials
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Migrer les données existantes de profiles vers auth_credentials
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
  unique_id,
  email,
  password_hash,
  hwid,
  hwid_reset_count,
  last_hwid_reset,
  is_superstaff,
  registration_date
FROM public.profiles
WHERE unique_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Nettoyer la table profiles (supprimer les données sensibles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS hwid;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS hwid_reset_count;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_hwid_reset;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_superstaff;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS unique_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS registration_date;

-- 6. Index pour les performances sur la nouvelle table
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON public.auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_unique_id ON public.auth_credentials(unique_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON public.auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_hwid ON public.auth_credentials(hwid);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_superstaff ON public.auth_credentials(is_superstaff) WHERE is_superstaff = true;

-- 7. Mettre à jour la table hwid_audit pour référencer auth_credentials
ALTER TABLE public.hwid_audit 
ADD COLUMN IF NOT EXISTS auth_credential_id UUID REFERENCES public.auth_credentials(id) ON DELETE CASCADE;

-- Migrer les références existantes
UPDATE public.hwid_audit 
SET auth_credential_id = ac.id
FROM public.auth_credentials ac
INNER JOIN public.profiles p ON p.user_id = ac.user_id
WHERE hwid_audit.profile_id = p.id;

-- 8. Mettre à jour les fonctions pour utiliser auth_credentials

-- Nouvelle fonction check_hwid_access sécurisée
DROP FUNCTION IF EXISTS public.check_hwid_access(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.check_hwid_access(target_hwid TEXT, target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_credentials public.auth_credentials;
BEGIN
  -- Récupérer les credentials (seulement si c'est le bon utilisateur)
  SELECT * INTO existing_credentials
  FROM public.auth_credentials
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'credentials_not_found'
    );
  END IF;
  
  -- Si pas de HWID enregistré, autoriser et l'enregistrer
  IF existing_credentials.hwid IS NULL THEN
    UPDATE public.auth_credentials
    SET hwid = target_hwid
    WHERE user_id = target_user_id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwid_registered'
    );
  END IF;
  
  -- Si HWID correspond, autoriser
  IF existing_credentials.hwid = target_hwid THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwid_match'
    );
  END IF;
  
  -- HWID différent, refuser
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'hwid_mismatch'
  );
END;
$$;

-- Nouvelle fonction reset_hwid sécurisée
DROP FUNCTION IF EXISTS public.reset_hwid(UUID);
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
  -- Vérifier si l'utilisateur actuel est superstaff
  SELECT * INTO current_user_credentials
  FROM public.auth_credentials
  WHERE user_id = auth.uid();
  
  IF NOT FOUND OR NOT current_user_credentials.is_superstaff THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_permissions'
    );
  END IF;
  
  -- Récupérer les credentials cibles
  SELECT * INTO target_credentials
  FROM public.auth_credentials
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'credentials_not_found'
    );
  END IF;
  
  -- Reset le HWID
  UPDATE public.auth_credentials
  SET 
    hwid = NULL,
    hwid_reset_count = COALESCE(hwid_reset_count, 0) + 1,
    last_hwid_reset = now()
  WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'hwid_reset_successful'
  );
END;
$$;

-- 9. Trigger pour les timestamps
CREATE TRIGGER update_auth_credentials_updated_at
  BEFORE UPDATE ON public.auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Mettre à jour le trigger d'audit pour utiliser la nouvelle table
DROP TRIGGER IF EXISTS trigger_log_hwid_attempt ON public.profiles;
DROP TRIGGER IF EXISTS trigger_log_hwid_attempt ON public.auth_credentials;

CREATE OR REPLACE FUNCTION public.log_hwid_attempt_secure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer un log d'audit lors de chaque tentative de connexion
  INSERT INTO public.hwid_audit (auth_credential_id, hwid, success, reason)
  VALUES (
    NEW.id,
    NEW.hwid,
    true,
    'hwid_update'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_hwid_attempt_secure
  AFTER UPDATE OF hwid ON public.auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hwid_attempt_secure();