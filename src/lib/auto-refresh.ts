// Persisted preference + last-sync tracking for auto-refresh on app open.

export type AutoRefreshPrefs = {
  enabled: boolean;
  /** Refresh if last sync is older than this many hours. */
  thresholdHours: number;
};

const PREFS_KEY = "aether.autoRefresh.prefs.v1";
const LAST_KEY = "aether.autoRefresh.lastSync.v1";

const DEFAULTS: AutoRefreshPrefs = {
  enabled: true,
  thresholdHours: 6,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadAutoRefreshPrefs(): AutoRefreshPrefs {
  if (!isBrowser()) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AutoRefreshPrefs>;
    const hours = Number(parsed.thresholdHours);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULTS.enabled,
      thresholdHours:
        Number.isFinite(hours) && hours > 0 && hours <= 168 ? hours : DEFAULTS.thresholdHours,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveAutoRefreshPrefs(prefs: AutoRefreshPrefs) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("aether:autoRefreshPrefsChanged"));
  } catch {
    /* ignore */
  }
}

export function subscribeAutoRefreshPrefs(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("aether:autoRefreshPrefsChanged", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === PREFS_KEY) cb();
  });
  return () => window.removeEventListener("aether:autoRefreshPrefsChanged", handler);
}

export function getLastSyncAt(): Date | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const t = Number(raw);
    if (!Number.isFinite(t)) return null;
    return new Date(t);
  } catch {
    return null;
  }
}

export function setLastSyncAt(date: Date = new Date()) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_KEY, String(date.getTime()));
  } catch {
    /* ignore */
  }
}

export function shouldAutoRefresh(prefs: AutoRefreshPrefs, last: Date | null): boolean {
  if (!prefs.enabled) return false;
  if (!last) return true;
  const ageHours = (Date.now() - last.getTime()) / 36e5;
  return ageHours >= prefs.thresholdHours;
}

export function formatRelativeAge(last: Date | null): string {
  if (!last) return "never";
  const ms = Date.now() - last.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
