import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { ToastHost } from "@/components/ui/Toast";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const currentUser = useAuthStore((s) => s.currentUser);
  const loadBootstrap = useDataStore((s) => s.loadBootstrap);
  const clear = useDataStore((s) => s.clear);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!currentUser) {
      clear();
      return;
    }
    loadBootstrap(currentUser);
  }, [currentUser, loadBootstrap, clear]);

  return (
    <>
      {children}
      <ToastHost />
      <ConfirmHost />
    </>
  );
}
