import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AriaLiveApi = {
  announce: (message: string) => void;
};

const AriaLiveContext = createContext<AriaLiveApi>({ announce: () => {} });

export function useAriaLive() {
  return useContext(AriaLiveContext);
}

/** Polite async-error / status announcer for screen readers. */
export function AriaLiveProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const announce = useCallback((msg: string) => {
    setMessage("");
    // Force re-announce even if the same string is posted twice.
    window.requestAnimationFrame(() => setMessage(msg));
  }, []);
  const api = useMemo(() => ({ announce }), [announce]);

  return (
    <AriaLiveContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-aria-live>
        {message}
      </div>
    </AriaLiveContext.Provider>
  );
}
