import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { apStore, parseCSV, DEMO_DATA, useAPs, type APStatus } from "@/lib/ap-store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/carga")({
  component: UploadPage,
});

function UploadPage() {
  const aps = useAPs();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    site: "",
    status: "up" as APStatus,
    lastSeen: new Date().toISOString().slice(0, 16),
    uptime: "",
    notes: "",
  });

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("No se encontraron filas válidas en el CSV.");
        return;
      }
      apStore.addMany(rows);
      toast.success(`${rows.length} APs cargados desde CSV.`);
    } catch {
      toast.error("Error al leer el archivo.");
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.site.trim()) {
      toast.error("Nombre y sitio son requeridos.");
      return;
    }
    apStore.add({
      name: form.name.trim(),
      site: form.site.trim(),
      status: form.status,
      lastSeen: new Date(form.lastSeen).toISOString(),
      uptime: form.uptime.trim() || "-",
      notes: form.notes.trim(),
    });
    toast.success(`AP "${form.name}" agregado.`);
    setForm({ ...form, name: "", uptime: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Carga de Datos</h1>
        <p className="text-sm text-slate-500">
          Sube un archivo CSV, ingresa APs manualmente o carga datos de demostración.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* CSV */}
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Cargar CSV</h2>
          <p className="mt-1 text-xs text-slate-500">
            Columnas: <code className="text-slate-700">AP name, site, status, last seen, uptime, notes</code>
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

        {/* Demo */}
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos de demostración</h2>
          <p className="mt-1 text-xs text-slate-500">
            Carga {DEMO_DATA.length} APs de ejemplo en varios sitios para probar la vista.
          </p>
          <button
            onClick={() => {
              apStore.addMany(DEMO_DATA);
              toast.success(`${DEMO_DATA.length} APs de demo cargados.`);
            }}
            className="mt-4 w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Cargar datos demo
          </button>
        </section>

        {/* Limpiar */}
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Administrar</h2>
          <p className="mt-1 text-xs text-slate-500">
            Actualmente hay <strong className="text-slate-900">{aps.length}</strong> APs registrados.
          </p>
          <button
            onClick={() => {
              if (confirm("¿Eliminar todos los APs registrados?")) {
                apStore.clear();
                toast.success("Datos eliminados.");
              }
            }}
            className="mt-4 w-full rounded border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Limpiar todos los datos
          </button>
        </section>
      </div>

      {/* Manual entry */}
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Ingresar AP manualmente</h2>
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Nombre AP
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="AP-CORP-01"
              required
            />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Sitio
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              placeholder="HQ Bogotá"
              required
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Estado
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as APStatus })}
            >
              <option value="up">UP</option>
              <option value="down">DOWN</option>
              <option value="unknown">UNKNOWN</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Uptime
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.uptime}
              onChange={(e) => setForm({ ...form, uptime: e.target.value })}
              placeholder="45d 12h"
            />
          </label>
          <label className="md:col-span-2 text-xs font-medium text-slate-600">
            Último visto
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.lastSeen}
              onChange={(e) => setForm({ ...form, lastSeen: e.target.value })}
            />
          </label>
          <label className="md:col-span-4 text-xs font-medium text-slate-600">
            Notas
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ticket asociado, contexto, etc."
            />
          </label>
          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Agregar AP
            </button>
          </div>
        </form>
      </section>

      {aps.length > 0 && (
        <section className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-600">
            APs registrados ({aps.length})
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">AP</th>
                <th className="px-4 py-2 font-medium">Sitio</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {aps.map((ap) => (
                <tr key={ap.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{ap.name}</td>
                  <td className="px-4 py-2 text-slate-700">{ap.site}</td>
                  <td className="px-4 py-2 uppercase text-xs text-slate-600">{ap.status}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => apStore.remove(ap.id)}
                      className="text-xs text-red-600 hover:underline"
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
