import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { getAdminSettings, saveAdminSettings } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";
import { useMessages } from "@/i18n/useMessages";

type BrandingFields = {
  app_title: string;
  logo_url: string;
  favicon_url: string;
  support_email: string;
  privacy_url: string;
  terms_url: string;
};

const EMPTY: BrandingFields = {
  app_title: "",
  logo_url: "",
  favicon_url: "",
  support_email: "",
  privacy_url: "",
  terms_url: "",
};

export function BrandingSettingsPage() {
  const chrome = useMessages().ui;
  const copy = chrome.admin.body.branding;
  const fieldMeta: { key: keyof BrandingFields; label: string; hint: string; type: string; placeholder: string }[] = [
    { key: "app_title", label: copy.appTitle, hint: copy.appTitleHint, type: "text", placeholder: "SparowVault" },
    { key: "logo_url", label: copy.logoUrl, hint: copy.logoUrlHint, type: "url", placeholder: "https://example.com/logo.png" },
    { key: "favicon_url", label: copy.faviconUrl, hint: copy.faviconUrlHint, type: "url", placeholder: "https://example.com/favicon.ico" },
    { key: "support_email", label: copy.supportEmail, hint: copy.supportEmailHint, type: "email", placeholder: "support@example.com" },
    { key: "privacy_url", label: copy.privacyUrl, hint: copy.privacyUrlHint, type: "url", placeholder: "https://example.com/privacy" },
    { key: "terms_url", label: copy.termsUrl, hint: copy.termsUrlHint, type: "url", placeholder: "https://example.com/terms" },
  ];
  const [fields, setFields] = useState<BrandingFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useUIStore((s) => s.toast);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const raw = (await getAdminSettings()) as Record<string, unknown>;
      setFields({
        app_title:     String(raw.app_title     ?? ""),
        logo_url:      String(raw.logo_url      ?? ""),
        favicon_url:   String(raw.favicon_url   ?? ""),
        support_email: String(raw.support_email ?? ""),
        privacy_url:   String(raw.privacy_url   ?? ""),
        terms_url:     String(raw.terms_url     ?? ""),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveAdminSettings(fields as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: copy.savedToast, kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : copy.saveFailed, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> {chrome.common.refresh}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-income" /> {chrome.common.saved}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {chrome.common.saveChanges}
                </>
              )}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-expense/30 bg-expense/10 p-4 text-sm text-expense">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="outline" size="sm" onClick={load} className="ml-auto">
            {chrome.admin.retry}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ── Identity ── */}
          <Card>
            <CardHeader>
              <CardTitle>{copy.identity}</CardTitle>
              <CardDescription>{copy.identityHelp}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldMeta.filter((f) => ["app_title", "logo_url", "favicon_url"].includes(f.key)).map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <Input
                    type={f.type}
                    value={fields[f.key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </Field>
              ))}

              {/* Logo preview */}
              {fields.logo_url && (
                <div className="mt-1 rounded-lg border border-border p-3">
                  <p className="mb-2 text-xs text-muted-foreground">{copy.logoPreview}</p>
                  <img
                    src={fields.logo_url}
                    alt={copy.logoAlt}
                    className="h-10 max-w-[200px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Contact & Legal ── */}
          <Card>
            <CardHeader>
              <CardTitle>{copy.contact}</CardTitle>
              <CardDescription>{copy.contactHelp}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldMeta.filter((f) => ["support_email", "privacy_url", "terms_url"].includes(f.key)).map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <Input
                    type={f.type}
                    value={fields[f.key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </Field>
              ))}

              {/* Link previews */}
              {(fields.privacy_url || fields.terms_url) && (
                <div className="mt-1 space-y-1 rounded-lg border border-border p-3 text-xs">
                  <p className="text-muted-foreground">{copy.linkPreviews}</p>
                  {fields.privacy_url && (
                    <a href={fields.privacy_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">
                      {copy.privacyLink} → {fields.privacy_url}
                    </a>
                  )}
                  {fields.terms_url && (
                    <a href={fields.terms_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">
                      {copy.termsLink} → {fields.terms_url}
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
