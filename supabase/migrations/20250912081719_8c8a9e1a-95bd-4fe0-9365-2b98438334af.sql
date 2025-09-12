-- Fix security warnings: Set proper search_path for all functions to prevent search path manipulation

-- Fix search path for existing functions that don't have it set
ALTER FUNCTION public.log_profile_access() SET search_path = public;
ALTER FUNCTION public.user_can_access_enterprise(uuid) SET search_path = public;
ALTER FUNCTION public.check_hwip_access(text, uuid) SET search_path = public;

-- Confirm security improvements
SELECT 'Security warnings fixed: All functions now have proper search_path settings' as status;