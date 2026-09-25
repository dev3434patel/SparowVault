import { useEffect, useState, type ReactNode } from "react";
import { useCompanyStore } from "@/company/store/companyStore";
import { useAuthStore } from "@/store/authStore";
import { AriaLiveProvider } from "@/company/components/AriaLiveRegion";
import { I18nProvider, useI18n } from "@/company/i18n/react";

function CompanyProvidersInner({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const hydrateFromApi = useCompanyStore((s) => s.hydrateFromApi);
  const currentUser = useAuthStore((s) => s.currentUser);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait for auth bootstrap — a transient null user must not wipe company LS.
      if (!authHydrated) {
        if (!cancelled) setReady(false);
        return;
      }
      if (!currentUser) {
        useCompanyStore.getState().clear();
        if (!cancelled) setReady(true);
        return;
      }
      await hydrateFromApi();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, currentUser?.id, hydrateFromApi]);

  if ((!ready || !authHydrated) && currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("common.loadingWorkspace")}
      </div>
    );
  }

  if (!authHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("common.loadingWorkspace")}
      </div>
    );
  }

  return <AriaLiveProvider>{children}</AriaLiveProvider>;
}

export function CompanyProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <CompanyProvidersInner>{children}</CompanyProvidersInner>
    </I18nProvider>
  );
}
