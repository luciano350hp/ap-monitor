import { useSyncExternalStore } from "react";

export type APStatus = "up" | "down" | "unknown";

export interface AP {
  id: string;
  name: string;
  site: string;
  status: APStatus;
  lastSeen: string; // ISO
  uptime: string;
  notes: string;
}

const STORAGE_KEY = "ap-down-monitor:aps";

let cache: AP[] = [];
const listeners = new Set<() => void>();

function load(): AP[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AP[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

// hydrate on module load (browser)
if (typeof window !== "undefined") {
  cache = load();
}

export const apStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): AP[] {
    return cache;
  },
  getServerSnapshot(): AP[] {
    return [];
  },
  setAll(aps: AP[]) {
    cache = aps;
    persist();
  },
  add(ap: Omit<AP, "id">) {
    cache = [...cache, { ...ap, id: crypto.randomUUID() }];
    persist();
  },
  addMany(aps: Omit<AP, "id">[]) {
    const withIds = aps.map((a) => ({ ...a, id: crypto.randomUUID() }));
    cache = [...cache, ...withIds];
    persist();
  },
  remove(id: string) {
    cache = cache.filter((a) => a.id !== id);
    persist();
  },
  clear() {
    cache = [];
    persist();
  },
};

export function useAPs(): AP[] {
  return useSyncExternalStore(apStore.subscribe, apStore.getSnapshot, apStore.getServerSnapshot);
}

export const DEMO_DATA: Omit<AP, "id">[] = [
  { name: "AP-CORP-01", site: "HQ Bogotá", status: "up", lastSeen: new Date(Date.now() - 60_000).toISOString(), uptime: "45d 12h", notes: "" },
  { name: "AP-CORP-02", site: "HQ Bogotá", status: "down", lastSeen: new Date(Date.now() - 3600_000 * 2).toISOString(), uptime: "0m", notes: "PoE switch reset requerido" },
  { name: "AP-CORP-03", site: "HQ Bogotá", status: "up", lastSeen: new Date(Date.now() - 90_000).toISOString(), uptime: "12d 3h", notes: "" },
  { name: "AP-SUC-MED-01", site: "Sucursal Medellín", status: "down", lastSeen: new Date(Date.now() - 3600_000 * 8).toISOString(), uptime: "0m", notes: "Sin energía reportado" },
  { name: "AP-SUC-MED-02", site: "Sucursal Medellín", status: "up", lastSeen: new Date(Date.now() - 120_000).toISOString(), uptime: "89d 4h", notes: "" },
  { name: "AP-SUC-CAL-01", site: "Sucursal Cali", status: "up", lastSeen: new Date(Date.now() - 45_000).toISOString(), uptime: "23d 1h", notes: "" },
  { name: "AP-SUC-CAL-02", site: "Sucursal Cali", status: "unknown", lastSeen: new Date(Date.now() - 3600_000 * 24).toISOString(), uptime: "-", notes: "Sin datos del controlador" },
  { name: "AP-DC-01", site: "Data Center", status: "up", lastSeen: new Date(Date.now() - 30_000).toISOString(), uptime: "180d 6h", notes: "" },
  { name: "AP-DC-02", site: "Data Center", status: "up", lastSeen: new Date(Date.now() - 40_000).toISOString(), uptime: "175d 2h", notes: "" },
  { name: "AP-BOD-01", site: "Bodega Norte", status: "down", lastSeen: new Date(Date.now() - 3600_000 * 15).toISOString(), uptime: "0m", notes: "Ticket #4821 abierto" },
];

export function parseCSV(text: string): Omit<AP, "id">[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    name: header.indexOf("ap name"),
    site: header.indexOf("site"),
    status: header.indexOf("status"),
    lastSeen: header.indexOf("last seen"),
    uptime: header.indexOf("uptime"),
    notes: header.indexOf("notes"),
  };
  const rows: Omit<AP, "id">[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const status = (cols[idx.status] || "unknown").toLowerCase();
    rows.push({
      name: cols[idx.name] || `AP-${i}`,
      site: cols[idx.site] || "Sin sitio",
      status: (status === "up" || status === "down" ? status : "unknown") as APStatus,
      lastSeen: cols[idx.lastSeen] || new Date().toISOString(),
      uptime: cols[idx.uptime] || "-",
      notes: cols[idx.notes] || "",
    });
  }
  return rows;
}
