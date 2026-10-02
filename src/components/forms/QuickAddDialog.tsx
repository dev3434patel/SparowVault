import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";
import { TransactionForm } from "./TransactionForm";
import { formatIntentLabel } from "@/lib/format";
import {
  INCOMING_INTENT_LABELS,
  OUTGOING_INTENT_LABELS,
  intentToTransactionType,
  isOutgoingIntent,
} from "@/services/transactionIntent";
import type { IncomingIntent, OutgoingIntent, TransactionIntent } from "@/types";
import { rupeesToPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

type Step = "amount" | "intent" | "form";

export function QuickAddDialog() {
  const messages = useMessages();
  const copy = messages.ui.quickAdd;
  const common = messages.ui.common;
  const mode = useUIStore((s) => s.quickAddOpen);
  const close = useUIStore((s) => s.closeQuickAdd);
  const open = mode !== null;

  const [step, setStep] = useState<Step>("amount");
  const [direction, setDirection] = useState<"out" | "in" | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [selectedIntent, setSelectedIntent] = useState<TransactionIntent | null>(null);

  const reset = () => {
    setStep("amount");
    setDirection(null);
    setAmount("");
    setSelectedIntent(null);
  };

  const handleClose = () => {
    reset();
    close();
  };

  const forcedType = selectedIntent ? intentToTransactionType(selectedIntent) : mode ?? undefined;

  const intentOptions =
    direction === "out"
      ? (Object.keys(OUTGOING_INTENT_LABELS) as OutgoingIntent[]).map((id) => [id, formatIntentLabel(id)] as const)
      : direction === "in"
        ? (Object.keys(INCOMING_INTENT_LABELS) as IncomingIntent[]).map((id) => [id, formatIntentLabel(id)] as const)
        : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {step === "amount" && copy.amountHelp}
            {step === "intent" && copy.intentHelp}
            {step === "form" && copy.formHelp}
          </DialogDescription>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-4">
            <Input
              type="number"
              min={0}
              placeholder={copy.amountPh}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === "out" ? "default" : "outline"}
                onClick={() => setDirection("out")}
              >
                {copy.out}
              </Button>
              <Button
                type="button"
                variant={direction === "in" ? "default" : "outline"}
                onClick={() => setDirection("in")}
              >
                {copy.inn}
              </Button>
            </div>
            <Button
              type="button"
              disabled={!direction || amount === "" || Number(amount) <= 0}
              onClick={() => setStep("intent")}
            >
              {common.continue}
            </Button>
          </div>
        )}

        {step === "intent" && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {intentOptions.map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => {
                  setSelectedIntent(id);
                  setStep("form");
                }}
              >
                {label}
              </Button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setStep("amount")}>
              {common.back}
            </Button>
          </div>
        )}

        {step === "form" && selectedIntent && forcedType && (
          <TransactionForm
            forcedType={forcedType}
            initial={{
              type: forcedType,
              amount: typeof amount === "number" ? amount : 0,
              amountPaise: typeof amount === "number" ? rupeesToPaise(amount) : 0,
              transactionIntent: selectedIntent,
              paymentMode:
                selectedIntent === "credit_card_refund" || selectedIntent === "credit_card_bill"
                  ? "credit_card"
                  : selectedIntent === "cash_withdrawal" || selectedIntent === "cash_deposit"
                    ? "cash"
                    : "upi",
              isReimbursable:
                isOutgoingIntent(selectedIntent) &&
                selectedIntent === "purchase_expense" &&
                (mode === "expense" ? 0 : 0)
                  ? 0
                  : undefined,
              tags:
                selectedIntent === "reimbursement" ? ["reimbursement_settlement"] : [],
            }}
            onCancel={() => setStep("intent")}
            onSaved={() => handleClose()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
