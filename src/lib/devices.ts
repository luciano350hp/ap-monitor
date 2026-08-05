import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DeviceStatusRaw = "up" | "down" | "degraded" | "unknown";

export interface Device {
  id: string;
  ip: string;
  ap_name: string | null;
  site: string;

  status: DeviceStatusRaw;
  last_seen: string | null;
  latency_ms: number | null;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export interface Thresholds {
  degradedLatencyMs: number;
  unknownAfterMinutes: number;
}

const THRESHOLDS_KEY = "ap-down-monitor:thresholds";
export const DEFAULT_THRESHOLDS: Thresholds = {
  degradedLatencyMs: 200,
  unknownAfterMinutes: 10,
};

export function loadThresholds(): Thresholds {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(THRESHOLDS_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<Thresholds>;
    return { ...DEFAULT_THRESHOLDS, ...parsed };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholds(t: Thresholds) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(t));
  window.dispatchEvent(new Event("thresholds:changed"));
}

export function useThresholds(): [Thresholds, (t: Thresholds) => void] {
  const [t, setT] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  useEffect(() => {
    setT(loadThresholds());
    const h = () => setT(loadThresholds());
    window.addEventListener("thresholds:changed", h);
    return () => window.removeEventListener("thresholds:changed", h);
  }, []);
  return [t, (next) => { saveThresholds(next); setT(next); }];
}

export function deriveStatus(d: Device, t: Thresholds): DeviceStatusRaw {
  if (d.status === "down") return "down";
  if (!d.last_seen) return "unknown";
  const ageMin = (Date.now() - new Date(d.last_seen).getTime()) / 60000;
  if (ageMin > t.unknownAfterMinutes) return "unknown";
  if (d.latency_ms != null && d.latency_ms > t.degradedLatencyMs) return "degraded";
  if (d.status === "degraded") return "degraded";
  if (d.status === "unknown") return "unknown";
  return "up";
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("devices")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setError(error.message);
        else setDevices((data ?? []) as Device[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("devices-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        (payload) => {
          setDevices((prev) => {
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string })?.id;
              return prev.filter((d) => d.id !== oldId);
            }
            const row = payload.new as Device;
            const idx = prev.findIndex((d) => d.id === row.id);
            if (idx === -1) return [row, ...prev];
            const copy = prev.slice();
            copy[idx] = row;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { devices, loading, error };
}

export function useDevice(id: string) {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("devices").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!mounted) return;
      setDevice((data as Device) ?? null);
      setLoading(false);
    });

    const channel = supabase
      .channel(`device-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "DELETE") setDevice(null);
          else setDevice(payload.new as Device);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  return { device, loading };
}

export function statusLabel(s: DeviceStatusRaw): string {
  return { up: "OPERATIVO", down: "CAÍDO", degraded: "DEGRADADO", unknown: "SIN DATOS" }[s];
}

export function statusColor(s: DeviceStatusRaw): { bg: string; text: string; dot: string } {
  return {
    up:       { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
    down:     { bg: "bg-red-100",     text: "text-red-800",     dot: "bg-red-500" },
    degraded: { bg: "bg-amber-100",   text: "text-amber-900",   dot: "bg-amber-500" },
    unknown:  { bg: "bg-slate-200",   text: "text-slate-700",   dot: "bg-slate-400" },
  }[s];
}
