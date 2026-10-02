import { useEffect, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confirmSubscriptionPayment, createSubscriptionOrder, fetchPlans, getMySubscription } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { useMessages } from "@/i18n/useMessages";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function SubscriptionPage() {
  const paymentsOn = import.meta.env.VITE_ENABLE_RAZORPAY === "true";
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const toast = useUIStore((s) => s.toast);
  const copy = useMessages().ui.subscription;

  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => setPlans([]));
    getMySubscription().then((x) => setCurrent(x.subscription)).catch(() => setCurrent(null));
  }, []);

  async function ensureRazorpayScript() {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(copy.scriptFailed));
      document.body.appendChild(script);
    });
  }

  async function buyPlan(planId: number) {
    setLoadingPlanId(planId);
    try {
      const out = await createSubscriptionOrder(planId);
      if (out.scheduledDowngrade) {
        const latest = await getMySubscription();
        setCurrent(latest.subscription);
        toast({
          title: copy.downgrade,
          description: out.message ?? copy.downgradeBody,
          kind: "success",
        });
        return;
      }
      if (!out.order || !out.razorpayKeyId) {
        throw new Error(copy.orderMissing);
      }
      await ensureRazorpayScript();
      const rz = new window.Razorpay!({
        key: out.razorpayKeyId,
        order_id: out.order.id,
        amount: out.order.amount,
        currency: out.order.currency,
        name: "SparowVault",
        description: copy.paymentDescription,
        handler: async (resp: Record<string, string>) => {
          await confirmSubscriptionPayment({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          const latest = await getMySubscription();
          setCurrent(latest.subscription);
          toast({ title: copy.activated, kind: "success" });
        },
      });
      rz.open();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : copy.orderFailed, kind: "error" });
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div>
      <PersonalPageHeader screen="subscription" />
      {current ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>{copy.currentPlan}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {String(current.plan_name ?? copy.unknown)} ({String(current.status ?? copy.pending)})
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={String(plan.id)}>
            <CardHeader><CardTitle>{String(plan.name)}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">{String(plan.description ?? "")}</div>
              <div className="text-lg font-semibold">Rs {String(plan.price_inr)}</div>
              {paymentsOn ? (
                <Button loading={loadingPlanId === Number(plan.id)} onClick={() => buyPlan(Number(plan.id))}>
                  {copy.buy} {String(plan.code)}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {copy.checkoutOff}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

