import { useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Shield, ArrowLeft } from "lucide-react";
import { cloudAdminLogin } from "@/lib/cloud/client";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { useMessages } from "@/i18n/useMessages";

export function AdminAuth() {
  const admin = useMessages().ui.admin;
  const toast = useUIStore((s) => s.toast);
  const login = useAuthStore((s) => s.login);
  const loadAll = useDataStore((s) => s.loadAll);
  const hydrateCloudApp = useCloudAppStore((s) => s.hydrate);
  const [username, setUsername] = useState("admin");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const sqlUser = await cloudAdminLogin({ username: username.trim(), pin });
      localStorage.setItem(
        "sv:session",
        JSON.stringify({ userId: sqlUser.id, username: sqlUser.username, locked: false, portal: "admin" }),
      );
      await login(sqlUser.id, pin);
      if (useAuthStore.getState().currentUser?.mustChangePin) return;
      await loadAll(useAuthStore.getState().currentUser!);
      await hydrateCloudApp();
      toast({ title: admin.success, kind: "success" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : admin.failed);
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="elevated" className="border-border">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h1 className="text-xl font-semibold">{admin.loginTitle}</h1>
          </div>
          <a href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> {admin.userSide}
          </a>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">{admin.portalOnly}</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label={admin.username}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label={admin.pin} error={err ?? undefined}>
            <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={admin.pinPlaceholder} />
          </Field>
          <Button type="submit" loading={loading} className="w-full">{admin.signIn}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
