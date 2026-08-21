import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import {
  materializeLoanEmiObligations,
  materializeRecurringObligations,
  mergeObligationsUnique,
  obligationCalendarSummary,
} from "@/services/obligationEngine";
import { formatINR, formatDate } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";

export function BillCalendarPage() {
  const user = useAuthStore((s) => s.currentUser);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const today = useMemo(() => new Date(), []);

  const obligations = useMemo(() => {
    if (!user) return [];
    const recurring = materializeRecurringObligations(recurringRules, user.id, today);
    const loanEmis = materializeLoanEmiObligations(loans, emis, user.id, today);
    return mergeObligationsUnique([], [...recurring, ...loanEmis]);
  }, [user, recurringRules, loans, emis, today]);

  const summary = obligationCalendarSummary(obligations, today);

  return (
    <div className="space-y-6">
      <PageHeader title="Bill calendar" description="Upcoming obligations from recurring bills and loan EMIs." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(paiseToRupees(summary.next7DaysPaise))}</p>
            <p className="text-sm text-muted-foreground">{summary.count7} item(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(paiseToRupees(summary.next30DaysPaise))}</p>
            <p className="text-sm text-muted-foreground">{summary.count30} item(s)</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {obligations.length === 0 ? (
            <p className="text-muted-foreground">No obligations in the next 30 days.</p>
          ) : (
            obligations.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(o.dueDate)}</div>
                </div>
                <div className="font-medium">{formatINR(paiseToRupees(o.amountPaise))}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
