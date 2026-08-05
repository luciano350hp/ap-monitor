import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DeviceInput = z.object({
  ip: z.string().min(1).max(64),
  ap_name: z.string().max(200).nullable().optional(),
  site: z.string().min(1).max(200),
  status: z.enum(["up", "down", "degraded", "unknown"]).default("unknown"),
  last_seen: z.string().nullable().optional(),
  latency_ms: z.number().int().min(0).max(600000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const UpsertInput = z.object({ devices: z.array(DeviceInput).min(1).max(5000) });

export const upsertDevices = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpsertInput.parse(data))
  .handler(async ({ data }) => {
    const now = new Date();
    const rows = data.devices.map((d) => {
      const ls = d.last_seen ? new Date(d.last_seen) : null;
      if (ls && ls.getTime() > now.getTime() + 60_000) {
        throw new Error(`'last seen' futuro para ${d.ip}`);
      }
      return {
        ip: d.ip,
        ap_name: d.ap_name ?? null,
        site: d.site,
        status: d.status,
        last_seen: (ls ?? now).toISOString(),
        latency_ms: d.latency_ms ?? null,
        notes: d.notes ?? null,
        updated_at: now.toISOString(),
      };
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin
      .from("devices")
      .upsert(rows, { onConflict: "ip" })
      .select("id");
    if (error) throw new Error(error.message);
    return { upserted: result?.length ?? 0 };
  });

export const deleteDevice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearDevices = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("devices").delete().neq("ip", "");
  if (error) throw new Error(error.message);
  return { ok: true };
});
