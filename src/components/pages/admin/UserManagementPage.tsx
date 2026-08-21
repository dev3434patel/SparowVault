import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { assignUserPlan, getAdminPlans, getAdminUsers, toggleUserActive, adminResetUserPin } from "@/lib/cloud/saasClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, KeyRound, Loader2, RefreshCw, Search, ShieldCheck, User } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: number;
  created_at: string;
  subscription_status?: "pending" | "trial" | "active" | "past_due" | "cancelled" | "expired" | null;
  subscription_plan_id?: number | null;
  subscription_plan_code?: string | null;
  subscription_plan_name?: string | null;
  subscription_expires_at?: string | null;
};

type PlanRow = {
  id: number;
  code: string;
  name: string;
  price_inr: string;
};

export function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pinUser, setPinUser] = useState<UserRow | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [planSelectKey, setPlanSelectKey] = useState(0);
  const toast = useUIStore((s) => s.toast);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [userRows, planRows] = await Promise.all([getAdminUsers(), getAdminPlans()]);
      setUsers(userRows as UserRow[]);
      setPlans(planRows as PlanRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") list = list.filter((u) => Number(u.is_active) === 1);
    if (statusFilter === "inactive") list = list.filter((u) => Number(u.is_active) !== 1);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.display_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, roleFilter, statusFilter, search]);

  async function handleToggle(userId: string) {
    setBusyId(`toggle:${userId}`);
    try {
      await toggleUserActive(userId);
      await loadData();
      toast({ title: "User status updated", kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Unable to update user", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssignPlan(userId: string, planId: number, planCode: string) {
    setBusyId(`plan:${userId}:${planId}`);
    try {
      await assignUserPlan(userId, planId);
      await loadData();
      setPlanSelectKey((k) => k + 1);
      toast({ title: `Assigned ${planCode} plan successfully`, kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Unable to assign plan", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPin() {
    if (!pinUser) return;
    const common = new Set(["0000", "1111", "1234", "123456", "9999"]);
    if (!/^\d{4,8}$/.test(newPin)) {
      toast({ title: "PIN must be 4–8 digits", kind: "error" });
      return;
    }
    if (common.has(newPin)) {
      toast({ title: "Choose a less common PIN", kind: "error" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PIN confirmation does not match", kind: "error" });
      return;
    }
    setBusyId(`pin:${pinUser.id}`);
    try {
      const res = await adminResetUserPin(pinUser.id, newPin);
      toast({
        title: `PIN updated for @${pinUser.username}`,
        description: res.mustChangePin
          ? "User will be asked to change PIN on next login."
          : "Share the temporary PIN securely with the user.",
        kind: "success",
      });
      setPinUser(null);
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Unable to reset PIN", kind: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = users.filter((u) => Number(u.is_active) === 1).length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div>
      <PageHeader
        title="User Management"
        description={`${users.length} total users · ${activeCount} active · ${adminCount} admin`}
        actions={
          <Button variant="outline" size="sm" onClick={loadData} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-expense/30 bg-expense/10 p-4 text-sm text-expense">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="outline" size="sm" onClick={loadData} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {search || roleFilter !== "all" || statusFilter !== "all"
              ? "No users match your filters."
              : "No users registered yet."}
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isActive = Number(u.is_active) === 1;
                  const isAdmin = u.role === "admin";
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${isAdmin ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground"}`}>
                            {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </span>
                          <div>
                            <div className="font-medium text-sm">{u.display_name}</div>
                            <div className="text-xs text-muted-foreground">@{u.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={isAdmin ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                          {u.subscription_plan_code ? (
                            <div className="text-xs text-muted-foreground">
                              Plan: <span className="font-medium text-foreground">{u.subscription_plan_name ?? u.subscription_plan_code}</span>
                              {u.subscription_status ? ` (${u.subscription_status.replace("_", " ")})` : ""}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Plan: not assigned</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-income/15 text-income" : "bg-expense/15 text-expense"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-income" : "bg-expense"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            loading={busyId === `toggle:${u.id}`}
                            onClick={() => handleToggle(u.id)}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPinUser(u);
                              setNewPin("");
                              setConfirmPin("");
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Set PIN
                          </Button>
                          {plans.length > 0 && (
                            <Select
                              key={`${planSelectKey}:${u.id}`}
                              onValueChange={(planId) => {
                                const plan = plans.find((p) => String(p.id) === planId);
                                if (plan) handleAssignPlan(u.id, plan.id, plan.code);
                              }}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs">
                                <SelectValue placeholder="Assign plan…" />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name} — ₹{p.price_inr}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!pinUser} onOpenChange={(o) => !o && setPinUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set PIN for @{pinUser?.username}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This replaces the user&apos;s login PIN. Share it securely. When supported, they will be asked to
            change it on next login.
          </p>
          <Field label="New PIN (4–8 digits, avoid 1234 / 0000)">
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </Field>
          <Field label="Confirm PIN">
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinUser(null)}>
              Cancel
            </Button>
            <Button
              loading={busyId === `pin:${pinUser?.id}`}
              onClick={handleResetPin}
            >
              Save PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
