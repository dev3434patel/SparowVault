import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

import { companyNavigate, companyPath } from "@/company/routes";

import { companyAllows } from "@/company/auth/companyCan";

import { useCompanyStore } from "@/company/store/companyStore";

import type { CompanyPermission } from "@/company/types";

import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, FileSpreadsheet, Users, CircleDollarSign, Receipt } from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useFocusTrap } from "@/hooks/useFocusTrap";

import { useI18n } from "@/company/i18n/react";



const ACTIONS: Array<{

  labelKey: string;

  hintKey: string;

  pathKey: Parameters<typeof companyPath>[0];

  permission?: CompanyPermission;

  icon: LucideIcon;

}> = [

  { labelKey: "newMenu.moneyReceived", hintKey: "newMenu.moneyReceivedHint", pathKey: "quick-received", permission: "create_receipt", icon: ArrowDownLeft },

  { labelKey: "newMenu.moneyPaid", hintKey: "newMenu.moneyPaidHint", pathKey: "quick-paid", permission: "create_payment", icon: ArrowUpRight },

  { labelKey: "newMenu.transfer", hintKey: "newMenu.transferHint", pathKey: "quick-transfer", permission: "create_contra", icon: ArrowLeftRight },

  { labelKey: "newMenu.journal", hintKey: "newMenu.journalHint", pathKey: "quick-journal", permission: "create_journal", icon: FileSpreadsheet },

  { labelKey: "newMenu.newParty", hintKey: "newMenu.newPartyHint", pathKey: "parties", permission: "manage_parties", icon: Users },

  { labelKey: "newMenu.receivables", hintKey: "newMenu.receivablesHint", pathKey: "receivables", permission: "view_receivables", icon: CircleDollarSign },

  { labelKey: "newMenu.vouchers", hintKey: "newMenu.vouchersHint", pathKey: "vouchers", permission: "view_day_book", icon: Receipt },

];



function can(permissions: CompanyPermission[], state: "loading" | "ready" | "error", need?: CompanyPermission) {

  return companyAllows(state, permissions, need);

}



export function NewActionMenu() {

  const { t } = useI18n();

  const permissions = useCompanyStore((s) => s.permissions);

  const permissionsState = useCompanyStore((s) => s.permissionsState);

  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);



  useFocusTrap(open, menuRef, {

    onEscape: () => {

      setOpen(false);

      triggerRef.current?.focus();

    },

  });



  useEffect(() => {

    function onDoc(e: MouseEvent) {

      if (!ref.current?.contains(e.target as Node)) setOpen(false);

    }

    document.addEventListener("mousedown", onDoc);

    return () => document.removeEventListener("mousedown", onDoc);

  }, []);



  useEffect(() => {

    if (!open && triggerRef.current && document.activeElement === document.body) {

      // no-op; useFocusTrap restores trigger when menu unmounts

    }

  }, [open]);



  const items = ACTIONS.filter((a) => can(permissions, permissionsState, a.permission));



  return (

    <div className="relative" ref={ref}>

      <Button

        ref={triggerRef}

        size="sm"

        className="gap-1.5 shadow-sm"

        onClick={() => setOpen((v) => !v)}

        aria-expanded={open}

        aria-haspopup="menu"

        aria-label={t("a11y.createNew")}

      >

        <Plus className="h-4 w-4" aria-hidden />

        {t("newMenu.button")}

      </Button>

      {open ? (

        <div

          ref={menuRef}

          role="menu"

          tabIndex={-1}

          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card py-1.5 shadow-[var(--shadow-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"

        >

          <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">

            {t("newMenu.create")}

          </div>

          {items.map((it) => {

            const Icon = it.icon;

            return (

              <button

                key={it.pathKey}

                type="button"

                role="menuitem"

                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--ring))]"

                onClick={() => {

                  companyNavigate(companyPath(it.pathKey));

                  setOpen(false);

                }}

              >

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">

                  <Icon className="h-4 w-4" aria-hidden />

                </span>

                <span className="min-w-0">

                  <span className="block text-sm font-medium leading-tight">{t(it.labelKey)}</span>

                  <span className="block text-[11px] text-muted-foreground">{t(it.hintKey)}</span>

                </span>

              </button>

            );

          })}

        </div>

      ) : null}

    </div>

  );

}

