-- Security Fix: Remove insecure auth_credentials_safe view and replace with controlled access

-- Drop the insecure view that bypasses RLS policies
DROP VIEW IF EXISTS public.auth_credentials_safe;

-- Create a replacement view with proper security definer function access
-- This view will only be accessible through the existing security definer functions
CREATE OR REPLACE VIEW public.auth_credentials_safe AS 
SELECT 
  'ACCESS_DENIED'::text as message,
  'Use get_safe_user_credentials() function for secure access'::text as instruction
WHERE false; -- This view returns no data and serves as documentation

-- Ensure the existing get_safe_user_credentials function is the proper way to access safe data
-- Add additional security validation to the function
CREATE OR REPLACE FUNCTION public.get_safe_user_credentials(target_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, user_id uuid, unique_id text, email text, hwid_reset_count integer, last_hwid_reset timestamp with time zone, is_superstaff boolean, registration_date timestamp with time zone, has_hwid_registered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  requesting_user_is_superstaff boolean;
  requesting_user_exists boolean;
BEGIN
  -- Verify the requesting user exists and is authenticated
  SELECT EXISTS(
    SELECT 1 FROM auth_credentials ac WHERE ac.user_id = auth.uid()
  ) INTO requesting_user_exists;
  
  IF NOT requesting_user_exists THEN
    -- No access for non-existent or unauthenticated users
    RETURN;
  END IF;
  
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
    -- Log unauthorized access attempt
    INSERT INTO public.hwid_audit (hwid, success, reason, user_agent)
    VALUES (
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      false,
      'Attempted access to user data: ' || target_user_id::text || ' by: ' || auth.uid()::text,
      'get_safe_user_credentials function'
    );
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
  
  -- Log successful access for audit trail
  INSERT INTO public.hwid_audit (hwid, success, reason, user_agent)
  VALUES (
    'SAFE_CREDENTIALS_ACCESS',
    true,
    'Accessed safe credentials for user: ' || target_user_id::text || ' by: ' || COALESCE(auth.uid()::text, 'system'),
    'get_safe_user_credentials function'
  );
END;
$function$;

-- Create a public function for users to get their own basic profile info
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(unique_id text, email text, registration_date timestamp with time zone, is_superstaff boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only return current user's basic info
  RETURN QUERY
  SELECT 
    ac.unique_id,
    ac.email,
    ac.registration_date,
    COALESCE(ac.is_superstaff, false) as is_superstaff
  FROM auth_credentials ac
  WHERE ac.user_id = auth.uid();
END;
$function$;

-- Add function to safely list users for superstaff (without sensitive data)
CREATE OR REPLACE FUNCTION public.list_users_safe()
RETURNS TABLE(unique_id text, email text, registration_date timestamp with time zone, is_superstaff boolean, has_hwid_registered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  requesting_user_is_superstaff boolean;
BEGIN
  -- Check if requesting user is superstaff
  SELECT COALESCE(ac.is_superstaff, false) INTO requesting_user_is_superstaff
  FROM auth_credentials ac
  WHERE ac.user_id = auth.uid();
  
  IF NOT requesting_user_is_superstaff THEN
    -- Log unauthorized access attempt
    INSERT INTO public.hwid_audit (hwid, success, reason, user_agent)
    VALUES (
      'UNAUTHORIZED_LIST_USERS_ATTEMPT',
      false,
      'Non-superstaff user attempted to list users: ' || COALESCE(auth.uid()::text, 'anonymous'),
      'list_users_safe function'
    );
    RETURN; -- Return empty result
  END IF;
  
  -- Return safe user list for superstaff
  RETURN QUERY
  SELECT 
    ac.unique_id,
    ac.email,
    ac.registration_date,
    COALESCE(ac.is_superstaff, false) as is_superstaff,
    (ac.hwid IS NOT NULL) as has_hwid_registered
  FROM auth_credentials ac
  ORDER BY ac.registration_date DESC;
  
  -- Log successful access
  INSERT INTO public.hwid_audit (hwid, success, reason, user_agent)
  VALUES (
    'SAFE_USER_LIST_ACCESS',
    true,
    'Superstaff accessed user list: ' || auth.uid()::text,
    'list_users_safe function'
  );
END;
$function$;