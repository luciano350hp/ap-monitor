import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { deriveStatus, useDevices, useThresholds } from "@/lib/devices";

export const Route = createFileRoute("/sitios")({
  head: () => ({
    meta: [
      { title: "Resumen por Sitio — AP Down Monitor" },
      { name: "description", content: "Dispositivos agrupados por sitio con cantidad de caídos y disponibilidad." },
      { property: "og:title", content: "Resumen por Sitio — AP Down Monitor" },
      { property: "og:description", content: "Dispositivos agrupados por sitio con cantidad de caídos y disponibilidad." },
    ],
  }),
  component: SiteSummaryPage,
});

interface SiteRow {
  site: string;
  total: number;
  down: number;
  up: number;
  degraded: number;
  unknown: number;
}

function SiteSummaryPage() {
  const { devices, loading, error } = useDevices();
  const [thresholds] = useThresholds();

  const rows: SiteRow[] = useMemo(() => {
    const map = new Map<string, SiteRow>();
    for (const d of devices) {
      const row = map.get(d.site) ?? { site: d.site, total: 0, down: 0, up: 0, degraded: 0, unknown: 0 };
      row.total++;
      row[deriveStatus(d, thresholds)]++;
      map.set(d.site, row);
    }
    return Array.from(map.values()).sort((a, b) => b.down - a.down || a.site.localeCompare(b.site));
  }, [devices, thresholds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resumen por Sitio</h1>
        <p className="text-sm text-slate-500">Dispositivos agrupados por ubicación, ordenados por cantidad de caídos.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">No hay dispositivos registrados.</p>
          <Link
            to="/carga"
            className="mt-3 inline-flex items-center justify-center rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Ir a Carga de Datos
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-medium">Sitio</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="px-4 py-2.5 font-medium text-right">Caídos</th>
                <th className="px-4 py-2.5 font-medium text-right">Degradados</th>
                <th className="px-4 py-2.5 font-medium text-right">Operativos</th>
                <th className="px-4 py-2.5 font-medium text-right">Sin datos</th>
                <th className="px-4 py-2.5 font-medium">Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total > 0 ? Math.round((r.up / r.total) * 100) : 0;
                return (
                  <tr key={r.site} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.site}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={r.down > 0 ? "font-semibold text-red-600" : "text-slate-400"}>{r.down}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">{r.degraded}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{r.up}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{r.unknown}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden max-w-[160px]">
                          <div
                            className={`h-full ${pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-600 w-10">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
