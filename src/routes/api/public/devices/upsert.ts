import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PayloadSchema = z
  .object({
    ip: z.string().min(1).max(64).optional(),
    ap_name: z.string().min(1).max(200).optional(),
    name: z.string().min(1).max(200).optional(),
    site: z.string().min(1).max(200),
    status: z.enum(["up", "down", "degraded", "unknown"]).default("unknown"),
    last_seen: z.string().datetime({ offset: true }).optional().nullable(),
    latency_ms: z.number().int().min(0).max(600000).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((v) => Boolean(v.ip || v.ap_name || v.name), {
    message: "Se requiere 'ip' o 'ap_name'.",
  })
  .refine((v) => !v.last_seen || new Date(v.last_seen).getTime() <= Date.now() + 60_000, {
    message: "'last_seen' no puede estar en el futuro.",
  });


const BodySchema = z.union([PayloadSchema, z.array(PayloadSchema).max(500)]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/devices/upsert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.DEVICE_WEBHOOK_SECRET;
        if (!secret) return json({ error: "server_misconfigured" }, 500);

        const provided = request.headers.get("x-webhook-secret");
        if (!provided || provided !== secret) {
          return json({ error: "unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "validation_failed", detail: parsed.error.flatten() }, 400);
        }

        const rows = (Array.isArray(parsed.data) ? parsed.data : [parsed.data]).map((r) => ({
          ...r,
          last_seen: r.last_seen ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("devices")
          .upsert(rows, { onConflict: "ip" })
          .select("id, ip");

        if (error) return json({ error: "db_error", detail: error.message }, 500);
        return json({ ok: true, upserted: data?.length ?? 0, ids: data });
      },
    },
  },
});
