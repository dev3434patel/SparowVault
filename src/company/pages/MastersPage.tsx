import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { companyNavigate, companyPath, type CompanyNavKey } from "@/company/routes";
import { type DimensionKind } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyPermission } from "@/company/types";
import { PageHeader } from "@/company/components/PageChrome";
import { CategoriesPanel } from "@/company/pages/masters/CategoriesPanel";
import { DimensionPanel } from "@/company/pages/masters/DimensionPanel";
import { useI18n } from "@/company/i18n/react";

type MasterTabId = DimensionKind | "categories";

const TABS: Array<{
  id: MasterTabId;
  label: string;
  pathKey: CompanyNavKey;
}> = [
  { id: "business-units", label: "Business Units", pathKey: "masters-business-units" },
  { id: "branches", label: "Branches", pathKey: "masters-business-units" },
  { id: "areas", label: "Areas", pathKey: "masters-areas" },
  { id: "projects", label: "Projects", pathKey: "masters-projects" },
  { id: "cost-centres", label: "Cost Centres", pathKey: "masters-cost-centres" },
  { id: "categories", label: "Categories", pathKey: "masters-categories" },
];

function canPerm(permissions: CompanyPermission[], need: CompanyPermission) {
  if (permissions.length === 0) return true;
  return permissions.includes(need);
}

export function MastersPage({ tab }: { tab?: string }) {
  const { t } = useI18n();
  const permissions = useCompanyStore((s) => s.permissions);
  const canViewCategories = canPerm(permissions, "view_dashboard") || canPerm(permissions, "manage_parties");
  const canManageCategories = canPerm(permissions, "manage_parties");

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
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {visibleTabs.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            {t.id === "categories" ? (
              <CategoriesPanel canManage={canManageCategories} />
            ) : (
              <DimensionPanel kind={t.id as DimensionKind} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
