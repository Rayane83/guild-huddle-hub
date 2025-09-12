-- Enable RLS on auth_credentials_safe view
ALTER TABLE auth_credentials_safe ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own credentials safely
CREATE POLICY "Users can view their own credentials safely" 
ON auth_credentials_safe 
FOR SELECT 
USING (user_id = auth.uid());

-- Create policy for superstaff to view all credentials safely
CREATE POLICY "Superstaff can view all credentials safely" 
ON auth_credentials_safe 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth_credentials ac 
    WHERE ac.user_id = auth.uid() 
    AND ac.is_superstaff = true
  )
);

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

-- Create function for secure password hashing (will be used in edge functions)
CREATE OR REPLACE FUNCTION public.secure_hash_password(password text, salt text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Generate salt if not provided
  IF salt IS NULL THEN
    salt := encode(gen_random_bytes(16), 'hex');
  END IF;
  
  -- Return salt + hash (we'll implement bcrypt in edge functions)
  -- This is a placeholder for the edge function implementation
  RETURN salt || ':' || encode(digest(salt || password, 'sha256'), 'hex');
END;
$function$;

-- Add index for better performance on auth_credentials lookups
CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_is_superstaff ON auth_credentials(is_superstaff) WHERE is_superstaff = true;