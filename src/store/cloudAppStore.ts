import { create } from "zustand";
import { fetchPublicConfig, fetchViewer, getMySubscription } from "@/lib/cloud/saasClient";

interface CloudAppState {
  viewerRole: "user" | "admin";
  flags: Record<string, boolean>;
  settings: Record<string, unknown>;
  effectiveFeatures: Record<string, boolean>;
  hydrate: () => Promise<void>;
}

export const useCloudAppStore = create<CloudAppState>((set) => ({
  viewerRole: "user",
  flags: {},
  settings: {},
  effectiveFeatures: {},
  hydrate: async () => {
    try {
      const [config, viewer] = await Promise.all([
        fetchPublicConfig(),
        fetchViewer().catch(() => null),
      ]);
      const sub = viewer ? await getMySubscription().catch(() => null) : null;
      set({
        flags: config.featureFlags ?? {},
        settings: config.settings ?? {},
        effectiveFeatures: sub?.effectiveFeatures ?? config.featureFlags ?? {},
        viewerRole: viewer?.role === "admin" ? "admin" : "user",
      });
      if (typeof document !== "undefined") {
        const title = String(config.settings?.app_title ?? "SparowVault");
        document.title = title;
        const favicon = String(config.settings?.favicon_url ?? "");
        if (favicon) {
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
          if (link) link.href = favicon;
        }
      }
    } catch {
      set({ viewerRole: "user" });
    }
  },
}));

