import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/devices/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.DEVICE_WEBHOOK_SECRET;
        if (!secret) return json({ error: "server_misconfigured" }, 500);

        const provided = request.headers.get("x-webhook-secret");
        if (!provided || provided !== secret) {
          return json({ error: "unauthorized" }, 401);
        }

        const url = new URL(request.url);
        const site = url.searchParams.get("site");
        const status = url.searchParams.get("status");
        const ip = url.searchParams.get("ip");
        const limitRaw = Number(url.searchParams.get("limit") ?? 200);
        const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), 1000);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let query = supabaseAdmin
          .from("devices")
          .select("id, ip, ap_name, site, status, last_seen, latency_ms, notes, updated_at, created_at")
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (site) query = query.eq("site", site);
        if (status) query = query.eq("status", status);
        if (ip) query = query.eq("ip", ip);

        const { data, error } = await query;
        if (error) return json({ error: "db_error", detail: error.message }, 500);

        return json({ ok: true, count: data?.length ?? 0, devices: data ?? [] });
      },
    },
  },
});
