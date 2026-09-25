import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

import { Input } from "@/components/ui/Input";

import { Field } from "@/components/ui/Label";

import { useAuthStore } from "@/store/authStore";

import { cloudLogin } from "@/lib/cloud/client";

import { companyNavigate, companyPath } from "@/company/routes";

import { IndianRupee } from "lucide-react";

import { useI18n } from "@/company/i18n/react";



export function LoginPage() {

  const { t } = useI18n();

  const currentUser = useAuthStore((s) => s.currentUser);

  const login = useAuthStore((s) => s.login);

  const hydrated = useAuthStore((s) => s.hydrated);

  const [username, setUsername] = useState("");

  const [pin, setPin] = useState("");

  const [err, setErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  useEffect(() => {

    if (hydrated && currentUser) {

      companyNavigate(companyPath("select"), true);

    }

  }, [hydrated, currentUser]);



  async function onSubmit(e: React.FormEvent) {

    e.preventDefault();

    setErr(null);

    setLoading(true);

    try {

      const user = await cloudLogin({ username: username.trim(), pin });

      localStorage.setItem(

        "sv:session",

        JSON.stringify({ userId: user.id, username: user.username, locked: false }),

      );

      await login(user.id, pin);

      companyNavigate(companyPath("select"));

    } catch (error) {

      setErr(error instanceof Error ? error.message : t("login.failed"));

    } finally {

      setLoading(false);

    }

  }



  return (

    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">

      <div

        aria-hidden

        className="pointer-events-none absolute inset-0 opacity-80"

        style={{

          background:

            "radial-gradient(900px 420px at 15% -10%, color-mix(in oklab, hsl(var(--primary)) 22%, transparent), transparent 55%), radial-gradient(700px 380px at 90% 110%, color-mix(in oklab, hsl(var(--goal)) 16%, transparent), transparent 60%)",

        }}

      />

      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[var(--shadow-elevated)] backdrop-blur">

        <div className="border-b border-border bg-[hsl(var(--surface))]/70 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--goal))] text-white shadow-lg">

              <IndianRupee className="h-5 w-5" strokeWidth={2.5} />

            </div>

            <div>

              <div className="text-lg font-semibold tracking-tight">{t("login.title")}</div>

              <div className="text-xs text-muted-foreground">{t("login.subtitle")}</div>

            </div>

          </div>

          <p className="mt-3 text-sm text-muted-foreground">{t("login.helper")}</p>

        </div>

        <form className="space-y-3.5 px-6 py-5" onSubmit={onSubmit}>

          <Field label={t("common.username")}>

            <Input

              value={username}

              onChange={(e) => setUsername(e.target.value)}

              autoComplete="username"

              placeholder={t("login.usernamePlaceholder")}

              className="h-11"

            />

          </Field>

          <Field label={t("common.pin")}>

            <Input

              type="password"

              inputMode="numeric"

              value={pin}

              onChange={(e) => setPin(e.target.value)}

              autoComplete="current-password"

              placeholder={t("login.pinPlaceholder")}

              className="h-11"

            />

          </Field>

          {err ? (

            <p className="text-sm text-destructive" role="alert" aria-live="polite" id="login-error">

              {err}

            </p>

          ) : null}

          <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading}>

            {loading ? t("common.signingIn") : t("common.signIn")}

          </Button>

        </form>

        <div className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">

          <a href="/" className="font-medium text-primary hover:underline">

            {t("login.backPersonal")}

          </a>

        </div>

      </div>

    </div>

  );

}

