import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useMessages } from "@/i18n/useMessages";

export type DataConfidence =
  | "actual"
  | "imported"
  | "user_confirmed"
  | "estimated"
  | "projected"
  | "needs_review";

const TONES: Record<DataConfidence, string> = {
  actual: "bg-emerald-100 text-emerald-800 border-emerald-200",
  imported: "bg-sky-100 text-sky-800 border-sky-200",
  user_confirmed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  estimated: "bg-amber-100 text-amber-900 border-amber-200",
  projected: "bg-slate-100 text-slate-700 border-slate-200",
  needs_review: "bg-rose-100 text-rose-800 border-rose-200",
};

export function DataConfidenceBadge({
  confidence,
  className,
}: {
  confidence: DataConfidence;
  className?: string;
}) {
  const label = useMessages().ui.confidence[confidence];
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", TONES[confidence], className)}
      title={label}
    >
      {label}
    </Badge>
  );
}
