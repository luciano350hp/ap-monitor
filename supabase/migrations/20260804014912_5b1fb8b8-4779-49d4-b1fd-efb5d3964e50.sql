DROP POLICY IF EXISTS "Public can view devices" ON public.devices;
REVOKE SELECT ON public.devices FROM anon;