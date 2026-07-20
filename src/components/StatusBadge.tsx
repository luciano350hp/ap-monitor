import type { APStatus } from "@/lib/ap-store";

const STYLES: Record<APStatus, { bg: string; dot: string; label: string }> = {
  up: { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500", label: "UP" },
  down: { bg: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500", label: "DOWN" },
  unknown: { bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", label: "UNKNOWN" },
};

export function StatusBadge({ status }: { status: APStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${s.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
