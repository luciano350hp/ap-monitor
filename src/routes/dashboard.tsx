import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { deriveStatus, useDevices, useThresholds, type DeviceStatusRaw } from "@/lib/devices";
import { formatRelative } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard en vivo — AP Down Monitor" },
      { name: "description", content: "Vista en tiempo real de dispositivos e IPs monitoreadas por el NOC." },
      { property: "og:title", content: "Dashboard en vivo — AP Down Monitor" },
      { property: "og:description", content: "Vista en tiempo real de dispositivos e IPs monitoreadas por el NOC." },
    ],
  }),
  component: DashboardPage,
});

const RANK: Record<DeviceStatusRaw, number> = { down: 0, degraded: 1, unknown: 2, up: 3 };

function DashboardPage() {
  const { devices, loading, error } = useDevices();
  const [thresholds] = useThresholds();

  const enriched = useMemo(
    () => devices.map((d) => ({ ...d, effective: deriveStatus(d, thresholds) })),
    [devices, thresholds],
  );

  const sorted = useMemo(
    () => [...enriched].sort((a, b) => RANK[a.effective] - RANK[b.effective]),
    [enriched],
  );

  const totals = useMemo(() => {
    const t = { total: enriched.length, up: 0, down: 0, degraded: 0, unknown: 0 };
    enriched.forEach((d) => { t[d.effective] += 1; });
    return t;
  }, [enriched]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard en vivo</h1>
          <p className="text-sm text-slate-500">Actualización automática vía suscripción a base de datos.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Realtime activo
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TOTAL" value={totals.total} tone="slate" />
        <StatCard label="OPERATIVOS" value={totals.up} tone="emerald" />
        <StatCard label="DEGRADADOS" value={totals.degraded} tone="amber" />
        <StatCard label="CAÍDOS" value={totals.down} tone="red" />
      </div>

      <div className="rounded border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">IP</th>
              <th className="text-left px-4 py-2">AP</th>
              <th className="text-left px-4 py-2">Sitio</th>
              <th className="text-left px-4 py-2">Último contacto</th>
              <th className="text-right px-4 py-2">Latencia</th>
              <th className="text-left px-4 py-2">Notas</th>
              <th className="text-right px-4 py-2">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Cargando…</td></tr>
            )}
            {error && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-red-600">{error}</td></tr>
            )}
            {!loading && !error && sorted.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Sin dispositivos.</td></tr>
            )}
            {sorted.map((d) => (
              <tr key={d.id} className={d.effective === "down" ? "bg-red-50/60" : d.effective === "degraded" ? "bg-amber-50/40" : ""}>
                <td className="px-4 py-2"><DeviceStatusBadge status={d.effective} /></td>
                <td className="px-4 py-2 font-mono text-xs">
                  <Link to="/devices/$id" params={{ id: d.id }} className="text-sky-700 hover:underline">
                    {d.ip}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-700">{d.ap_name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-700">{d.site}</td>
                <td className="px-4 py-2 text-slate-600">{d.last_seen ? formatRelative(d.last_seen) : "—"}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">{d.latency_ms != null ? `${d.latency_ms} ms` : "—"}</td>
                <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={d.notes ?? ""}>{d.notes || "—"}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-500">{formatRelative(d.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "red" | "amber" }) {
  const tones = {
    slate:   "border-slate-200 text-slate-900",
    emerald: "border-emerald-200 text-emerald-800",
    red:     "border-red-200 text-red-800",
    amber:   "border-amber-200 text-amber-900",
  } as const;
  return (
    <div className={`rounded border bg-white px-4 py-3 ${tones[tone]}`}>
      <div className="text-[10px] font-semibold tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
