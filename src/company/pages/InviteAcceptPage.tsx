import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { companyNavigate, companyPath } from "@/company/routes";
import { useI18n } from "@/company/i18n/react";

/**
 * Redeems a hashed one-use invite token. The users page still invites by user id.
 */
export function InviteAcceptPage() {
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await companyApi.redeemInviteToken(token.trim());
      companyNavigate(companyPath("select"));
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("invite.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("invite.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("invite.body")}</p>
      <form className="space-y-2" onSubmit={(e) => void onRedeem(e)}>
        <Field label={t("invite.token")}>
          <Input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required />
        </Field>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? t("invite.checking") : t("invite.accept")}
        </Button>
      </form>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm"
          onClick={() => companyNavigate(companyPath("select"))}
        >
          {t("invite.goSelect")}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm"
          onClick={() => companyNavigate(companyPath("login"))}
        >
          {t("common.signIn")}
        </button>
      </div>
    </div>
  );
}
