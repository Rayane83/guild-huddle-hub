-- Insert default discord config if none exists
INSERT INTO discord_config (id, client_id, principal_guild_id, data)
VALUES ('default', NULL, NULL, '{}')
ON CONFLICT (id) DO NOTHING;