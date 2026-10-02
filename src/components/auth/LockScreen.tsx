import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Lock, LogOut } from "lucide-react";
import { useMessages } from "@/i18n/useMessages";

export function LockScreen() {
  const auth = useMessages().ui.auth;
  const currentUser = useAuthStore((s) => s.currentUser);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const toast = useUIStore((s) => s.toast);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await unlock(pin);
      toast({ title: auth.welcomeBack, kind: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : auth.unlockFailed;
      setErr(msg);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  if (!currentUser) return null;

  return (
    <Card variant="elevated">
      <CardContent className="p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.avatarEmoji}
          </div>
          <h1 className="text-xl font-semibold">{currentUser.displayName}</h1>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {auth.sessionLocked}
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label={auth.enterPin} error={err ?? undefined}>
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={auth.enterYourPin}
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            {auth.unlock}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> {auth.signOutInstead}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
