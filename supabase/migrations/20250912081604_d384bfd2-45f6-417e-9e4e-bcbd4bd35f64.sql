-- Fix critical security vulnerability: Prevent self-promotion to superstaff
-- This prevents users from setting their own is_superstaff flag, which was allowing 
-- unauthorized access to all user credentials

-- First, drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own auth credentials only" ON public.auth_credentials;

-- Create a restricted policy that prevents users from modifying sensitive security fields
CREATE POLICY "Users can update their own non-security fields only"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND is_superstaff = OLD.is_superstaff  -- Prevent changing superstaff status
);

-- Create a separate policy for superstaff management (only existing superstaff can grant/revoke superstaff)
CREATE POLICY "Superstaff can manage superstaff privileges"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.user_id = auth.uid()
    AND ac.is_superstaff = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.auth_credentials ac
    WHERE ac.user_id = auth.uid()
    AND ac.is_superstaff = true
  )
);

-- Additional security: Create audit trigger for superstaff changes
CREATE OR REPLACE FUNCTION public.audit_superstaff_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any superstaff status changes
  IF OLD.is_superstaff IS DISTINCT FROM NEW.is_superstaff THEN
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

-- Create trigger for superstaff audit logging
CREATE TRIGGER audit_superstaff_changes_trigger
AFTER UPDATE ON public.auth_credentials
FOR EACH ROW
EXECUTE FUNCTION public.audit_superstaff_changes();

-- Add comment explaining the security fix
COMMENT ON POLICY "Users can update their own non-security fields only" ON public.auth_credentials 
IS 'Security fix: Prevents users from self-promoting to superstaff, which was allowing unauthorized access to all credentials';