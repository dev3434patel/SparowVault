import { useUIStore } from "@/store/uiStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon =
            t.kind === "success"
              ? CheckCircle2
              : t.kind === "error"
                ? AlertCircle
                : t.kind === "warning"
                  ? AlertTriangle
                  : Info;
          const toneBorder =
            t.kind === "success"
              ? "border-l-income"
              : t.kind === "error"
                ? "border-l-danger"
                : t.kind === "warning"
                  ? "border-l-warning"
                  : "border-l-[hsl(var(--primary))]";
          const iconColor =
            t.kind === "success"
              ? "text-income"
              : t.kind === "error"
                ? "text-danger"
                : t.kind === "warning"
                  ? "text-warning"
                  : "text-primary";
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 bg-[hsl(var(--card))] p-3 pr-2 shadow-[var(--shadow-elevated)]",
                toneBorder,
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.title}</div>
                {t.description ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-[hsl(var(--foreground))] rounded p-1"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
