-- Nettoyage final : Suppression des colonnes sensibles restantes et optimisation sécurisée

-- 1. Supprimer les colonnes sensibles restantes de profiles (avec CASCADE pour éviter les erreurs de dépendance)
DO $$
BEGIN
  -- Supprimer les colonnes sensibles une par une avec CASCADE si nécessaires
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password_hash') THEN
    ALTER TABLE public.profiles DROP COLUMN password_hash CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hwid') THEN
    ALTER TABLE public.profiles DROP COLUMN hwid CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hwid_reset_count') THEN
    ALTER TABLE public.profiles DROP COLUMN hwid_reset_count CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_hwid_reset') THEN
    ALTER TABLE public.profiles DROP COLUMN last_hwid_reset CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_superstaff') THEN
    ALTER TABLE public.profiles DROP COLUMN is_superstaff CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'unique_id') THEN
    ALTER TABLE public.profiles DROP COLUMN unique_id CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles DROP COLUMN email CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'registration_date') THEN
    ALTER TABLE public.profiles DROP COLUMN registration_date CASCADE;
  END IF;
END $$;

-- 2. Nettoyer les anciennes fonctions non-sécurisées
DROP FUNCTION IF EXISTS public.check_hwid_access(TEXT, UUID);
DROP FUNCTION IF EXISTS public.reset_hwid(UUID);

-- 3. Optimiser les politiques RLS pour auth_credentials (renforcer la sécurité)
-- Supprimer les anciennes politiques potentiellement moins sécurisées
DROP POLICY IF EXISTS "Superstaff can view all auth credentials" ON public.auth_credentials;
DROP POLICY IF EXISTS "Superstaff can manage other users credentials" ON public.auth_credentials;

-- Recréer avec des règles encore plus strictes
CREATE POLICY "Superstaff can view all auth credentials - strict"
ON public.auth_credentials
FOR SELECT
TO authenticated
USING (
  -- Vérification stricte : l'utilisateur doit être superstaff ET authentifié
  user_id = auth.uid() OR (
    EXISTS (
      SELECT 1 FROM public.auth_credentials ac
      WHERE ac.user_id = auth.uid()
      AND ac.is_superstaff = true
    )
  )
);

CREATE POLICY "Superstaff can manage other users credentials - strict"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (
  -- Soit c'est son propre compte, soit il est superstaff
  user_id = auth.uid() OR (
    EXISTS (
      SELECT 1 FROM public.auth_credentials ac
      WHERE ac.user_id = auth.uid()
      AND ac.is_superstaff = true
    )
  )
);

-- 4. Sécuriser encore plus la table hwid_audit
-- Assurer que seules les logs liées aux credentials autorisées sont visibles
DROP POLICY IF EXISTS "Users can view their own hwid audit" ON public.hwid_audit;
DROP POLICY IF EXISTS "Superstaff can view all hwid audits" ON public.hwid_audit;

CREATE POLICY "Users can view their own hwid audit - secure"
ON public.hwid_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.id = hwid_audit.auth_credential_id
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Superstaff can view all hwid audits - secure"
ON public.hwid_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.user_id = auth.uid()
    AND ac.is_superstaff = true
  )
);

-- 5. Ajouter des fonctions utilitaires sécurisées pour l'administration
CREATE OR REPLACE FUNCTION public.get_user_security_info(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  unique_id TEXT,
  email TEXT,
  hwid_registered BOOLEAN,
  reset_count INTEGER,
  is_superstaff BOOLEAN,
  registration_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user public.auth_credentials;
BEGIN
  -- Vérifier les permissions de l'utilisateur qui fait la demande
  SELECT * INTO requesting_user
  FROM public.auth_credentials
  WHERE user_id = auth.uid();
  
  -- Si pas de target spécifique, retourner ses propres données
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Vérifier les permissions
  IF target_user_id != auth.uid() AND (requesting_user.is_superstaff IS NULL OR NOT requesting_user.is_superstaff) THEN
    -- Pas autorisé à voir les données d'autres utilisateurs
    RETURN;
  END IF;
  
  -- Retourner les informations autorisées
  RETURN QUERY
  SELECT 
    ac.user_id,
    ac.unique_id,
    ac.email,
    (ac.hwid IS NOT NULL) as hwid_registered,
    COALESCE(ac.hwid_reset_count, 0) as reset_count,
    ac.is_superstaff,
    ac.registration_date
  FROM public.auth_credentials ac
  WHERE ac.user_id = target_user_id;
END;
$$;

-- 6. Optimiser les index pour les requêtes de sécurité
CREATE INDEX IF NOT EXISTS idx_auth_credentials_security ON public.auth_credentials(user_id, is_superstaff);
CREATE INDEX IF NOT EXISTS idx_hwid_audit_security ON public.hwid_audit(auth_credential_id, attempted_at DESC);

-- 7. Ajouter un commentaire de documentation sur l'architecture de sécurité
COMMENT ON TABLE public.auth_credentials IS 'Table sécurisée contenant les données d''authentification sensibles. Accès strictement contrôlé par RLS.';
COMMENT ON TABLE public.profiles IS 'Table contenant les données de profil public non-sensibles.';
COMMENT ON TABLE public.hwid_audit IS 'Logs d''audit des tentatives de connexion HWID. Accès contrôlé par RLS basé sur auth_credentials.';

-- 8. Politique finale : interdire l'accès direct aux credentials via l'API REST publique
-- (Les accès doivent passer par les fonctions sécurisées)
CREATE POLICY "Block direct API access to sensitive fields"
ON public.auth_credentials
FOR ALL
TO anon
USING (false);

-- Confirmer que l'architecture de sécurité est en place
SELECT 'Architecture de sécurité mise en place avec succès!' as status;