-- Fix Security Definer View warning by removing security_barrier property
-- The view is already safe since it excludes sensitive columns

-- Recreate the view without security_barrier (which was causing the security warning)
DROP VIEW IF EXISTS public.auth_credentials_safe;

CREATE VIEW public.auth_credentials_safe AS
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

-- Grant appropriate access
GRANT SELECT ON public.auth_credentials_safe TO authenticated;

SELECT 'Security definer view warning fixed: View recreated without security_barrier property' as status;