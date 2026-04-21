import { createContext, useContext, useState, type ReactNode } from "react";

type WealthCtx = {
  hideBalances: boolean;
  toggleHideBalances: () => void;
  syncing: boolean;
  syncMessage: string | null;
  setSyncing: (syncing: boolean, message?: string | null) => void;
};

const Ctx = createContext<WealthCtx | null>(null);

export function WealthProvider({ children }: { children: ReactNode }) {
  const [hideBalances, setHide] = useState(false);
  const [syncing, setSyncingState] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const setSyncing = (s: boolean, message: string | null = null) => {
    setSyncingState(s);
    setSyncMessage(message);
  };

  return (
    <Ctx.Provider
      value={{
        hideBalances,
        toggleHideBalances: () => setHide((v) => !v),
        syncing,
        syncMessage,
        setSyncing,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWealth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWealth must be used inside WealthProvider");
  return ctx;
}

export function maskValue(text: string, hide: boolean) {
  if (!hide) return text;
  return "••••••";
}
