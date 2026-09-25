import { companyNavigate, companyPath } from "@/company/routes";

/**
 * Invite-accept is FUTURE product surface (token redeem flow).
 * Must not render a fake "workspace available" stub that implies LIVE books.
 */
export function InviteAcceptPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Company invite</h1>
      <p className="text-sm text-muted-foreground">
        Invite-token acceptance is not product-active yet. Ask an owner to add your user from{" "}
        <strong>Users &amp; Roles</strong> after you have an account, or open company select if you
        already have memberships.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => companyNavigate(companyPath("select"))}
        >
          Go to company select
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm"
          onClick={() => companyNavigate(companyPath("login"))}
        >
          Login
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Status: FUTURE / NOT PRODUCT-ACTIVE (§116–119 adjacent)</p>
    </div>
  );
}
