import { ToneBadge } from "@/company/components/PageChrome";

const ROLE_HELP: Array<{ code: string; blurb: string }> = [
  { code: "VIEWER", blurb: "Read reports and party balances" },
  { code: "DATA_ENTRY", blurb: "Create receipts, payments, and drafts" },
  { code: "ACCOUNTANT", blurb: "Post vouchers and manage ledgers" },
  { code: "MANAGER", blurb: "Approve vouchers and lock periods" },
  { code: "AUDITOR", blurb: "View audit trail and exports" },
];

export function RoleManager() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Role guide</h2>
      </div>
      <ul className="divide-y divide-border p-2 text-sm">
        {ROLE_HELP.map((r) => (
          <li key={r.code} className="flex items-start justify-between gap-3 px-2 py-2.5">
            <div>
              <ToneBadge label={r.code} tone="info" />
              <p className="mt-1 text-xs text-muted-foreground">{r.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
