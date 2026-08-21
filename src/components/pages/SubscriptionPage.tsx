import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confirmSubscriptionPayment, createSubscriptionOrder, fetchPlans, getMySubscription } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function SubscriptionPage() {
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const toast = useUIStore((s) => s.toast);

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
      script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
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
          title: "Downgrade scheduled",
          description: out.message ?? "Your current paid period stays active until renewal.",
          kind: "success",
        });
        return;
      }
      if (!out.order || !out.razorpayKeyId) {
        throw new Error("Payment order was not created");
      }
      await ensureRazorpayScript();
      const rz = new window.Razorpay!({
        key: out.razorpayKeyId,
        order_id: out.order.id,
        amount: out.order.amount,
        currency: out.order.currency,
        name: "SparowVault",
        description: "Subscription payment",
        handler: async (resp: Record<string, string>) => {
          await confirmSubscriptionPayment({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          const latest = await getMySubscription();
          setCurrent(latest.subscription);
          toast({ title: "Subscription activated", kind: "success" });
        },
      });
      rz.open();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Unable to create order", kind: "error" });
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Subscription" description="View plans and manage your active subscription." />
      {current ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>Current plan</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {String(current.plan_name ?? "Unknown")} ({String(current.status ?? "pending")})
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
              <Button loading={loadingPlanId === Number(plan.id)} onClick={() => buyPlan(Number(plan.id))}>
                Buy {String(plan.code)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

