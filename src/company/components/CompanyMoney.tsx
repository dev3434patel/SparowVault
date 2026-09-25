import { formatMoney } from "@/utils/money";
import { cn } from "@/lib/utils";

export type MoneySemantic = "neutral" | "debit" | "credit" | "profit" | "loss" | "overdue";

export function CompanyMoney({
  paise,
  semantic = "neutral",
  className,
  showSign = false,
}: {
  paise: number;
  semantic?: MoneySemantic;
  className?: string;
  showSign?: boolean;
}) {
  const abs = Math.abs(paise);
  const prefix = showSign ? (paise < 0 ? "−" : paise > 0 ? "+" : "") : "";
  return (
    <span
      className={cn(
        "tabular-nums font-semibold tracking-tight text-foreground",
        semantic === "profit" && "text-[hsl(var(--income))]",
        semantic === "loss" && "text-[hsl(var(--expense))]",
        semantic === "overdue" && "text-[hsl(var(--expense))]",
        semantic === "credit" && "text-[hsl(var(--income))]",
        semantic === "debit" && "text-[hsl(var(--info))]",
        className,
      )}
    >
      {prefix}
      {formatMoney(abs)}
    </span>
  );
}
