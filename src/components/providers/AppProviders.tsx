import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useCompanyStore } from "@/company/store/companyStore";
import { ToastHost } from "@/components/ui/Toast";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const loadBootstrap = useDataStore((s) => s.loadBootstrap);
  const clear = useDataStore((s) => s.clear);
  const clearCompany = useCompanyStore((s) => s.clear);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Do not wipe company/personal state during auth bootstrap (currentUser is null briefly).
    if (!authHydrated) return;
    if (!currentUser) {
      clear();
      clearCompany();
      return;
    }
    void loadBootstrap(currentUser);
  }, [authHydrated, currentUser, loadBootstrap, clear, clearCompany]);

  return (
    <>
      {children}
      <ToastHost />
      <ConfirmHost />
    </>
  );
}
