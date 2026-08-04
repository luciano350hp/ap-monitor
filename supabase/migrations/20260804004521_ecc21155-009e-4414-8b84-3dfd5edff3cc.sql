GRANT SELECT ON public.devices TO anon;

DROP POLICY IF EXISTS "Public can view devices" ON public.devices;
CREATE POLICY "Public can view devices"
ON public.devices
FOR SELECT
TO anon
USING (true);