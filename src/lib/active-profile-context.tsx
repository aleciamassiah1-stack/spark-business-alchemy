import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { listMyProfiles, type ProfileSummary } from "@/lib/profiles.functions";

type Ctx = {
  ready: boolean;
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  activeProfile: ProfileSummary | null;
  setActiveProfileId: (id: string) => void;
  refresh: () => Promise<void>;
};

const C = createContext<Ctx | null>(null);
const STORAGE_KEY = "aw:active-profile-id";

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await listMyProfiles();
      setProfiles(r.profiles);
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const valid = stored && r.profiles.some((p) => p.id === stored);
      const initial = valid
        ? stored
        : r.profiles.find((p) => p.is_self)?.id ?? r.profiles[0]?.id ?? null;
      setActiveProfileIdState(initial);
    } catch {
      setProfiles([]);
      setActiveProfileIdState(user?.id ?? null);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setProfiles([]);
      setActiveProfileIdState(null);
      setReady(true);
      return;
    }
    setReady(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id]);

  const setActiveProfileId = (id: string) => {
    if (id === activeProfileId) return;
    setActiveProfileIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
      // Hard reload so every mounted page refetches against the newly
      // active profile (data hooks load on mount with empty deps).
      window.location.reload();
    }
  };

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  return (
    <C.Provider
      value={{ ready, profiles, activeProfileId, activeProfile, setActiveProfileId, refresh: load }}
    >
      {children}
    </C.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useActiveProfile must be used inside ActiveProfileProvider");
  return ctx;
}
