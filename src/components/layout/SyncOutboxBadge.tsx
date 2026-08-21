import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  listPendingSyncOutbox,
  pendingSyncCount,
  subscribeSyncOutbox,
} from "@/services/syncOutbox";
import { useUIStore } from "@/store/uiStore";

/** Badge: “Saved on device — waiting to sync” */
export function SyncOutboxBadge() {
  const [count, setCount] = useState(0);
  const toast = useUIStore((s) => s.toast);

  useEffect(() => {
    const refresh = () => setCount(pendingSyncCount());
    refresh();
    return subscribeSyncOutbox(refresh);
  }, []);

  if (count <= 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="relative gap-1.5 text-xs"
      title="Saved on this device — waiting to sync"
      aria-label={`${count} items waiting to sync`}
      onClick={() => {
        const pending = listPendingSyncOutbox().slice(0, 5);
        const detail = pending
          .map((p) => `${p.collection}:${p.entityId.slice(0, 8)}… (${p.state})`)
          .join(" · ");
        toast({
          title: `${count} change${count === 1 ? "" : "s"} waiting to sync`,
          description: detail || "Saved on this device — will sync when online.",
          kind: "warning",
        });
      }}
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Waiting to sync</span>
      <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">
        {count > 9 ? "9+" : count}
      </span>
    </Button>
  );
}
