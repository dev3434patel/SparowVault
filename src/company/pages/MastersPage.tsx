import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { companyNavigate, companyPath, type CompanyNavKey } from "@/company/routes";
import { type DimensionKind } from "@/company/api/client";
import { companyAllows } from "@/company/auth/companyCan";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyPermission } from "@/company/types";
import { PageHeader } from "@/company/components/PageChrome";
import { CategoriesPanel } from "@/company/pages/masters/CategoriesPanel";
import { DimensionPanel } from "@/company/pages/masters/DimensionPanel";
import { useI18n } from "@/company/i18n/react";

type MasterTabId = DimensionKind | "categories";

const TABS: Array<{
  id: MasterTabId;
  labelKey: string;
  pathKey: CompanyNavKey;
}> = [
  { id: "business-units", labelKey: "masters.businessUnits", pathKey: "masters-business-units" },
  { id: "branches", labelKey: "masters.branches", pathKey: "masters-business-units" },
  { id: "areas", labelKey: "masters.areas", pathKey: "masters-areas" },
  { id: "projects", labelKey: "masters.projects", pathKey: "masters-projects" },
  { id: "cost-centres", labelKey: "masters.costCentres", pathKey: "masters-cost-centres" },
  { id: "categories", labelKey: "masters.categories", pathKey: "masters-categories" },
];

function canPerm(
  permissions: CompanyPermission[],
  state: "loading" | "ready" | "error",
  need: CompanyPermission,
) {
  return companyAllows(state, permissions, need);
}

export function MastersPage({ tab }: { tab?: string }) {
  const { t } = useI18n();
  const permissions = useCompanyStore((s) => s.permissions);
  const permissionsState = useCompanyStore((s) => s.permissionsState);
  const canViewCategories =
    canPerm(permissions, permissionsState, "view_dashboard") ||
    canPerm(permissions, permissionsState, "manage_parties");
  const canManageCategories = canPerm(permissions, permissionsState, "manage_parties");

  const normalized = (tab ?? "business-units").replace(/_/g, "-");
  const fromRoute =
    TABS.find((t) => t.id === normalized)?.id ??
    (normalized === "categories" ? "categories" : "business-units");

  const visibleTabs = TABS.filter((t) => {
    if (t.id === "categories") return canViewCategories;
    if (t.id === "branches") return true;
    return true;
  });

  const [active, setActive] = useState<MasterTabId>(
    visibleTabs.some((t) => t.id === fromRoute) ? fromRoute : "business-units",
  );

  useEffect(() => {
    if (visibleTabs.some((t) => t.id === fromRoute)) setActive(fromRoute);
  }, [fromRoute, canViewCategories]);

  return (
    <div className="space-y-4">
      <PageHeader title={t("masters.title")} subtitle={t("masters.subtitle")} />
      <Tabs
        value={active}
        onValueChange={(v) => {
          const t = TABS.find((x) => x.id === v);
          if (!t) return;
          setActive(t.id);
          if (t.id === "categories") {
            companyNavigate(companyPath("masters-categories"));
          } else if (t.id === "branches") {
            // Branches has no dedicated deep-link yet; keep in-tab only.
            return;
          } else {
            companyNavigate(companyPath(t.pathKey));
          }
        }}
      >
        <TabsList className="flex h-auto flex-wrap gap-1">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.id === "categories" ? (
              <CategoriesPanel canManage={canManageCategories} />
            ) : (
              <DimensionPanel kind={tab.id as DimensionKind} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
