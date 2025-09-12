-- Add additional security trigger to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.enhanced_superstaff_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  requesting_user_is_superstaff boolean;
  target_user_is_superstaff boolean;
BEGIN
  -- Get requesting user's superstaff status
  SELECT COALESCE(is_superstaff, false) INTO requesting_user_is_superstaff
  FROM auth_credentials 
  WHERE user_id = auth.uid();
  
  -- Get target user's current superstaff status
  SELECT COALESCE(is_superstaff, false) INTO target_user_is_superstaff
  FROM auth_credentials 
  WHERE user_id = NEW.user_id;
  
  -- Prevent self-promotion to superstaff
  IF NEW.is_superstaff IS DISTINCT FROM OLD.is_superstaff THEN
    -- If trying to promote to superstaff
    IF NEW.is_superstaff = true THEN
      -- Only existing superstaff can promote others
      IF NOT requesting_user_is_superstaff THEN
        RAISE EXCEPTION 'Security violation: Only existing superstaff can grant superstaff privileges';
      END IF;
      
      -- Prevent self-promotion
      IF NEW.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Security violation: Cannot promote yourself to superstaff';
      END IF;
    END IF;
    
    -- Log all superstaff privilege changes
    INSERT INTO public.hwid_audit (auth_credential_id, hwid, success, reason, user_agent)
    VALUES (
      NEW.id,
      'SUPERSTAFF_PRIVILEGE_CHANGE',
      NEW.is_superstaff,
      CASE 
        WHEN NEW.is_superstaff THEN 'superstaff_granted_by_' || COALESCE(auth.uid()::text, 'system')
        ELSE 'superstaff_revoked_by_' || COALESCE(auth.uid()::text, 'system')
      END,
      'Target user: ' || NEW.user_id::text
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger and create enhanced one
DROP TRIGGER IF EXISTS prevent_superstaff_self_promotion ON auth_credentials;
CREATE TRIGGER enhanced_superstaff_security_trigger
  BEFORE UPDATE ON auth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_superstaff_security();

-- Update the get_safe_user_credentials function to be more secure
CREATE OR REPLACE FUNCTION public.get_safe_user_credentials(target_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, user_id uuid, unique_id text, email text, hwid_reset_count integer, last_hwid_reset timestamp with time zone, is_superstaff boolean, registration_date timestamp with time zone, has_hwid_registered boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Add index for better performance on auth_credentials lookups
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_is_superstaff ON auth_credentials(is_superstaff) WHERE is_superstaff = true;

-- Create a secure temporary code storage table to replace in-memory storage
CREATE TABLE IF NOT EXISTS public.auth_temp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '10 minutes'),
  used boolean DEFAULT false
);

-- Enable RLS on temp codes table
ALTER TABLE public.auth_temp_codes ENABLE ROW LEVEL SECURITY;

-- Policy to allow system to manage temp codes (using service role key)
CREATE POLICY "System can manage temp codes" 
ON public.auth_temp_codes 
FOR ALL 
USING (true);

-- Add cleanup function for expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.auth_temp_codes 
  WHERE expires_at < now() OR used = true;
END;
$function$;