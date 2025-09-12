-- Fix remaining critical security vulnerabilities (avoiding duplicates)

-- Check and fix discord_config table - restrict to admin/staff only
DO $$ 
BEGIN
  -- Drop if exists and recreate discord_config policy
  DROP POLICY IF EXISTS "Staff can manage discord config" ON discord_config;
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
END $$;

-- Check and fix guilds table policies
DO $$ 
BEGIN
  -- Drop existing policies and recreate
  DROP POLICY IF EXISTS "Users can view guilds they belong to" ON guilds;
  DROP POLICY IF EXISTS "Staff can manage all guilds" ON guilds;
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
END $$;

-- Check and fix archives table policies
DO $$ 
BEGIN
  -- Drop existing policies and recreate
  DROP POLICY IF EXISTS "Users can view archives of their guild" ON archives;
  DROP POLICY IF EXISTS "Users can insert archives for their guild" ON archives;
  DROP POLICY IF EXISTS "Users can update archives for their guild" ON archives;
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
END $$;