import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useServerFn } from "@tanstack/react-start";
import { parseDevicesCSV, CSV_MAX_ROWS, type DeviceCSVRow } from "@/lib/csv";
import { DEMO_DEVICES } from "@/lib/demo-devices";
import { upsertDevices, deleteDevice, clearDevices } from "@/lib/devices.functions";
import { useDevices } from "@/lib/devices";

export const Route = createFileRoute("/carga")({
  head: () => ({
    meta: [
      { title: "Carga de Datos — AP Down Monitor" },
      { name: "description", content: "Cargá dispositivos por CSV, manualmente o con datos demo directo a la base." },
      { property: "og:title", content: "Carga de Datos — AP Down Monitor" },
      { property: "og:description", content: "Cargá dispositivos por CSV, manualmente o con datos demo directo a la base." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { devices, loading } = useDevices();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rows: DeviceCSVRow[]; errors: { line: number; message: string }[]; truncated: boolean } | null>(null);

  const doUpsert = useServerFn(upsertDevices);
  const doDelete = useServerFn(deleteDevice);
  const doClear = useServerFn(clearDevices);

  const [form, setForm] = useState({
    ip: "",
    ap_name: "",
    site: "",
    status: "up" as DeviceCSVRow["status"],
    last_seen: new Date().toISOString().slice(0, 16),
    latency_ms: "",
    notes: "",
  });

  const save = async (rows: DeviceCSVRow[], label: string) => {
    setBusy(true);
    try {
      const res = await doUpsert({ data: { devices: rows } });
      toast.success(`${res.upserted} dispositivos guardados (${label}).`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseDevicesCSV(text);
    setPreview(result);
    if (result.rows.length === 0) toast.error("No hay filas válidas en el CSV.");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ip = form.ip.trim() || form.ap_name.trim();
    if (!ip || !form.site.trim()) {
      toast.error("IP (o nombre) y sitio son requeridos.");
      return;
    }
    const lat = form.latency_ms.trim() ? Number(form.latency_ms) : null;
    if (lat != null && (!Number.isFinite(lat) || lat < 0)) {
      toast.error("La latencia debe ser un número mayor o igual a 0.");
      return;
    }
    const ls = new Date(form.last_seen);
    if (ls.getTime() > Date.now() + 60_000) {
      toast.error("'Último visto' no puede estar en el futuro.");
      return;
    }
    const ok = await save([{
      ip,
      ap_name: form.ap_name.trim() || null,
      site: form.site.trim(),
      status: form.status,
      last_seen: ls.toISOString(),
      latency_ms: lat != null ? Math.round(lat) : null,
      notes: form.notes.trim() || null,
    }], "manual");
    if (ok) setForm({ ...form, ip: "", ap_name: "", latency_ms: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Carga de Datos</h1>
        <p className="text-sm text-slate-500">
          Todo lo que cargues acá se guarda en la base y aparece en vivo en el <Link to="/dashboard" className="text-sky-700 hover:underline">Dashboard</Link>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Cargar CSV</h2>
          <p className="mt-1 text-xs text-slate-500">
            Columnas: <code className="text-slate-700">ip, AP name, site, status, last seen, latency_ms, notes</code>. Máximo {CSV_MAX_ROWS.toLocaleString("es-AR")} filas.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Seleccionar archivo CSV
          </button>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos de demostración</h2>
          <p className="mt-1 text-xs text-slate-500">Carga {DEMO_DEVICES.length} dispositivos de ejemplo en sitios argentinos.</p>
          <button
            disabled={busy}
            onClick={() => save(DEMO_DEVICES, "demo")}
            className="mt-4 w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Cargar datos demo
          </button>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Administrar</h2>
          <p className="mt-1 text-xs text-slate-500">
            Actualmente hay <strong className="text-slate-900">{loading ? "…" : devices.length}</strong> dispositivos en la base.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              if (!confirm("¿Eliminar todos los dispositivos de la base?")) return;
              setBusy(true);
              try {
                await doClear({});
                toast.success("Base vaciada.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error al borrar.");
              } finally {
                setBusy(false);
              }
            }}
            className="mt-4 w-full rounded border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Limpiar todos los datos
          </button>
        </section>
      </div>

      {preview && (
        <section className="rounded border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Vista previa: {preview.rows.length} filas válidas
              {preview.errors.length > 0 && <span className="ml-2 text-red-600">· {preview.errors.length} con error</span>}
              {preview.truncated && <span className="ml-2 text-amber-700">· recortado a {CSV_MAX_ROWS}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                disabled={busy || preview.rows.length === 0}
                onClick={async () => {
                  const ok = await save(preview.rows, "CSV");
                  if (ok) setPreview(null);
                }}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Confirmar carga
              </button>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <ul className="max-h-40 overflow-auto border-b border-slate-200 bg-red-50/50 px-4 py-2 text-xs text-red-700">
              {preview.errors.slice(0, 50).map((e, i) => (
                <li key={i}>Línea {e.line}: {e.message}</li>
              ))}
              {preview.errors.length > 50 && <li>… y {preview.errors.length - 50} errores más.</li>}
            </ul>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">Nombre AP</th>
                <th className="px-4 py-2 font-medium">Sitio</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Último visto</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 20).map((r) => (
                <tr key={r.ip} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{r.ip}</td>
                  <td className="px-4 py-2 text-slate-700">{r.ap_name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{r.site}</td>
                  <td className="px-4 py-2 text-xs uppercase text-slate-600">{r.status}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.last_seen ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Ingresar dispositivo manualmente</h2>
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            IP
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.ip}
              onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="10.10.1.11" required />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Nombre AP
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.ap_name}
              onChange={(e) => setForm({ ...form, ap_name: e.target.value })} placeholder="AP-CABA-01" />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Sitio
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="CABA - Microcentro" required />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Estado
            <select className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as DeviceCSVRow["status"] })}>
              <option value="up">UP</option>
              <option value="degraded">DEGRADED</option>
              <option value="down">DOWN</option>
              <option value="unknown">UNKNOWN</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Latencia (ms)
            <input type="number" min={0} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.latency_ms}
              onChange={(e) => setForm({ ...form, latency_ms: e.target.value })} placeholder="25" />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Último visto
            <input type="datetime-local" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.last_seen}
              onChange={(e) => setForm({ ...form, last_seen: e.target.value })} />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Notas
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ticket asociado, contexto, etc." />
          </label>
          <div className="md:col-span-6 flex justify-end">
            <button type="submit" disabled={busy}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              Guardar dispositivo
            </button>
          </div>
        </form>
      </section>

      {devices.length > 0 && (
        <section className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">
            Dispositivos en la base ({devices.length})
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">Nombre AP</th>
                <th className="px-4 py-2 font-medium">Sitio</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{d.ip}</td>
                  <td className="px-4 py-2 text-slate-700">{d.ap_name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{d.site}</td>
                  <td className="px-4 py-2 text-xs uppercase text-slate-600">{d.status}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await doDelete({ data: { id: d.id } });
                          toast.success("Dispositivo eliminado.");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Error al eliminar.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
