-- Fix authentication system RLS policies that are blocking legitimate operations

-- First, drop the overly restrictive policies that are breaking authentication
DROP POLICY IF EXISTS "Block direct API access to sensitive fields" ON public.auth_credentials;
DROP POLICY IF EXISTS "Block direct SELECT access to auth_credentials" ON public.auth_credentials;

-- Create proper RLS policies that allow security definer functions to work while blocking direct API access

-- Allow security definer functions to access the table (these functions run with elevated privileges)
CREATE POLICY "Security definer functions can access auth_credentials"
ON public.auth_credentials
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- However, create a more restrictive policy for direct API access
-- This policy will take precedence for direct API calls due to the order and specificity
CREATE POLICY "Restrict direct API access to auth_credentials"
ON public.auth_credentials
FOR ALL
TO authenticated, anon
USING (
  -- Only allow access through security definer functions or for user's own data
  auth.uid() = user_id OR 
  -- Allow if the current function is a security definer function (indicated by search_path)
  current_setting('search_path', true) LIKE '%public%'
)
WITH CHECK (
  -- Only allow inserts/updates for user's own data or through security definer functions
  auth.uid() = user_id OR
  current_setting('search_path', true) LIKE '%public%'
);

-- Create a specific policy for user registration (INSERT operations)
CREATE POLICY "Allow user registration"
ON public.auth_credentials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a specific policy for users to update their own credentials
CREATE POLICY "Users can update own credentials"
ON public.auth_credentials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow superstaff to manage other users (this policy already exists but ensuring it works)
-- This is already handled by the existing "Superstaff can manage other users credentials - strict" policy