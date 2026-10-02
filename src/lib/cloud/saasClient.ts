import { apiRequest, getCloudToken as getTokenFromStorage } from "@/lib/apiClient";

export function getCloudToken() {
  return getTokenFromStorage();
}

export async function fetchPublicConfig() {
  return apiRequest<{ settings: Record<string, unknown>; featureFlags: Record<string, boolean> }>(
    "/api/public/config.php",
  );
}

export async function fetchViewer() {
  return apiRequest<{ id: string; username: string; displayName: string; role: "user" | "admin" }>(
    "/api/auth/me.php",
    { auth: true },
  );
}

export async function fetchPlans() {
  return apiRequest<Array<Record<string, unknown>>>("/api/subscriptions/plans.php");
}

export async function createSubscriptionOrder(planId: number) {
  return apiRequest<{
    order?: { id: string; amount: number; currency: string };
    subscriptionId?: number;
    paymentId?: number;
    razorpayKeyId?: string;
    scheduledDowngrade?: boolean;
    message?: string;
    scheduledPlanId?: number;
    scheduledChangeAt?: string;
  }>("/api/subscriptions/create-order.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ planId }),
  });
}

export async function getMySubscription() {
  return apiRequest<{ subscription: Record<string, unknown> | null; effectiveFeatures: Record<string, boolean | number> }>(
    "/api/subscriptions/my.php",
    { auth: true },
  );
}

export async function confirmSubscriptionPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiRequest<{ status: string }>("/api/subscriptions/confirm-payment.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getAdminDashboard() {
  return apiRequest<Record<string, unknown>>("/api/admin/dashboard.php", { auth: true });
}

export async function getAdminUsers() {
  return apiRequest<Array<Record<string, unknown>>>("/api/admin/users.php", { auth: true });
}

export async function getAdminPlans() {
  return apiRequest<Array<Record<string, unknown>>>("/api/admin/plans.php", { auth: true });
}

export async function saveAdminPlan(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/api/admin/plans.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getAdminFeatureFlags() {
  return apiRequest<Record<string, boolean>>("/api/admin/feature-flags.php", { auth: true });
}

export async function saveAdminFeatureFlags(payload: Record<string, boolean>) {
  return apiRequest<Record<string, unknown>>("/api/admin/feature-flags.php", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getAdminSettings() {
  return apiRequest<Record<string, unknown>>("/api/admin/settings.php", { auth: true });
}

export async function saveAdminSettings(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/api/admin/settings.php", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function getAdminSubscriptions() {
  return apiRequest<Array<Record<string, unknown>>>("/api/admin/subscriptions.php", { auth: true });
}

export async function adminSubscriptionAction(payload: {
  subscriptionId: number;
  action: "manual_extend" | "cancel";
  days?: number;
  reason?: string;
}) {
  return apiRequest<Record<string, unknown>>("/api/admin/subscriptions.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export async function assignUserPlan(userId: string, planId: number) {
  return apiRequest<Record<string, unknown>>("/api/admin/users-assign-plan.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId, planId }),
  });
}

export async function toggleUserActive(userId: string) {
  return apiRequest<Record<string, unknown>>("/api/admin/users-toggle-active.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  });
}

/** Admin sets a user's PIN (user should change it on next login when must_change_pin is supported). */
export async function adminResetUserPin(userId: string, newPin: string) {
  return apiRequest<{ updated: boolean; mustChangePin?: boolean }>("/api/admin/users-reset-pin.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId, newPin }),
  });
}
