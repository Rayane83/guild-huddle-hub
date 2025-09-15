-- Fix RLS policies for discord_config table to allow superadmin access
DROP POLICY IF EXISTS "Staff can manage discord config" ON public.discord_config;

-- Create new policy allowing superadmins to manage discord config
CREATE POLICY "Superadmins can manage discord config" 
ON public.discord_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth_credentials ac
    WHERE ac.user_id = auth.uid() 
    AND ac.is_superstaff = true
  )
);

-- Insert default discord config if none exists
INSERT INTO public.discord_config (id, client_id, principal_guild_id, data)
VALUES ('default', NULL, '1404608015230832742', '{}')
ON CONFLICT (id) DO NOTHING;

-- Create profiles for auth_credentials users if they don't exist
INSERT INTO public.profiles (user_id, email, unique_id)
SELECT ac.user_id, ac.email, ac.unique_id
FROM auth_credentials ac
LEFT JOIN profiles p ON p.user_id = ac.user_id
WHERE p.user_id IS NULL;

-- Create user_roles for superstaff users
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT ac.user_id, 'superadmin'::app_role, ac.user_id
FROM auth_credentials ac
LEFT JOIN user_roles ur ON ur.user_id = ac.user_id AND ur.role = 'superadmin'::app_role
WHERE ac.is_superstaff = true AND ur.user_id IS NULL;