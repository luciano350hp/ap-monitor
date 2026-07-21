import { statusColor, statusLabel, type DeviceStatusRaw } from "@/lib/devices";

export function DeviceStatusBadge({ status }: { status: DeviceStatusRaw }) {
  const c = statusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {statusLabel(status)}
    </span>
  );
}
