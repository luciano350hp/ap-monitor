import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAPs } from "@/lib/ap-store";
import { formatRelative, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/")({
  component: APStatusPage,
});

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "danger" | "ok" }) {
  const toneClasses = {
    neutral: "text-slate-900",
    danger: "text-red-600",
    ok: "text-emerald-600",
  }[tone];
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${toneClasses}`}>{value}</div>
    </div>
  );
}

function APStatusPage() {
  const aps = useAPs();

  const { total, down, up, unknown, sorted } = useMemo(() => {
    const down = aps.filter((a) => a.status === "down").length;
    const up = aps.filter((a) => a.status === "up").length;
    const unknown = aps.filter((a) => a.status === "unknown").length;
    const order = { down: 0, unknown: 1, up: 2 };
    const sorted = [...aps].sort((a, b) => order[a.status] - order[b.status]);
    return { total: aps.length, down, up, unknown, sorted };
  }, [aps]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estado de APs</h1>
          <p className="text-sm text-slate-500">Vista consolidada de todos los Access Points monitoreados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total APs" value={total} tone="neutral" />
        <SummaryCard label="APs caídos" value={down} tone="danger" />
        <SummaryCard label="APs activos" value={up} tone="ok" />
      </div>

      {aps.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">No hay datos cargados.</p>
          <Link
            to="/carga"
            className="mt-3 inline-flex items-center justify-center rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Ir a Carga de Datos
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">
            Access Points ({total}){unknown > 0 && <span className="ml-2 text-slate-400">· {unknown} desconocidos</span>}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">AP</th>
                <th className="px-4 py-2 font-medium">Sitio</th>
                <th className="px-4 py-2 font-medium">Último visto</th>
                <th className="px-4 py-2 font-medium">Uptime</th>
                <th className="px-4 py-2 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ap) => (
                <tr
                  key={ap.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    ap.status === "down" ? "bg-red-50/60" : ""
                  }`}
                >
                  <td className="px-4 py-2.5"><StatusBadge status={ap.status} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-900">{ap.name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{ap.site}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    <div>{formatRelative(ap.lastSeen)}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(ap.lastSeen)}</div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-700">{ap.uptime}</td>
                  <td className="px-4 py-2.5 text-slate-600">{ap.notes || <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
