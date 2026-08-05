import type { DeviceCSVRow } from "./csv";

const mins = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const DEMO_DEVICES: DeviceCSVRow[] = [
  { ip: "10.10.1.11", ap_name: "AP-CABA-01", site: "CABA - Microcentro", status: "up", last_seen: mins(1), latency_ms: 12, notes: null },
  { ip: "10.10.1.12", ap_name: "AP-CABA-02", site: "CABA - Microcentro", status: "down", last_seen: mins(180), latency_ms: null, notes: "Switch PoE sin energía" },
  { ip: "10.10.2.11", ap_name: "AP-BSAS-01", site: "Buenos Aires - La Plata", status: "up", last_seen: mins(2), latency_ms: 28, notes: null },
  { ip: "10.10.2.12", ap_name: "AP-BSAS-02", site: "Buenos Aires - La Plata", status: "degraded", last_seen: mins(3), latency_ms: 320, notes: "Enlace saturado" },
  { ip: "10.10.3.11", ap_name: "AP-CBA-01", site: "Córdoba - Centro", status: "up", last_seen: mins(1), latency_ms: 19, notes: null },
  { ip: "10.10.3.12", ap_name: "AP-CBA-02", site: "Córdoba - Centro", status: "down", last_seen: mins(420), latency_ms: null, notes: "Ticket #4821" },
  { ip: "10.10.4.11", ap_name: "AP-ROS-01", site: "Santa Fe - Rosario", status: "up", last_seen: mins(2), latency_ms: 33, notes: null },
  { ip: "10.10.5.11", ap_name: "AP-MZA-01", site: "Mendoza - Ciudad", status: "unknown", last_seen: mins(900), latency_ms: null, notes: "Sin datos del colector" },
  { ip: "10.10.6.11", ap_name: "AP-NQN-01", site: "Neuquén - Capital", status: "up", last_seen: mins(4), latency_ms: 45, notes: null },
  { ip: "10.10.7.11", ap_name: "AP-SLT-01", site: "Salta - Capital", status: "down", last_seen: mins(60), latency_ms: null, notes: "Corte de fibra" },
];
