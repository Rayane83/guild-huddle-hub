-- Fix remaining search path security warning
ALTER FUNCTION public.reset_hwip(uuid) SET search_path = public;

SELECT 'Final security fix applied: All function search paths now secure' as status;