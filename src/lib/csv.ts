export interface DeviceCSVRow {
  ip: string;
  ap_name: string | null;
  site: string;
  status: "up" | "down" | "degraded" | "unknown";
  last_seen: string | null;
  latency_ms: number | null;
  notes: string | null;
}

export interface CSVParseResult {
  rows: DeviceCSVRow[];
  errors: { line: number; message: string }[];
  truncated: boolean;
}

export const CSV_MAX_ROWS = 5000;

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const ALIASES: Record<string, string[]> = {
  ip: ["ip", "ip address", "direccion ip", "dirección ip"],
  ap_name: ["ap name", "ap_name", "name", "nombre", "nombre ap"],
  site: ["site", "sitio"],
  status: ["status", "estado"],
  last_seen: ["last seen", "last_seen", "ultimo visto", "último visto"],
  latency_ms: ["latency_ms", "latency", "latencia", "latencia ms"],
  notes: ["notes", "notas"],
};

function findIdx(header: string[], key: keyof typeof ALIASES): number {
  for (const alias of ALIASES[key]) {
    const i = header.indexOf(alias);
    if (i !== -1) return i;
  }
  return -1;
}

export function parseDevicesCSV(text: string): CSVParseResult {
  const errors: CSVParseResult["errors"] = [];
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "Archivo vacío." }], truncated: false };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    ip: findIdx(header, "ip"),
    ap_name: findIdx(header, "ap_name"),
    site: findIdx(header, "site"),
    status: findIdx(header, "status"),
    last_seen: findIdx(header, "last_seen"),
    latency_ms: findIdx(header, "latency_ms"),
    notes: findIdx(header, "notes"),
  };

  if (idx.ip === -1 && idx.ap_name === -1) {
    return { rows: [], errors: [{ line: 1, message: "Falta la columna 'ip' o 'AP name'." }], truncated: false };
  }
  if (idx.site === -1) {
    return { rows: [], errors: [{ line: 1, message: "Falta la columna 'site'." }], truncated: false };
  }

  const dataLines = lines.slice(1);
  const truncated = dataLines.length > CSV_MAX_ROWS;
  const limited = dataLines.slice(0, CSV_MAX_ROWS);

  const seen = new Set<string>();
  const rows: DeviceCSVRow[] = [];
  const now = Date.now();

  limited.forEach((raw, i) => {
    const line = i + 2;
    const cols = splitLine(raw);
    const get = (k: number) => (k === -1 ? "" : (cols[k] ?? "").trim());

    const apName = get(idx.ap_name);
    const ip = get(idx.ip) || apName;
    const site = get(idx.site);

    if (!ip) { errors.push({ line, message: "IP/nombre vacío." }); return; }
    if (!site) { errors.push({ line, message: "Sitio vacío." }); return; }
    if (seen.has(ip)) { errors.push({ line, message: `IP duplicada en el archivo: ${ip}` }); return; }

    const statusRaw = get(idx.status).toLowerCase();
    const status = (["up", "down", "degraded", "unknown"].includes(statusRaw) ? statusRaw : "unknown") as DeviceCSVRow["status"];

    let last_seen: string | null = null;
    const ls = get(idx.last_seen);
    if (ls) {
      const d = new Date(ls);
      if (Number.isNaN(d.getTime())) { errors.push({ line, message: `Fecha inválida: "${ls}"` }); return; }
      if (d.getTime() > now + 60_000) { errors.push({ line, message: "'last seen' no puede estar en el futuro." }); return; }
      last_seen = d.toISOString();
    }

    let latency_ms: number | null = null;
    const lat = get(idx.latency_ms);
    if (lat) {
      const n = Number(lat);
      if (!Number.isFinite(n) || n < 0) { errors.push({ line, message: `Latencia inválida: "${lat}"` }); return; }
      latency_ms = Math.round(n);
    }

    seen.add(ip);
    rows.push({
      ip,
      ap_name: apName || null,
      site,
      status,
      last_seen,
      latency_ms,
      notes: get(idx.notes) || null,
    });
  });

  return { rows, errors, truncated };
}
