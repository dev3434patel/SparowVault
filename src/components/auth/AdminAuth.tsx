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

export function AdminAuth() {
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
      toast({ title: "Admin login successful", kind: "success" });
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Admin login failed");
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
            <h1 className="text-xl font-semibold">Admin Login</h1>
          </div>
          <a href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> User side
          </a>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">This portal is only for administrator accounts.</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Admin username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="PIN" error={err ?? undefined}>
            <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter admin PIN" />
          </Field>
          <Button type="submit" loading={loading} className="w-full">Sign in to admin</Button>
        </form>
      </CardContent>
    </Card>
  );
}
