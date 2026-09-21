import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { CloudOff, CloudCheck, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useDataStore, type DataCollections } from "@/store/dataStore";
import { getDB } from "@/db/database";
import type { CloudCollectionKey } from "@/lib/cloud/collections";
import { pendingMutations, replayMutations, useServerVersion, type DurableMutation } from "@/services/durableOutbox";

const storeCollections: Partial<Record<CloudCollectionKey, keyof DataCollections>> = {
  accounts: "accounts", cards: "cards", categories: "categories", transactions: "transactions",
  budgets: "budgets", goals: "goals", goalContributions: "goalContribs", loans: "loans",
  emiPayments: "emis", udhari: "udhari", udhariSettlements: "udhariSettlements",
  investments: "investments", savingsContributions: "savingsContribs", reminders: "reminders",
  alerts: "alerts", recurringRules: "recurringRules", exportHistory: "exportHistory", auditLogs: "auditLogs",
};

export function SyncOutboxBadge() {
  const user = useAuthStore(s => s.currentUser);
  const [items, setItems] = useState<DurableMutation[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useUIStore(s => s.toast);
  const requestConfirm = useUIStore(s => s.requestConfirm);
  const pending = items.filter(item => item.userId === user?.id);

  useEffect(() => {
    if (!user) return;
    const subscription = liveQuery(() => pendingMutations(getDB(), user.id)).subscribe({
      next: rows => { setItems(rows); setError(""); },
      error: error => setError(error instanceof Error ? error.message : "Device sync storage is unavailable"),
    });
    return () => subscription.unsubscribe();
  }, [user?.id]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    catch (error) { toast({ title: "Sync needs attention", description: error instanceof Error ? error.message : "Sync failed", kind: "error" }); }
    finally { setBusy(false); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), mutations: pending }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sparowvault-pending-changes.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!pending.length && !error && !open) return null;
  const needsReview = pending.some(item => item.state === "rejected" || item.state === "conflict");

  return (
    <>
      <Button variant="outline" size="sm" title="Review pending changes" aria-label={`${pending.length} pending changes`} onClick={() => setOpen(true)} className="gap-1.5 text-xs">
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{error || needsReview ? "Sync needs review" : "Waiting to sync"}</span>
        <span className="min-w-4 tabular-nums">{pending.length}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Pending Changes</DialogTitle></DialogHeader>
          {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{pending.length} unsynchronized {pending.length === 1 ? "change" : "changes"}</span>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="icon" title="Download pending changes" aria-label="Download pending changes" disabled={!pending.length} onClick={download}><Download className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Retry synchronization" aria-label="Retry synchronization" disabled={busy || !user} onClick={() => void run(() => replayMutations(getDB(), user!.id, () => useAuthStore.getState().currentUser?.id === user!.id))}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {pending.map(item => (
              <div key={item.mutationId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="text-sm font-medium break-words">{item.collection} / {item.operation}</div>
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.entityId}</div>
                  <div className="mt-1 text-xs capitalize">{item.state}</div>
                  {item.error && <p className="mt-1 break-words text-xs text-danger">{item.error}</p>}
                </div>
                {(item.state === "conflict" || item.state === "rejected") && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => {
                    const confirmed = await requestConfirm({ title: "Discard local changes?", description: "All pending changes for this record will be replaced with the server version. Download pending changes first to retain a copy.", destructive: true, confirmLabel: "Use server version" });
                    if (!confirmed || useAuthStore.getState().currentUser?.id !== item.userId) return;
                    await useServerVersion(getDB(), item);
                    const activeUser = useAuthStore.getState().currentUser;
                    if (activeUser?.id !== item.userId) return;
                    const collection = storeCollections[item.collection];
                    if (collection) await useDataStore.getState().refreshOne(collection, activeUser);
                    // Independent page state must also discard its optimistic projection.
                    else window.location.reload();
                  })}><CloudCheck className="mr-2 h-4 w-4" />Use server version</Button>
                )}
              </div>
            ))}
            {!pending.length && <p className="py-6 text-center text-sm text-muted-foreground">No pending changes</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
