-- Fix the remaining function search path warning
ALTER FUNCTION public.user_can_access_enterprise(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;