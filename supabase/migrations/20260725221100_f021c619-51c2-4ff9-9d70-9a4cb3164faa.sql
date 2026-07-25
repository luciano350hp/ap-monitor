
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Devices are readable by anyone" ON public.devices;
DROP POLICY IF EXISTS "Authenticated can insert devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated can update devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated can delete devices" ON public.devices;

-- Revoke public/anon access
REVOKE ALL ON public.devices FROM anon;
REVOKE ALL ON public.devices FROM PUBLIC;

-- Ensure authenticated role can access via Data API (still gated by RLS below)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;

-- Restrict all access to authenticated users only
CREATE POLICY "Authenticated users can view devices"
  ON public.devices FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert devices"
  ON public.devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update devices"
  ON public.devices FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete devices"
  ON public.devices FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
