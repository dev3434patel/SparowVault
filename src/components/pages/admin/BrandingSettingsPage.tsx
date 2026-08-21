import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { getAdminSettings, saveAdminSettings } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";

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

const FIELD_META: { key: keyof BrandingFields; label: string; hint?: string; type?: string; placeholder: string }[] = [
  { key: "app_title",    label: "App title",       hint: "Shown in browser tab and headings",       type: "text",  placeholder: "SparowVault" },
  { key: "logo_url",     label: "Logo URL",         hint: "Full https:// URL to your logo image",    type: "url",   placeholder: "https://example.com/logo.png" },
  { key: "favicon_url",  label: "Favicon URL",      hint: "Full https:// URL to favicon (.ico/.png)", type: "url",   placeholder: "https://example.com/favicon.ico" },
  { key: "support_email",label: "Support email",    hint: "Shown on error pages and contact links",  type: "email", placeholder: "support@example.com" },
  { key: "privacy_url",  label: "Privacy policy URL", hint: "Link shown in auth / signup pages",     type: "url",   placeholder: "https://example.com/privacy" },
  { key: "terms_url",    label: "Terms of service URL", hint: "Link shown in auth / signup pages",   type: "url",   placeholder: "https://example.com/terms" },
];

export function BrandingSettingsPage() {
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
      setError(e instanceof Error ? e.message : "Failed to load branding settings");
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
      toast({ title: "Branding settings saved", kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to save settings", kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Branding Settings"
        description="Manage app title, logo, favicon, support links, and legal URLs."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-income" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
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
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ── Identity ── */}
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>App name and visual assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FIELD_META.filter((f) => ["app_title", "logo_url", "favicon_url"].includes(f.key)).map((f) => (
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
                  <p className="mb-2 text-xs text-muted-foreground">Logo preview</p>
                  <img
                    src={fields.logo_url}
                    alt="Logo preview"
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
              <CardTitle>Contact &amp; Legal</CardTitle>
              <CardDescription>Support email and policy page links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FIELD_META.filter((f) => ["support_email", "privacy_url", "terms_url"].includes(f.key)).map((f) => (
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
                  <p className="text-muted-foreground">Link previews</p>
                  {fields.privacy_url && (
                    <a href={fields.privacy_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">
                      Privacy → {fields.privacy_url}
                    </a>
                  )}
                  {fields.terms_url && (
                    <a href={fields.terms_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline truncate">
                      Terms → {fields.terms_url}
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
