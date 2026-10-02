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
import { useMessages } from "@/i18n/useMessages";

type Mode = "signin" | "register";

function validatePin(pin: string, auth: { pinDigits: string; pinCommon: string; pinDate: string }) {
  if (!/^\d{4,8}$/.test(pin)) return auth.pinDigits;
  if (["0000", "1111", "1234", "123456", "9999"].includes(pin)) return auth.pinCommon;
  if (/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(pin) || /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/.test(pin)) {
    return auth.pinDate;
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
  const auth = useMessages().ui.auth;
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
    if (useAuthStore.getState().currentUser?.mustChangePin) return;
    await loadAll(useAuthStore.getState().currentUser!);
    await hydrateCloudApp();
    toast({
      title: `${auth.welcomeBack}, ${sqlUser.displayName}`,
      description: auth.connected,
      kind: "success",
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !pin) {
      setErr(auth.usernamePinRequired);
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
        setErr(auth.policyUpdate);
        return;
      }
      await finishLogin(sqlUser, pin);
    } catch (error) {
      const msg = error instanceof Error ? error.message : auth.signInFailed;
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
      setErr(auth.registerRequired);
      return;
    }
    if (pin !== confirmPin) {
      setErr(auth.pinConfirmMismatch);
      return;
    }
    const pinError = validatePin(pin, auth);
    if (pinError) {
      setErr(pinError);
      return;
    }
    if (!acceptedPolicies) {
      setErr(auth.acceptToCreate);
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
        title: `${auth.welcomeBack}, ${sqlUser.displayName}`,
        description: auth.accountReady,
        kind: "success",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : auth.registrationFailed;
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
              {isSignIn ? auth.signInTitle : auth.createTitle}
            </h1>
          </div>
          {initialMode === "register" ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {auth.back}
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
            {auth.signIn}
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
            {auth.createAccount}
          </button>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {isSignIn
            ? auth.signInHelp
            : auth.createHelp}
        </p>

        {isSignIn ? (
          <form onSubmit={handleSignIn} className="space-y-3">
            <Field label={auth.username}>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.username"
                autoFocus
              />
            </Field>
            <Field label={auth.pin} error={err ?? undefined}>
              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={auth.enterPin}
                  className="pr-10"
                />
                <KeyRound className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              {auth.signIn}
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
                    setErr(error instanceof Error ? error.message : auth.policyFailed);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {auth.acceptUpdated}
              </Button>
            ) : null}
            <div className="pt-1 text-center text-sm text-muted-foreground">
              {auth.newHere}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErr(null);
                }}
                className="text-primary hover:underline"
              >
                {auth.createAnAccount}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <Field label={auth.displayName}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="User Name"
                autoFocus
              />
            </Field>
            <Field label={auth.username} hint={auth.usernameHint}>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="amit"
              />
            </Field>
            <Field label={auth.pin} hint={auth.pinHint}>
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
            </Field>
            <Field label={auth.confirmPin} error={err ?? undefined}>
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
                {auth.acceptPolicies} ({policyVersions.terms ?? "current"} / {policyVersions.privacy ?? "current"})
              </span>
            </label>
            <Button type="submit" loading={loading} className="w-full">
              <UserPlus className="h-4 w-4" /> {auth.createAccount}
            </Button>
            <div className="pt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> {auth.pinHashed}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
