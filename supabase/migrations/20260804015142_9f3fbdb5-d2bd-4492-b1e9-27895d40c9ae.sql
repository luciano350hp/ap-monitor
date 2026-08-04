GRANT SELECT ON TABLE public.devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.devices TO authenticated;
GRANT ALL ON TABLE public.devices TO service_role;

DROP POLICY IF EXISTS "Public can view devices" ON public.devices;
CREATE POLICY "Public can view devices"
ON public.devices
FOR SELECT
TO anon
USING (true);