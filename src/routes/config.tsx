import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DEFAULT_THRESHOLDS, useThresholds } from "@/lib/devices";

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "Configuración — AP Down Monitor" },
      { name: "description", content: "Umbrales de estado y endpoint de webhook para integraciones externas." },
      { property: "og:title", content: "Configuración — AP Down Monitor" },
      { property: "og:description", content: "Umbrales de estado y endpoint de webhook para integraciones externas." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const [thresholds, setThresholds] = useThresholds();
  const [degraded, setDegraded] = useState(thresholds.degradedLatencyMs);
  const [unknownMin, setUnknownMin] = useState(thresholds.unknownAfterMinutes);
  const [saved, setSaved] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/devices/upsert`
      : "/api/public/devices/upsert";

  function save() {
    setThresholds({ degradedLatencyMs: degraded, unknownAfterMinutes: unknownMin });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function reset() {
    setDegraded(DEFAULT_THRESHOLDS.degradedLatencyMs);
    setUnknownMin(DEFAULT_THRESHOLDS.unknownAfterMinutes);
    setThresholds(DEFAULT_THRESHOLDS);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500">Reglas de estado y endpoint de ingesta.</p>
      </div>

      <section className="rounded border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Umbrales de estado</h2>
        <p className="text-xs text-slate-500">
          Se aplican en el cliente sobre los datos recibidos. No modifican el estado en base.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Latencia &gt; X ms = DEGRADED</span>
            <input
              type="number" min={1} max={10000}
              value={degraded}
              onChange={(e) => setDegraded(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Sin update por X min = UNKNOWN</span>
            <input
              type="number" min={1} max={1440}
              value={unknownMin}
              onChange={(e) => setUnknownMin(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">
            Guardar
          </button>
          <button onClick={reset} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Restaurar defaults
          </button>
          {saved && <span className="text-xs text-emerald-700">Guardado ✓</span>}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Webhook de ingesta</h2>
        <p className="text-xs text-slate-500">
          Endpoint público para recibir upserts (una fila o un array). Autenticación por header
          <code className="mx-1 rounded bg-slate-100 px-1">x-webhook-secret</code>.
          La clave está guardada como <code className="rounded bg-slate-100 px-1">DEVICE_WEBHOOK_SECRET</code> en el backend.
        </p>
        <div className="rounded bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto">
          POST {webhookUrl}
        </div>
        <div className="rounded bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre">
{`curl -X POST '${webhookUrl}' \\
  -H 'content-type: application/json' \\
  -H 'x-webhook-secret: <DEVICE_WEBHOOK_SECRET>' \\
  -d '{
    "ip": "10.10.2.15",
    "site": "Tigre Norte",
    "status": "down",
    "last_seen": "2026-07-21T14:15:00-03:00",
    "latency_ms": null,
    "notes": "No responde ping"
  }'`}
        </div>
        <p className="text-xs text-slate-500">
          Clave única: <code>ip</code>. Estados aceptados: <code>up</code>, <code>down</code>, <code>degraded</code>, <code>unknown</code>.
        </p>
      </section>
    </div>
  );
}
