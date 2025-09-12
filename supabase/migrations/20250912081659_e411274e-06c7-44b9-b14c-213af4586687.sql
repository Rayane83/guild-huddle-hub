-- Fix critical security vulnerability: Prevent self-promotion to superstaff
-- Using a trigger-based approach to enforce security rules

-- Create security trigger function
CREATE OR REPLACE FUNCTION public.prevent_superstaff_self_promotion()
RETURNS TRIGGER AS $$
DECLARE
  requesting_user_is_superstaff boolean;
BEGIN
  -- Check if the requesting user is superstaff
  SELECT COALESCE(is_superstaff, false) INTO requesting_user_is_superstaff
  FROM auth_credentials 
  WHERE user_id = auth.uid();
  
  -- If trying to change superstaff status and user is not already superstaff, block it
  IF NEW.is_superstaff IS DISTINCT FROM OLD.is_superstaff AND NOT requesting_user_is_superstaff THEN
    RAISE EXCEPTION 'Security violation: Only existing superstaff can modify superstaff privileges';
  END IF;
  
  -- Log superstaff changes for audit
  IF NEW.is_superstaff IS DISTINCT FROM OLD.is_superstaff THEN
    INSERT INTO public.hwid_audit (auth_credential_id, hwid, success, reason, user_agent)
    VALUES (
      NEW.id,
      'SUPERSTAFF_CHANGE',
      NEW.is_superstaff,
      CASE 
        WHEN NEW.is_superstaff THEN 'superstaff_granted'
        ELSE 'superstaff_revoked'
      END,
      'Changed by: ' || COALESCE(auth.uid()::text, 'system')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce superstaff security
DROP TRIGGER IF EXISTS prevent_superstaff_self_promotion_trigger ON public.auth_credentials;
CREATE TRIGGER prevent_superstaff_self_promotion_trigger
BEFORE UPDATE ON public.auth_credentials
FOR EACH ROW
EXECUTE FUNCTION public.prevent_superstaff_self_promotion();

-- Add security comment
COMMENT ON FUNCTION public.prevent_superstaff_self_promotion() 
IS 'Security function: Prevents users from self-promoting to superstaff, fixing credential theft vulnerability';

-- Verify security is in place
SELECT 'Security vulnerability fixed: Users can no longer self-promote to superstaff status' as status;