-- Fix security vulnerability: Implement column-level security for auth_credentials
-- This prevents password hashes and HWIDs from being exposed through SELECT operations

-- 1. Create a secure view that excludes sensitive fields (views don't support RLS)
CREATE OR REPLACE VIEW public.auth_credentials_safe AS
SELECT 
  id,
  user_id,
  unique_id,
  email,
  -- Exclude password_hash and hwid for security
  hwid_reset_count,
  last_hwid_reset,
  is_superstaff,
  registration_date,
  created_at,
  updated_at,
  -- Add computed field to show if HWID is registered without exposing the actual HWID
  (hwid IS NOT NULL) as has_hwid_registered
FROM public.auth_credentials;

-- 2. Create secure functions for operations that need sensitive field access
CREATE OR REPLACE FUNCTION public.verify_user_hwid_secure(target_hwid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_credentials auth_credentials;
BEGIN
  -- Get user's credentials (this function can access sensitive fields)
  SELECT * INTO user_credentials
  FROM auth_credentials
  WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;
  
  -- If no HWID registered, register it
  IF user_credentials.hwid IS NULL THEN
    UPDATE auth_credentials
    SET hwid = target_hwid, updated_at = now()
    WHERE user_id = auth.uid();
    
    RETURN jsonb_build_object('allowed', true, 'reason', 'hwid_registered');
  END IF;
  
  -- Check if HWID matches
  IF user_credentials.hwid = target_hwid THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'hwid_match');
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'hwid_mismatch');
  END IF;
END;
$$;

-- 3. Create function for safe credential access (returns only non-sensitive data)
CREATE OR REPLACE FUNCTION public.get_safe_user_credentials(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  unique_id text,
  email text,
  hwid_reset_count integer,
  last_hwid_reset timestamp with time zone,
  is_superstaff boolean,
  registration_date timestamp with time zone,
  has_hwid_registered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_is_superstaff boolean;
BEGIN
  -- Default to current user if no target specified
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Check if requesting user is superstaff
  SELECT COALESCE(ac.is_superstaff, false) INTO requesting_user_is_superstaff
  FROM auth_credentials ac
  WHERE ac.user_id = auth.uid();
  
  -- Only allow access to own data or if superstaff
  IF target_user_id != auth.uid() AND NOT requesting_user_is_superstaff THEN
    RETURN; -- Return empty result
  END IF;
  
  -- Return safe data (excluding password_hash and hwid)
  RETURN QUERY
  SELECT 
    ac.id,
    ac.user_id,
    ac.unique_id,
    ac.email,
    ac.hwid_reset_count,
    ac.last_hwid_reset,
    ac.is_superstaff,
    ac.registration_date,
    (ac.hwid IS NOT NULL) as has_hwid_registered
  FROM auth_credentials ac
  WHERE ac.user_id = target_user_id;
END;
$$;

-- 4. Update table policies to be more restrictive
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view their own auth credentials only" ON public.auth_credentials;
DROP POLICY IF EXISTS "Superstaff can view all auth credentials - strict" ON public.auth_credentials;
DROP POLICY IF EXISTS "Users can update their own auth credentials only" ON public.auth_credentials;
DROP POLICY IF EXISTS "Users can update their credentials with security controls" ON public.auth_credentials;

-- 5. Create highly restrictive policies - block direct table access for SELECT
CREATE POLICY "Block direct SELECT access to auth_credentials"
ON public.auth_credentials
FOR SELECT
TO authenticated
USING (false); -- No direct SELECT access allowed

-- 6. Allow controlled UPDATE access (but users still can't SELECT sensitive data)
CREATE POLICY "Allow controlled updates to auth_credentials"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Keep INSERT policy for registration
-- (INSERT policy already exists and is secure)

-- 8. Grant access to the safe view to authenticated users
GRANT SELECT ON public.auth_credentials_safe TO authenticated;

-- 9. Add security comments
COMMENT ON VIEW public.auth_credentials_safe IS 'Secure view excluding password_hash and hwid fields';
COMMENT ON FUNCTION public.get_safe_user_credentials(uuid) IS 'Secure function to get user credentials without sensitive fields';
COMMENT ON FUNCTION public.verify_user_hwid_secure(text) IS 'Secure HWID verification without exposing stored HWID';

SELECT 'Security vulnerability fixed: Password hashes and HWIDs now protected from SELECT operations' as status;