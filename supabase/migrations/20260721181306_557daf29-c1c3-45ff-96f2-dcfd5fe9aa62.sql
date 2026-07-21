
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  site TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen TIMESTAMPTZ,
  latency_ms INTEGER,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devices are readable by anyone" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devices" ON public.devices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete devices" ON public.devices FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER devices_set_updated_at BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX devices_site_idx ON public.devices(site);
CREATE INDEX devices_status_idx ON public.devices(status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER TABLE public.devices REPLICA IDENTITY FULL;

INSERT INTO public.devices (ip, site, status, last_seen, latency_ms, notes) VALUES
  ('10.10.1.10', 'Buenos Aires - Palermo', 'up',       now() - interval '30 seconds', 12,   ''),
  ('10.10.1.11', 'Buenos Aires - Palermo', 'up',       now() - interval '45 seconds', 18,   ''),
  ('10.10.1.12', 'Buenos Aires - Palermo', 'degraded', now() - interval '2 minutes',  245,  'Latencia alta sostenida'),
  ('10.10.1.13', 'Buenos Aires - Palermo', 'down',     now() - interval '15 minutes', NULL, 'No responde ping - ticket #5120'),
  ('10.20.1.10', 'Córdoba - Nueva Cba',    'up',       now() - interval '20 seconds', 9,    ''),
  ('10.20.1.11', 'Córdoba - Nueva Cba',    'down',     now() - interval '1 hour',     NULL, 'Corte de energía reportado'),
  ('10.20.1.12', 'Córdoba - Nueva Cba',    'up',       now() - interval '40 seconds', 22,   ''),
  ('10.30.1.10', 'Rosario - Centro',       'up',       now() - interval '25 seconds', 15,   ''),
  ('10.30.1.11', 'Rosario - Centro',       'degraded', now() - interval '3 minutes',  310,  'Interferencia canal 6'),
  ('10.30.1.12', 'Rosario - Centro',       'unknown',  now() - interval '20 minutes', NULL, 'Sin datos del controlador');
