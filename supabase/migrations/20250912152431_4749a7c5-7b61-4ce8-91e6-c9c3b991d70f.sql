-- Phase 1: Consolider vers un système d'authentification standard sécurisé

-- Remplacer les politiques trop permissives sur auth_credentials par des politiques plus strictes
DROP POLICY IF EXISTS "Security definer functions can access auth_credentials" ON public.auth_credentials;

-- Politique stricte pour les fonctions de sécurité spécifiques seulement
CREATE POLICY "Limited security definer access"
ON public.auth_credentials
FOR ALL
TO authenticated
USING (
  -- Seulement pour les données de l'utilisateur connecté
  auth.uid() = user_id OR
  -- Ou si appelé depuis une fonction de sécurité spécifique (via search_path)
  current_setting('search_path', true) LIKE '%auth_functions%'
)
WITH CHECK (
  auth.uid() = user_id OR
  current_setting('search_path', true) LIKE '%auth_functions%'
);

-- Migrer les données critiques vers le système standard
-- Créer une table user_roles si elle n'existe pas déjà pour gérer les rôles proprement
DO $$ 
BEGIN
  -- Vérifier si app_role existe déjà
  BEGIN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superadmin');
  EXCEPTION
    WHEN duplicate_object THEN
      -- Le type existe déjà, continuer
      NULL;
  END;
END $$;

-- Migrer les superstaff vers le système de rôles
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
  user_id, 
  'superadmin'::app_role,
  user_id -- Auto-assigné pour la migration
FROM public.auth_credentials 
WHERE is_superstaff = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Créer une fonction sécurisée pour vérifier les privilèges superadmin
CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth_functions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'superadmin'::app_role
  );
$$;

-- Ajouter une politique de sécurité pour les opérations de gestion des utilisateurs
CREATE POLICY "Superadmins can manage user credentials"
ON public.auth_credentials
FOR ALL
TO authenticated
USING (
  -- L'utilisateur peut accéder à ses propres données
  auth.uid() = user_id OR
  -- Ou s'il est superadmin (vérifié via fonction sécurisée)
  public.is_current_user_superadmin()
)
WITH CHECK (
  auth.uid() = user_id OR
  public.is_current_user_superadmin()
);

-- Nettoyer les anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Restrict direct API access to auth_credentials" ON public.auth_credentials;
DROP POLICY IF EXISTS "Allow user registration" ON public.auth_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON public.auth_credentials;
DROP POLICY IF EXISTS "Superstaff can manage other users credentials - strict" ON public.auth_credentials;