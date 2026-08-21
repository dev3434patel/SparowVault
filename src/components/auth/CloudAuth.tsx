import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { acceptPolicies, cloudLogin, cloudRegister, fetchPolicyVersions } from "@/lib/cloud/client";
import { ArrowLeft, Database, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useCloudAppStore } from "@/store/cloudAppStore";

type Mode = "signin" | "register";

function validatePin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) return "PIN must be 4 to 8 digits";
  if (["0000", "1111", "1234", "123456", "9999"].includes(pin)) return "Choose a less common PIN";
  if (/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(pin) || /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/.test(pin)) {
    return "Avoid date-like PINs";
  }
  return null;
}

export function CloudAuth({
  initialMode = "signin",
  onBack,
}: {
  initialMode?: Mode;
  onBack: () => void;
}) {
  const toast = useUIStore((s) => s.toast);
  const login = useAuthStore((s) => s.login);
  const loadAll = useDataStore((s) => s.loadAll);
  const hydrateCloudApp = useCloudAppStore((s) => s.hydrate);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [policyVersions, setPolicyVersions] = useState<Record<string, string>>({});
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [pendingPolicyUser, setPendingPolicyUser] = useState<{
    id: string;
    username: string;
    displayName: string;
    policyOutstanding: Array<{ key: string; version: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicyVersions()
      .then((res) => setPolicyVersions(res.versions ?? {}))
      .catch(() => setPolicyVersions({ terms: "current", privacy: "current" }));
  }, []);

  async function finishLogin(sqlUser: { id: string; username: string; displayName: string }, pinValue: string) {
    localStorage.setItem(
      "sv:session",
      JSON.stringify({ userId: sqlUser.id, username: sqlUser.username, locked: false }),
    );
    await login(sqlUser.id, pinValue);
    await loadAll(useAuthStore.getState().currentUser!);
    await hydrateCloudApp();
    toast({
      title: `Welcome back, ${sqlUser.displayName}`,
      description: "Your account is connected to the SQL database.",
      kind: "success",
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !pin) {
      setErr("Username and PIN are required");
      return;
    }
    setLoading(true);
    try {
      const sqlUser = await cloudLogin({ username: username.trim(), pin });
      if (sqlUser.policyOutstanding?.length) {
        setPendingPolicyUser({
          id: sqlUser.id,
          username: sqlUser.username,
          displayName: sqlUser.displayName,
          policyOutstanding: sqlUser.policyOutstanding,
        });
        setErr("Policy update required. Accept Terms and Privacy to continue.");
        return;
      }
      await finishLogin(sqlUser, pin);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sign in failed";
      setErr(msg);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !displayName.trim() || !pin) {
      setErr("Username, display name and PIN are required");
      return;
    }
    if (pin !== confirmPin) {
      setErr("PIN and confirmation do not match");
      return;
    }
    const pinError = validatePin(pin);
    if (pinError) {
      setErr(pinError);
      return;
    }
    if (!acceptedPolicies) {
      setErr("Accept Terms and Privacy to create an account");
      return;
    }
    setLoading(true);
    try {
      const policyAcceptances = ["terms", "privacy"].map((key) => ({
        key,
        version: policyVersions[key] ?? "current",
      }));
      const sqlUser = await cloudRegister({
        username: username.trim(),
        displayName: displayName.trim(),
        pin,
        policyAcceptances,
      });
      localStorage.setItem(
        "sv:session",
        JSON.stringify({ userId: sqlUser.id, username: sqlUser.username, locked: false }),
      );
      await login(sqlUser.id, pin);
      await loadAll(useAuthStore.getState().currentUser!);
      await hydrateCloudApp();
      toast({
        title: `Welcome, ${sqlUser.displayName}`,
        description: "Your account is ready and uses SQL database storage.",
        kind: "success",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === "signin";
  const canAcceptPendingPolicies = pendingPolicyUser?.policyOutstanding.some((p) => p.key === "terms" || p.key === "privacy") ?? false;

  return (
    <Card variant="elevated" className="border-border">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h1 className="text-xl font-semibold">
              {isSignIn ? "Sign in to your account" : "Create your account"}
            </h1>
          </div>
          {initialMode === "register" ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : null}
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-md bg-surface-2 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErr(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 transition-colors ${
              isSignIn
                ? "bg-background font-semibold shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErr(null);
            }}
            className={`flex-1 rounded px-3 py-1.5 transition-colors ${
              !isSignIn
                ? "bg-background font-semibold shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {isSignIn
            ? "Access your finance data from any device. All records are stored in your SQL database."
            : "Create an account once and use it across devices with SQL-backed data storage."}
        </p>

        {isSignIn ? (
          <form onSubmit={handleSignIn} className="space-y-3">
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.username"
                autoFocus
              />
            </Field>
            <Field label="PIN" error={err ?? undefined}>
              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="pr-10"
                />
                <KeyRound className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
            {pendingPolicyUser && canAcceptPendingPolicies ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await acceptPolicies(pendingPolicyUser.policyOutstanding);
                    await finishLogin(pendingPolicyUser, pin);
                    setPendingPolicyUser(null);
                    setErr(null);
                  } catch (error) {
                    setErr(error instanceof Error ? error.message : "Policy acceptance failed");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Accept updated Terms & Privacy
              </Button>
            ) : null}
            <div className="pt-1 text-center text-sm text-muted-foreground">
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErr(null);
                }}
                className="text-primary hover:underline"
              >
                Create an account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="User Name"
                autoFocus
              />
            </Field>
            <Field label="Username" hint="3-24 chars. Letters, numbers, . _ -">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="amit"
              />
            </Field>
            <Field label="PIN" hint="4 to 8 digits; avoid common or date-like PINs">
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
            </Field>
            <Field label="Confirm PIN" error={err ?? undefined}>
              <Input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
              />
            </Field>
            <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-1 p-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptedPolicies}
                onChange={(e) => setAcceptedPolicies(e.target.checked)}
              />
              <span>
                I accept the Terms ({policyVersions.terms ?? "current"}) and Privacy Policy ({policyVersions.privacy ?? "current"}).
              </span>
            </label>
            <Button type="submit" loading={loading} className="w-full">
              <UserPlus className="h-4 w-4" /> Create account
            </Button>
            <div className="pt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> PIN is hashed server-side and never stored in plain text.
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
