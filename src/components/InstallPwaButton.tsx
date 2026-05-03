import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallPwaButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIos());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  // On non-iOS without a deferred prompt, the browser doesn't support install — hide.
  if (!deferred && !ios) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (ios) setShowIosSheet(true);
  }

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        className={className}
      >
        <Download className="h-4 w-4" />
        Install Æther Wealth
      </Button>

      <Dialog open={showIosSheet} onOpenChange={setShowIosSheet}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Add to Home Screen</DialogTitle>
            <DialogDescription>
              Install Æther Wealth on your iPhone or iPad for a full-screen, app-like experience.
            </DialogDescription>
          </DialogHeader>
          <ol className="mt-2 space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">1</span>
              <span>
                Tap the <Share className="inline h-4 w-4 align-text-bottom" /> Share button in Safari's toolbar.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">2</span>
              <span>Scroll and choose <strong>Add to Home Screen</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">3</span>
              <span>Tap <strong>Add</strong> — Æther will appear on your home screen.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
