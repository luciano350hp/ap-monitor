import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { DeviceStatusBadge } from "@/components/DeviceStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { deriveStatus, useDevice, useThresholds } from "@/lib/devices";
import { formatDateTime, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/devices/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de dispositivo — AP Down Monitor" },
      { name: "description", content: "Estado actual, historial y notas del dispositivo monitoreado." },
      { property: "og:title", content: "Detalle de dispositivo — AP Down Monitor" },
      { property: "og:description", content: "Estado actual, historial y notas del dispositivo monitoreado." },
    ],
  }),
  component: DeviceDetailPage,
});

function DeviceDetailPage() {
  const { id } = Route.useParams();
  const { device, loading } = useDevice(id);
  const [thresholds] = useThresholds();
  const router = useRouter();
  const [ackNote, setAckNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="text-sm text-slate-500">Cargando dispositivo…</div>;
  if (!device) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-700">Dispositivo no encontrado.</p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm text-sky-700 hover:underline">← Volver al dashboard</Link>
      </div>
    );
  }

  const effective = deriveStatus(device, thresholds);

  async function refresh() {
    await router.invalidate();
  }

  async function acknowledge() {
    setSaving(true);
    const stamp = new Date().toLocaleString("es-AR");
    const merged = `[ACK ${stamp}] ${ackNote || "Reconocido por NOC"}\n${device?.notes ?? ""}`.trim();
    await supabase.from("devices").update({ notes: merged }).eq("id", id);
    setAckNote("");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-xs text-sky-700 hover:underline">← Dashboard</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 font-mono">{device.ip}</h1>
          <DeviceStatusBadge status={effective} />
        </div>
        <p className="text-sm text-slate-500 mt-1">{device.site}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Estado reportado" value={device.status.toUpperCase()} />
        <Field label="Estado efectivo" value={effective.toUpperCase()} />
        <Field label="Latencia" value={device.latency_ms != null ? `${device.latency_ms} ms` : "—"} />
        <Field label="Último contacto" value={device.last_seen ? `${formatDateTime(device.last_seen)} (${formatRelative(device.last_seen)})` : "—"} />
        <Field label="Actualizado" value={`${formatDateTime(device.updated_at)} (${formatRelative(device.updated_at)})`} />
        <Field label="Creado" value={formatDateTime(device.created_at)} />
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold tracking-wider text-slate-500 mb-2">NOTAS</div>
        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{device.notes || "Sin notas."}</pre>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-xs font-semibold tracking-wider text-slate-500">ACCIONES</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            Refrescar
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
            placeholder="Nota de reconocimiento (opcional)"
            className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={acknowledge}
            disabled={saving}
            className="inline-flex items-center rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Marcar como reconocido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}
