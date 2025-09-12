-- Fix critical security vulnerability in auth_temp_codes table
-- Remove overly permissive policy and implement secure access controls

-- Drop the insecure policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage temp codes" ON public.auth_temp_codes;

-- Create secure policies that restrict access appropriately
-- Only allow service role (edge functions) to manage temp codes
CREATE POLICY "Service role can manage temp codes" 
ON public.auth_temp_codes 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create a secure function for validating and consuming auth codes
CREATE OR REPLACE FUNCTION public.validate_and_consume_auth_code(
    target_email text,
    target_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_record auth_temp_codes;
BEGIN
    -- Find and lock the code record
    SELECT * INTO code_record
    FROM auth_temp_codes
    WHERE email = target_email 
    AND code = target_code
    AND expires_at > now()
    AND used = false
    FOR UPDATE;
    
    -- Check if code was found and is valid
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'reason', 'code_not_found_or_expired'
        );
    END IF;
    
    -- Mark the code as used
    UPDATE auth_temp_codes
    SET used = true
    WHERE id = code_record.id;
    
    -- Return success
    RETURN jsonb_build_object(
        'valid', true,
        'email', code_record.email,
        'code_id', code_record.id
    );
END;
$$;

-- Create a secure function for storing new auth codes (called by edge functions)
CREATE OR REPLACE FUNCTION public.store_auth_code(
    target_email text,
    auth_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_code_id uuid;
BEGIN
    -- Clean up any existing codes for this email first
    DELETE FROM auth_temp_codes 
    WHERE email = target_email;
    
    -- Insert the new code
    INSERT INTO auth_temp_codes (email, code)
    VALUES (target_email, auth_code)
    RETURNING id INTO new_code_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'code_id', new_code_id
    );
END;
$$;

-- Ensure cleanup function has proper permissions
-- This function should only be called by system/service role
CREATE OR REPLACE FUNCTION public.cleanup_expired_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow service role to execute cleanup
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: cleanup_expired_codes requires service role';
    END IF;
    
    DELETE FROM public.auth_temp_codes 
    WHERE expires_at < now() OR used = true;
END;
$$;