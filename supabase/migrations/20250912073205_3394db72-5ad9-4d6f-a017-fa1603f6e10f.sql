-- Fix remaining critical security vulnerabilities

-- Fix profiles table - users should only see their own profile
DROP POLICY IF EXISTS "Allow all for authenticated users" ON profiles;

CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix discord_config table - restrict to admin/staff only
DROP POLICY IF EXISTS "Allow all for authenticated users" ON discord_config;

CREATE POLICY "Staff can manage discord config"
ON discord_config
FOR ALL
TO authenticated
USING (
  -- Only allow users who have staff privileges (multiple enterprise access)
  (SELECT COUNT(DISTINCT e.enterprise_id) FROM employees e
   JOIN profiles p ON p.id = e.profile_id
   WHERE p.user_id = auth.uid() AND e.is_active = true) > 1
);

-- Fix guilds table - users should only see guilds they belong to
DROP POLICY IF EXISTS "Allow all for authenticated users" ON guilds;

CREATE POLICY "Users can view guilds they belong to"
ON guilds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id = guilds.id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Staff can manage all guilds"
ON guilds
FOR ALL
TO authenticated
USING (
  -- Staff users can manage all guilds
  (SELECT COUNT(DISTINCT e.enterprise_id) FROM employees e
   JOIN profiles p ON p.id = e.profile_id
   WHERE p.user_id = auth.uid() AND e.is_active = true) > 1
);

-- Fix archives table - restrict access to guild members only
DROP POLICY IF EXISTS "Allow all for authenticated users" ON archives;

CREATE POLICY "Users can view archives of their guild"
ON archives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id::text = archives.guild_id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Users can insert archives for their guild"
ON archives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id::text = archives.guild_id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

CREATE POLICY "Users can update archives for their guild"
ON archives
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enterprises ent
    JOIN employees emp ON emp.enterprise_id = ent.id
    JOIN profiles p ON p.id = emp.profile_id
    WHERE ent.guild_id::text = archives.guild_id
    AND p.user_id = auth.uid()
    AND emp.is_active = true
  )
);

-- Add audit logging for sensitive profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'SELECT' AND NEW.user_id != auth.uid() THEN
    INSERT INTO salary_access_audit (user_id, enterprise_id, operation)
    VALUES (
      auth.uid(),
      (SELECT id FROM enterprises LIMIT 1), -- placeholder enterprise
      'unauthorized_profile_access_attempt'
    );
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;