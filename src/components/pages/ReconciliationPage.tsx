import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDataStore } from "@/store/dataStore";
import { useNavStore } from "@/store/navStore";
import { useUIStore } from "@/store/uiStore";
import { suggestTransferMatches, findOrphanTransactions } from "@/services/reconciliationEngine";
import { formatINR, formatDate } from "@/lib/format";
import { paiseToRupees, transactionAmountPaise } from "@/utils/money";

export function ReconciliationPage() {
  const transactions = useDataStore((s) => s.transactions);
  const accounts = useDataStore((s) => s.accounts);
  const setActive = useNavStore((s) => s.setActive);
  const toast = useUIStore((s) => s.toast);

  const orphans = useMemo(() => findOrphanTransactions(transactions), [transactions]);
  const transferSuggestions = useMemo(
    () => suggestTransferMatches(transactions),
    [transactions],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Review orphans, duplicate risks, and suggested transfer matches."
      />
      <Card>
        <CardHeader><CardTitle>Orphan transactions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {orphans.length === 0 ? (
            <p className="text-muted-foreground">No orphan rows detected.</p>
          ) : (
            orphans.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{t.type} · {formatDate(t.date)}</span>
                <div className="flex items-center gap-2">
                  <span>{formatINR(paiseToRupees(transactionAmountPaise(t)))}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActive("transactions");
                      toast({ title: "Opened Transactions — find this row by date/amount", kind: "info" });
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Transfer match suggestions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transferSuggestions.length === 0 ? (
            <p className="text-muted-foreground">No transfer pairs suggested.</p>
          ) : (
            transferSuggestions.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActive("transactions");
                    toast({
                      title: "Review transfer pair in Transactions",
                      description: s.label,
                      kind: "info",
                    });
                  }}
                >
                  Review
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {accounts.filter((a) => a.isDeleted !== 1).length} active accounts tracked for balance reconciliation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
