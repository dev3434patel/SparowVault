import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        secondary:
          "border-transparent bg-surface-2 text-[hsl(var(--foreground))]",
        outline:
          "border-border text-[hsl(var(--foreground))]",
        income:
          "border-transparent bg-income-soft text-income",
        expense:
          "border-transparent bg-expense-soft text-expense",
        warning:
          "border-transparent bg-warning-soft text-warning",
        info:
          "border-transparent bg-info-soft text-info",
        goal:
          "border-transparent bg-goal-soft text-[hsl(var(--goal))]",
        success:
          "border-transparent bg-income-soft text-income",
        danger:
          "border-transparent bg-expense-soft text-expense",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
