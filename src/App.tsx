import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { AuthShell } from "@/components/auth/AuthShell";
import { CloudAuth } from "@/components/auth/CloudAuth";
import { LockScreen } from "@/components/auth/LockScreen";
import { AppShell } from "@/components/layout/AppShell";
import { AdminAppShell } from "@/components/layout/AdminAppShell";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { AdminAuth } from "@/components/auth/AdminAuth";
import { useNavStore } from "@/store/navStore";
import { useDataStore } from "@/store/dataStore";
import { getDB } from "@/db/database";
import { replayMutations } from "@/services/durableOutbox";
import { useUIStore } from "@/store/uiStore";
import { RequiredPinChange } from "@/components/auth/RequiredPinChange";

type AuthScreen = "cloud-signin" | "cloud-register";

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const locked = useAuthStore((s) => s.locked);
  const [authScreen, setAuthScreen] = useState<AuthScreen | null>(null);
  const hydrateCloudApp = useCloudAppStore((s) => s.hydrate);
  const viewerRole = useCloudAppStore((s) => s.viewerRole);
  const setActive = useNavStore((s) => s.setActive);
  const syncFromUrl = useNavStore((s) => s.syncFromUrl);
  const dataLoaded = useDataStore((s) => s.loaded);
  const dataLoadingFor = useDataStore((s) => s.loadingFor);
  const isAdminPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!currentUser || currentUser.mustChangePin || locked || isAdminPortal) return;
    let active = true;
    const userId = currentUser.id;
    const replay = () => {
      const isActive = () => active && useAuthStore.getState().currentUser?.id === userId && !useAuthStore.getState().locked;
      void replayMutations(getDB(), userId, isActive).catch(error => {
        if (isActive()) useUIStore.getState().toast({ title: "Pending changes could not be synchronized", description: error instanceof Error ? error.message : "Device storage is unavailable", kind: "error" });
      });
    };
    replay();
    window.addEventListener("online", replay);
    const interval = window.setInterval(replay, 30_000);
    return () => { active = false; window.removeEventListener("online", replay); window.clearInterval(interval); };
  }, [currentUser?.id, currentUser?.mustChangePin, locked, isAdminPortal]);

  useEffect(() => {
    hydrateCloudApp().catch(() => undefined);
  }, [hydrateCloudApp, currentUser?.id]);

  useEffect(() => {
    syncFromUrl();
    if (typeof window === "undefined") return;
    const onPopState = () => syncFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncFromUrl]);

  const defaultScreen: AuthScreen = "cloud-signin";
  const effectiveScreen = currentUser
    ? locked
      ? "lock"
      : "app"
    : (authScreen ?? defaultScreen);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdminPortal && !currentUser) {
    return (
      <AuthShell>
        <AdminAuth />
      </AuthShell>
    );
  }

  if (effectiveScreen === "cloud-signin" || effectiveScreen === "cloud-register") {
    return (
      <AuthShell>
        <CloudAuth
          initialMode={effectiveScreen === "cloud-register" ? "register" : "signin"}
          onBack={() => setAuthScreen("cloud-signin")}
        />
      </AuthShell>
    );
  }

  if (effectiveScreen === "lock") {
    return (
      <AuthShell>
        <LockScreen />
      </AuthShell>
    );
  }
  if (currentUser?.mustChangePin) return <AuthShell><RequiredPinChange /></AuthShell>;

  if (!isAdminPortal && effectiveScreen === "app" && (!dataLoaded || dataLoadingFor === currentUser?.id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdminPortal && viewerRole !== "admin") {
    return (
      <AuthShell>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <div className="text-lg font-semibold">Admin access required</div>
          <p className="mt-2 text-sm text-muted-foreground">Use an admin account at /admin.</p>
          <a href="/" className="mt-4 inline-block text-primary hover:underline">Go to user portal</a>
        </div>
      </AuthShell>
    );
  }

  if (!isAdminPortal && viewerRole === "admin") {
    return (
      <AuthShell>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <div className="text-lg font-semibold">Admin account detected</div>
          <p className="mt-2 text-sm text-muted-foreground">Admin accounts are restricted to /admin login.</p>
          <a href="/admin" className="mt-4 inline-block text-primary hover:underline">Go to admin portal</a>
        </div>
      </AuthShell>
    );
  }

  return isAdminPortal ? <AdminAppShell /> : <AppShell />;
}
