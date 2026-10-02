import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { companyNavigate, companyPath } from "@/company/routes";
import { companyApi } from "@/company/api/client";
import { SkeletonList } from "@/company/components/CompanySkeleton";
import { useCompanyStore } from "@/company/store/companyStore";
import { ApiError } from "@/lib/apiClient";
import { useI18n } from "@/company/i18n/react";

export function SearchPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [endpointMissing, setEndpointMissing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setErr(null);
        setEndpointMissing(false);
        try {
          setResults(await companyApi.search(companyId, q.trim()));
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            setEndpointMissing(true);
            try {
              const [parties, vouchers] = await Promise.all([
                companyApi.listParties(companyId),
                companyApi.listVouchers(companyId, { search: q.trim() }),
              ]);
              const needle = q.trim().toLowerCase();
              const partyHits = parties
                .filter((p) => p.displayName.toLowerCase().includes(needle))
                .map((p) => ({ type: "party", id: p.id, label: p.displayName }));
              const voucherHits = vouchers.map((v) => ({
                type: "voucher",
                id: v.id,
                label: `${v.voucherNumber} ${v.voucherType}`,
              }));
              setResults([...partyHits, ...voucherHits]);
            } catch (inner) {
              setErr(inner instanceof Error ? inner.message : "Search failed");
            }
          } else {
            setErr(e instanceof Error ? e.message : "Search failed");
          }
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [companyId, q]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold">{t("search.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("search.subtitle")}</p>
      </div>
      <Input
        placeholder={t("search.placeholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {endpointMissing ? (
        <p className="text-sm text-destructive">
          The search service is unavailable. Results below are a local party and voucher filter, not a full company search.
        </p>
      ) : null}
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {loading ? <SkeletonList rows={4} /> : null}
      {!loading ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="space-y-1 p-4 text-sm">
            {results.length === 0 ? (
              <p className="text-muted-foreground">
                {q.trim().length < 2 ? t("search.hint") : t("search.empty")}
              </p>
            ) : (
              results.map((r, i) => {
                const id = String(r.id ?? "");
                const type = String(r.type ?? "");
                const label = String(r.label ?? r.display_name ?? r.voucher_number ?? r.id);
                const open = () => {
                  if (!id) return;
                  if (type === "party") companyNavigate(companyPath("party-detail", { id }));
                  else if (type === "voucher") companyNavigate(companyPath("voucher-detail", { id }));
                };
                return (
                  <button
                    key={id || String(i)}
                    type="button"
                    className="flex w-full justify-between border-b border-border py-1.5 text-left last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    onClick={open}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{type}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
