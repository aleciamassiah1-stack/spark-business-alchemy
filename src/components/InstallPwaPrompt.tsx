import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "aether.installPrompt.dismissedAt";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const iosDevice = isIos();
    setIos(iosDevice);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — show after a short delay
    let t: ReturnType<typeof setTimeout> | null = null;
    if (iosDevice) {
      t = setTimeout(() => setVisible(true), 1200);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setShowIosSteps(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      return;
    }
    if (ios) {
      setShowIosSteps(true);
    }
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="install-prompt"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-24 z-50 mx-auto max-w-[420px] px-4 sm:bottom-6"
      >
        <div className="gradient-card relative overflow-hidden rounded-2xl border border-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {!showIosSteps ? (
            <div className="flex items-center gap-3 pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-violet glow-violet">
                <Download className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm text-foreground">Install Æther Wealth</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Add to your home screen for the full app experience.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstall}
                className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
              >
                Install
              </button>
            </div>
          ) : (
            <div className="pr-4">
              <p className="font-serif text-base text-foreground">Add to Home Screen</p>
              <ol className="mt-3 space-y-2 text-xs text-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">1</span>
                  <span>
                    Tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share button in Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">2</span>
                  <span>Choose <strong>Add to Home Screen</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">3</span>
                  <span>Tap <strong>Add</strong> to finish.</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
