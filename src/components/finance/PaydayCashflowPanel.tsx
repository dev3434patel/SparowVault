import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";
import { calculateFreeCashUntilIncome } from "@/services/adaptiveModeEngine";

export function PaydayCashflowPanel(props: {
  liquidAvailablePaise: number;
  reliableExpectedIncomePaise: number;
  committedOutflowsPaise: number;
  safetyBufferPaise: number;
  daysUntilHorizon: number;
  onOpenBills?: () => void;
}) {
  const { freeCashPaise, safeDailySpendPaise } = calculateFreeCashUntilIncome(props);

  const rows = [
    { label: "Liquid available now", value: props.liquidAvailablePaise },
    { label: "Reliable income before next payday", value: props.reliableExpectedIncomePaise },
    { label: "Committed outflows before payday", value: -props.committedOutflowsPaise },
    { label: "Safety buffer", value: -props.safetyBufferPaise },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Until next income</CardTitle>
        <CardDescription>
          Liquidity plan — not the same as operating surplus. Tap bills to review commitments.
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
          <span className="font-medium">Free cash</span>
          <span className="tabular-nums text-lg font-semibold">
            {formatINR(paiseToRupees(freeCashPaise))}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Safe daily spend ({props.daysUntilHorizon} days)
          </span>
          <span className="tabular-nums font-semibold">
            {formatINR(paiseToRupees(safeDailySpendPaise))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
