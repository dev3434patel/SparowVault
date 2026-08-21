import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  tone = "primary",
  height = 8,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "primary" | "income" | "expense" | "warning" | "goal" | "danger";
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const toneClass = {
    primary: "bg-[hsl(var(--primary))]",
    income: "bg-[hsl(var(--income))]",
    expense: "bg-[hsl(var(--expense))]",
    warning: "bg-[hsl(var(--warning))]",
    goal: "bg-[hsl(var(--goal))]",
    danger: "bg-[hsl(var(--danger))]",
  }[tone];
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-3",
        className,
      )}
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", toneClass, barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
