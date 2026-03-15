import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

const STATUS_STYLES: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  },
  processing: {
    label: "Processing",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50",
  },
  paid: {
    label: "Paid",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  },
  shipped: {
    label: "Shipped",
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-50",
  },
  delivered: {
    label: "Delivered",
    className:
      "border-green-200 bg-green-50 text-green-800 hover:bg-green-50",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-50",
  },
  refunded: {
    label: "Refunded",
    className:
      "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-100",
  },
  failed: {
    label: "Failed",
    className:
      "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
  },
  low_stock: {
    label: "Low stock",
    className:
      "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-50",
  },
  out_of_stock: {
    label: "Out of stock",
    className:
      "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
  },
  in_stock: {
    label: "In stock",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  },
  draft: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100",
  },
  active: {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  },
  archived: {
    label: "Archived",
    className:
      "border-stone-200 bg-stone-100 text-stone-800 hover:bg-stone-100",
  },
};

function toKey(status: string | null | undefined) {
  return (status || "unknown").trim().toLowerCase().replace(/\s+/g, "_");
}

function toLabel(status: string | null | undefined) {
  if (!status || !status.trim()) return "Unknown";

  return status
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = toKey(status);
  const config = STATUS_STYLES[key];

  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", config?.className, className)}
    >
      {config?.label || toLabel(status)}
    </Badge>
  );
}

export default StatusBadge;