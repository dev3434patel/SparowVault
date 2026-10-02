import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";
import { calculateFreeCashUntilIncome } from "@/services/adaptiveModeEngine";
import { useMessages } from "@/i18n/useMessages";

export function PaydayCashflowPanel(props: {
  liquidAvailablePaise: number;
  reliableExpectedIncomePaise: number;
  committedOutflowsPaise: number;
  safetyBufferPaise: number;
  daysUntilHorizon: number;
  onOpenBills?: () => void;
}) {
  const copy = useMessages().copy.payday;
  const { freeCashPaise, safeDailySpendPaise } = calculateFreeCashUntilIncome(props);

  const rows = [
    { label: copy.liquid, value: props.liquidAvailablePaise },
    { label: copy.reliable, value: props.reliableExpectedIncomePaise },
    { label: copy.committed, value: -props.committedOutflowsPaise },
    { label: copy.buffer, value: -props.safetyBufferPaise },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>
          {copy.body}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            className="flex w-full items-center justify-between text-sm hover:underline"
            onClick={props.onOpenBills}
          >
            <span className="text-muted-foreground">{r.label}</span>
            <span className="tabular-nums font-medium">
              {formatINR(paiseToRupees(r.value))}
            </span>
          </button>
        ))}
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="font-medium">{copy.free}</span>
          <span className="tabular-nums text-lg font-semibold">
            {formatINR(paiseToRupees(freeCashPaise))}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {copy.safeDaily.replace("{n}", String(props.daysUntilHorizon))}
          </span>
          <span className="tabular-nums font-semibold">
            {formatINR(paiseToRupees(safeDailySpendPaise))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
