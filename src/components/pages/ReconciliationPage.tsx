import { useEffect, useMemo, useState } from "react";
import { statementReceiptQuery } from "@/services/statements/receiptLink";
import { useNavStore } from "@/store/navStore";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { reconciliationMatchRepo } from "@/repositories";
import { suggestTransferMatches, findOrphanTransactions } from "@/services/reconciliationEngine";
import { persistReconciliationDecision } from "@/services/personalBookWorkflows";
import { formatINR, formatDate } from "@/lib/format";
import { paiseToRupees, transactionAmountPaise } from "@/utils/money";
import type { ReconciliationMatch } from "@/types";
import { useMessages } from "@/i18n/useMessages";

export function ReconciliationPage() {
  const user = useAuthStore((s) => s.currentUser);
  const transactions = useDataStore((s) => s.transactions);
  const accounts = useDataStore((s) => s.accounts);
  const toast = useUIStore((s) => s.toast);
  const messages = useMessages();
  const copy = messages.ui.reconcile;
  const common = messages.ui.common;
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statementMatchIds, setStatementMatchIds] = useState<string[] | null>(null);
  const navActionId = useNavStore((s) => s.navActionId);

  useEffect(() => {
    setStatementMatchIds(statementReceiptQuery(window.location.search).matchIds);
  }, [navActionId]);

  const orphans = useMemo(() => findOrphanTransactions(transactions), [transactions]);
  const transferSuggestions = useMemo(
    () => suggestTransferMatches(transactions),
    [transactions],
  );

  async function reload() {
    if (!user) return;
    const rows = await reconciliationMatchRepo.list(user.id);
    setMatches(rows.filter((row) => row.isDeleted !== 1));
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  function statusFor(left: string, right?: string) {
    return matches.find(
      (row) => row.leftTransactionId === left && (row.rightTransactionId ?? "") === (right ?? ""),
    )?.status;
  }

  async function decide(
    action: "confirm" | "reject" | "unmatch",
    suggestion: { id: string; outTxId: string; inTxId: string; confidence: number },
  ) {
    if (!user || busyId) return;
    setBusyId(suggestion.id);
    try {
      await persistReconciliationDecision(user.id, action, {
        leftTransactionId: suggestion.outTxId,
        rightTransactionId: suggestion.inTxId,
        confidence: suggestion.confidence,
      });
      toast({
        title: action === "unmatch" ? copy.reset : action === "confirm" ? copy.confirmed : copy.rejected,
        kind: "success",
      });
      await reload();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.saveFailed, kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const importedMatches = statementMatchIds
    ? matches.filter((row) => statementMatchIds.includes(row.id))
    : [];

  return (
    <div className="space-y-6">
      <PersonalPageHeader screen="reconciliation" />
      {statementMatchIds ? (
        <Card>
          <CardHeader><CardTitle>Imported statement matches</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {importedMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imported matches are on this device yet.</p>
            ) : importedMatches.map((row) => (
              <div key={row.id} className="text-sm">
                <span className="font-medium">{row.status}</span>
                <span className="ml-2 break-all font-mono text-xs text-muted-foreground">{row.leftTransactionId}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {!statementMatchIds && <>
      <Card>
        <CardHeader><CardTitle>{copy.orphans}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {orphans.length === 0 ? (
            <p className="text-muted-foreground">{copy.noOrphans}</p>
          ) : (
            orphans.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{t.type} · {formatDate(t.date)}</span>
                <span>{formatINR(paiseToRupees(transactionAmountPaise(t)))}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{copy.suggestions}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {transferSuggestions.length === 0 ? (
            <p className="text-muted-foreground">{copy.noSuggestions}</p>
          ) : (
            transferSuggestions.slice(0, 10).map((suggestion) => (
              <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{suggestion.label}</span>
                <div className="flex items-center gap-2">
                  {statusFor(suggestion.outTxId, suggestion.inTxId) ? (
                    <Badge variant="secondary">{statusFor(suggestion.outTxId, suggestion.inTxId)}</Badge>
                  ) : null}
                  <Button size="sm" variant="outline" disabled={busyId === suggestion.id} onClick={() => void decide("confirm", suggestion)}>
                    {common.confirm}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === suggestion.id} onClick={() => void decide("reject", suggestion)}>
                    {common.reject}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === suggestion.id} onClick={() => void decide("unmatch", suggestion)}>
                    {common.unmatch}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{copy.accounts}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {accounts.filter((a) => a.isDeleted !== 1).length} {copy.accountsTracked}
          </p>
        </CardContent>
      </Card>
      </>}
    </div>
  );
}
