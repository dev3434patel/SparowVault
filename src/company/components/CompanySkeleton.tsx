import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Shared pulse block — matches card/table geometry to avoid layout shift. */
function Pulse({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} style={style} aria-hidden />;
}

export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading KPIs">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <Pulse className="mb-3 h-3 w-20" />
          <Pulse className="h-7 w-28" />
          <Pulse className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <Pulse className="h-4 w-32" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: lines }).map((_, i) => (
          <Pulse key={i} className={cn("h-4", i % 2 === 0 ? "w-full" : "w-3/4")} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
      role="status"
      aria-label="Loading table"
    >
      <div className="grid gap-2 border-b border-border bg-[hsl(var(--surface))]/60 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-3 w-16" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-2 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Pulse key={c} className={cn("h-4", c === 0 ? "w-24" : "w-16")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-16 items-center gap-3 rounded-xl border border-border bg-card px-4 shadow-[var(--shadow-card)]"
        >
          <Pulse className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-4 w-40" />
            <Pulse className="h-3 w-24" />
          </div>
          <Pulse className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-48 items-end gap-2 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]",
        className,
      )}
      role="status"
      aria-label="Loading chart"
    >
      {[40, 65, 35, 80, 55, 70, 45].map((h, i) => (
        <Pulse key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
