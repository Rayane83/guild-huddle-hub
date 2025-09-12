-- Migration pour renommer hwip en hwid dans toute la base de données

-- Renommer la colonne hwip en hwid dans la table profiles
ALTER TABLE public.profiles RENAME COLUMN hwip TO hwid;

-- Renommer hwip_reset_count et last_hwip_reset pour cohérence
ALTER TABLE public.profiles RENAME COLUMN hwip_reset_count TO hwid_reset_count;
ALTER TABLE public.profiles RENAME COLUMN last_hwip_reset TO last_hwid_reset;

-- Renommer la table hwip_audit en hwid_audit
ALTER TABLE public.hwip_audit RENAME TO hwid_audit;

-- Renommer la colonne hwip en hwid dans la nouvelle table hwid_audit
ALTER TABLE public.hwid_audit RENAME COLUMN hwip TO hwid;

-- Mettre à jour l'index
DROP INDEX IF EXISTS idx_profiles_hwip;
CREATE INDEX IF NOT EXISTS idx_profiles_hwid ON public.profiles(hwid);

-- Renommer les index de la table d'audit
DROP INDEX IF EXISTS idx_hwip_audit_profile_id;
DROP INDEX IF EXISTS idx_hwip_audit_attempted_at;
CREATE INDEX IF NOT EXISTS idx_hwid_audit_profile_id ON public.hwid_audit(profile_id);
CREATE INDEX IF NOT EXISTS idx_hwid_audit_attempted_at ON public.hwid_audit(attempted_at);

-- Renommer la fonction check_hwip_access en check_hwid_access
DROP FUNCTION IF EXISTS public.check_hwid_access(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.check_hwid_access(target_hwid TEXT, target_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Si pas de HWID enregistré, autoriser et l'enregistrer
  IF existing_profile.hwid IS NULL THEN
    UPDATE public.profiles
    SET hwid = target_hwid
    WHERE id = target_profile_id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'hwid_registered'
    );
  END IF;
  
  -- Si HWID correspond, autoriser
  IF existing_profile.hwid = target_hwid THEN
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

-- Renommer la fonction reset_hwip en reset_hwid
DROP FUNCTION IF EXISTS public.reset_hwid(UUID);
CREATE OR REPLACE FUNCTION public.reset_hwid(target_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Reset le HWID
  UPDATE public.profiles
  SET 
    hwid = NULL,
    hwid_reset_count = COALESCE(hwid_reset_count, 0) + 1,
    last_hwid_reset = now()
  WHERE id = target_profile_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'hwid_reset_successful'
  );
END;
$$;

-- Mettre à jour le trigger pour utiliser les nouveaux noms de colonnes
DROP TRIGGER IF EXISTS trigger_log_hwip_attempt ON public.profiles;
DROP FUNCTION IF EXISTS public.log_hwip_attempt();

CREATE OR REPLACE FUNCTION public.log_hwid_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer un log d'audit lors de chaque tentative de connexion
  INSERT INTO public.hwid_audit (profile_id, hwid, success, reason)
  VALUES (
    NEW.id,
    NEW.hwid,
    true,
    'login_attempt'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_log_hwid_attempt
  AFTER UPDATE OF hwid ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hwid_attempt();

-- Mettre à jour les politiques RLS pour utiliser les nouveaux noms de table/colonnes
DROP POLICY IF EXISTS "Users can view their own hwip audit" ON public.hwid_audit;
DROP POLICY IF EXISTS "Superstaff can view all hwip audits" ON public.hwid_audit;
DROP POLICY IF EXISTS "System can insert hwip audit logs" ON public.hwid_audit;

-- Recréer les politiques avec les nouveaux noms
CREATE POLICY "Users can view their own hwid audit"
ON public.hwid_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = hwid_audit.profile_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Superstaff can view all hwid audits"
ON public.hwid_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_superstaff = true
  )
);

CREATE POLICY "System can insert hwid audit logs"
ON public.hwid_audit
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = hwid_audit.profile_id
    AND p.user_id = auth.uid()
  )
);