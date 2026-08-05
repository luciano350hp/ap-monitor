ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS ap_name text;
CREATE INDEX IF NOT EXISTS devices_ap_name_idx ON public.devices (ap_name);