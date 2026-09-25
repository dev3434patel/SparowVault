import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { companyNavigate, companyPath } from "@/company/routes";
import { DEFAULT_COA_SEED } from "@/company/services/coaSeed";
import { useI18n } from "@/company/i18n/react";

export function CreateCompanyPage() {
  const { t } = useI18n();
  const hydrateFromApi = useCompanyStore((s) => s.hydrateFromApi);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [fyStart, setFyStart] = useState(4);
  const [booksStart, setBooksStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function finish() {
    setErr(null);
    setLoading(true);
    try {
      const res = await companyApi.createWorkspace({
        displayName: displayName.trim(),
        legalName: (legalName || displayName).trim(),
        businessType: businessType.trim() || undefined,
        financialYearStartMonth: fyStart,
        booksStartDate: booksStart,
      });
      // Seed store from create response first (avoids stale hydrate of prior company).
      useCompanyStore.getState().setWorkspaceFromCreate(res.workspace);
      void hydrateFromApi();
      companyNavigate(companyPath("dashboard"));
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Could not create company (API may not be ready yet)",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-4">
      <h1 className="text-xl font-semibold">{t("create.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("create.helper")}</p>
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 0 ? "Identity" : step === 1 ? "Books setup" : "Chart of accounts preview"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step === 0 ? (
            <>
              <Field label={t("create.displayName")}>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <Field label={t("create.legalName")}>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Same as display if blank" />
              </Field>
              <Field label="Business type">
                <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Farming, Property, Trading…" />
              </Field>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Field label={t("create.fyStart")}>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={fyStart}
                  onChange={(e) => setFyStart(Number(e.target.value) || 4)}
                />
              </Field>
              <Field label="Books start date">
                <Input type="date" value={booksStart} onChange={(e) => setBooksStart(e.target.value)} />
              </Field>
            </>
          ) : null}
          {step === 2 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
              <p className="text-muted-foreground">
                A default COA will be seeded on the server when you create the workspace.
              </p>
              {DEFAULT_COA_SEED.map((g) => (
                <div key={g.code}>
                  <div className="font-medium">
                    {g.name} <span className="text-xs text-muted-foreground">({g.nature})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <div className="flex gap-2 pt-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                {t("common.back")}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => companyNavigate(companyPath("select"))}>
                {t("common.cancel")}
              </Button>
            )}
            {step < 2 ? (
              <Button
                className="flex-1"
                disabled={step === 0 && !displayName.trim()}
                onClick={() => setStep((s) => s + 1)}
              >
                {t("common.continue")}
              </Button>
            ) : (
              <Button className="flex-1" disabled={loading || !displayName.trim()} onClick={() => void finish()}>
                {loading ? t("common.loading") : t("create.submit")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
