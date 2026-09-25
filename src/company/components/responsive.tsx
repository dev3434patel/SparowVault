import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared responsive class tokens — prefer these over one-off breakpoints. */
export const R = {
  /** Show only below md (≤767) — card lists, bottom nav. */
  mobileOnly: "md:hidden",
  /** Show only at md+ — desktop tables, sidebar. */
  desktopOnly: "hidden md:block",
  desktopFlex: "hidden md:flex",
  /** Stack on mobile, row on sm+. */
  stackToRow: "flex flex-col gap-2 sm:flex-row sm:items-end",
  /** Dense action grids that must not overflow at 320. */
  actionGrid: "grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  /** Page body padding already on shell; keep content min-w-0. */
  content: "min-w-0 w-full max-w-full",
} as const;

/**
 * Horizontal scroll container with a visible edge fade on narrow viewports
 * so tables never silently clip.
 */
export function ScrollTable({
  children,
  className,
  bodyClassName,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)} data-responsive-table>
      <div
        className={cn(
          "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          bodyClassName,
        )}
        data-scroll-affordance="x"
      >
        {children}
      </div>
      <div
        aria-hidden
        data-scroll-hint
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card via-card/80 to-transparent",
          "md:hidden",
        )}
      />
    </div>
  );
}

/** Mobile card stack ↔ desktop table shell. */
export function ResponsiveList({
  mobile,
  desktop,
  className,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)} data-responsive-list>
      <div className={R.mobileOnly}>{mobile}</div>
      <div className={R.desktopOnly}>{desktop}</div>
    </div>
  );
}
