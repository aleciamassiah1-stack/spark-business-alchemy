import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, CheckCircle2, XCircle, Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-context";
import {
  adminTestPropertyImage,
  adminCleanupDiagnosticUploads,
  type PropertyImageDiagnostic,
} from "@/lib/admin-diagnostics.functions";
import sampleImage from "@/assets/properties/178-westminster-yonkers.jpg";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/property-image-test")({
  head: () => ({
    meta: [
      { title: "Property Image Diagnostics — Admin" },
      { name: "description", content: "Verify property image uploads, storage RLS, and rendering." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PropertyImageTestPage,
});

function PropertyImageTestPage() {
  const auth = useAuth();
  const access = useAccess();
  const navigate = useNavigate();

  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<PropertyImageDiagnostic | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);

  // Gate: redirect non-admins
  useEffect(() => {
    if (auth.ready && !auth.user) navigate({ to: "/signin" });
  }, [auth.ready, auth.user, navigate]);
  useEffect(() => {
    if (access.ready && !access.isAdmin && auth.user) navigate({ to: "/" });
  }, [access.ready, access.isAdmin, auth.user, navigate]);

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string; fileName: string }> {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], "westminster-sample.jpg", { type: blob.type || "image/jpeg" });
    return {
      base64: await fileToBase64(file),
      mimeType: file.type,
      fileName: file.name,
    };
  }

  async function runTest(useCustom: boolean) {
    setRunning(true);
    setResult(null);
    try {
      let payload: { fileName: string; base64: string; mimeType: string };
      if (useCustom && customFile) {
        payload = {
          fileName: customFile.name,
          base64: await fileToBase64(customFile),
          mimeType: customFile.type,
        };
      } else {
        payload = await urlToBase64(sampleImage);
      }
      const diag = await adminTestPropertyImage({ data: payload });
      setResult(diag);
      if (diag.ok) toast.success("All diagnostic checks passed");
      else toast.error("One or more checks failed — see details");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Test failed";
      toast.error(msg);
      setResult({ ok: false, steps: [{ label: "Run test", ok: false, detail: msg }], property: null, uploadedUrl: null, uploadedPath: null });
    } finally {
      setRunning(false);
    }
  }

  async function cleanup() {
    setCleaning(true);
    try {
      const res = await adminCleanupDiagnosticUploads();
      if (res.ok) toast.success(`Removed ${res.removed} diagnostic file(s)`);
      else toast.error(res.error ?? "Cleanup failed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }

  if (!access.ready || (access.ready && !access.isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
          <Link to="/admin" className="p-1 rounded-md hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-serif text-xl text-foreground">Property Image Diagnostics</h1>
            <p className="text-xs text-muted-foreground">
              End-to-end test: upload → storage RLS → public URL → DB persistence
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Action panel */}
        <section className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-4">
          <div>
            <h2 className="font-serif text-lg text-foreground">Run test</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Targets the property at <span className="font-mono">178 Westminster Drive, Yonkers NY</span> in your admin
              account. Uploads a sample image, verifies the public URL resolves, persists the URL on the row, and reads
              it back.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runTest(false)}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Run with bundled sample
            </button>
            <label className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-muted/30">
              <Upload className="h-4 w-4" />
              Choose file…
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setCustomFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {customFile && (
              <button
                onClick={() => runTest(true)}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Run with {customFile.name}
              </button>
            )}
            <button
              onClick={cleanup}
              disabled={cleaning}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 text-destructive bg-background/40 px-4 py-2 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 ml-auto"
            >
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clean up diagnostic uploads
            </button>
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="rounded-2xl border border-border/40 bg-card/30 p-5 space-y-4">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <h2 className="font-serif text-lg text-foreground">
                {result.ok ? "All checks passed" : "Test failed"}
              </h2>
            </div>

            <ol className="space-y-2">
              {result.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/30 p-3"
                >
                  {step.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground font-mono break-all mt-0.5">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            {result.uploadedUrl && (
              <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Rendered image preview</p>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={result.uploadedUrl}
                    alt="Diagnostic upload"
                    className="h-full w-full object-cover"
                    onError={() => toast.error("Image failed to render — public URL unreachable")}
                  />
                </div>
                <p className="text-[11px] font-mono text-muted-foreground break-all">{result.uploadedUrl}</p>
              </div>
            )}

            {result.property && (
              <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Persisted property row</p>
                <pre className="text-[11px] font-mono text-foreground/80 overflow-x-auto">
                  {JSON.stringify(result.property, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
