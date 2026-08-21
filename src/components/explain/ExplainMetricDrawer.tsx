import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { HelpCircle } from "lucide-react";

export interface ExplainMetricSpec {
  title: string;
  formula: string;
  included: string[];
  excluded?: string[];
  excludedRecords?: Array<{ label: string; reason: string }>;
  sourceEngine?: string;
  lastUpdated?: string;
  confusionNote?: string;
}

export function ExplainMetricTrigger({
  spec,
  open,
  onOpenChange,
}: {
  spec: ExplainMetricSpec;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="no-print h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Explain ${spec.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" size="lg" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{spec.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Formula
              </h3>
              <p className="rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">{spec.formula}</p>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Included
              </h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {spec.included.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            {spec.excluded && spec.excluded.length > 0 ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Excluded
                </h3>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {spec.excluded.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {spec.excludedRecords && spec.excludedRecords.length > 0 ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Excluded records and reasons
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  {spec.excludedRecords.map((row) => (
                    <li key={`${row.label}:${row.reason}`} className="rounded-md bg-muted/40 p-2">
                      <div className="font-medium text-foreground">{row.label}</div>
                      <div className="text-xs">{row.reason}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="grid gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">Source engine: </span>
                {spec.sourceEngine ?? "Not specified"}
              </div>
              <div>
                <span className="font-medium text-foreground">Last updated: </span>
                {spec.lastUpdated ?? "Current screen render"}
              </div>
            </section>
            {spec.confusionNote ? (
              <section className="rounded-md border border-border bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Common confusion: </span>
                {spec.confusionNote}
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
