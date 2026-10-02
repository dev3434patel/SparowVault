import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Field } from "@/components/ui/Label";
import type { User } from "@/types";
import { getLastUserId } from "@/services/authService";
import { KeyRound, Lock, Database, UserPlus } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useMessages } from "@/i18n/useMessages";

export function ProfileLogin({
  onCreateNew,
  onCloudSignIn,
}: {
  onCreateNew: () => void;
  onCloudSignIn?: () => void;
}) {
  const auth = useMessages().ui.auth;
  const profiles = useAuthStore((s) => s.profiles);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const toast = useUIStore((s) => s.toast);
  const [selected, setSelected] = useState<User | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const latestProfile = profiles[0] ?? null;

  useEffect(() => {
    const last = getLastUserId();
    if (last && profiles.length > 0) {
      const u = profiles.find((p) => p.id === last);
      if (u) setSelected(u);
      else if (latestProfile) setSelected(latestProfile);
    } else if (latestProfile) {
      setSelected(latestProfile);
    }
  }, [profiles, latestProfile]);

  async function submit() {
    if (!selected) return;
    setErr(null);
    try {
      await login(selected.id, pin);
      toast({ title: `${auth.welcomeBack}, ${selected.displayName}`, kind: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : auth.loginFailed;
      setErr(msg);
      setPin("");
    }
  }

  return (
    <Card variant="elevated" className="border-border">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h1 className="text-xl font-semibold">{auth.welcomeBack}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {auth.continueRecent}
        </p>

        <div className="my-5 space-y-2">
          {(selected ? [selected] : latestProfile ? [latestProfile] : []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => undefined}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                "border-primary bg-info-soft"
              }`}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg shadow"
                style={{ backgroundColor: p.avatarColor }}
              >
                {p.avatarEmoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.displayName}</div>
                <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <Field label={`${auth.pinFor} @${selected.username}`} error={err ?? undefined}>
              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={auth.enterPin}
                  className="pr-10"
                />
                <KeyRound className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </Field>
            <div className="flex items-center gap-2">
              <Button type="submit" loading={loading} className="flex-1">
                {auth.unlock}
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" className="w-full" onClick={onCreateNew}>
            <UserPlus className="h-4 w-4" /> {auth.createAnother}
          </Button>
        )}

        {onCloudSignIn ? (
          <div className="mt-5 border-t border-border pt-4 text-center text-sm">
            <button
              type="button"
              onClick={onCloudSignIn}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Database className="h-4 w-4" /> {auth.sqlSignIn}
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
