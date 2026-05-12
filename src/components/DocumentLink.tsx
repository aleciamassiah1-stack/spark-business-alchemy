import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getWealthDocumentSignedUrl } from "@/lib/wealth.functions";

type Props = {
  documentPath: string | null | undefined;
  fallbackUrl?: string | null;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

/**
 * Opens a private wealth-documents file by minting a fresh short-lived signed URL
 * on click. Falls back to a stored URL when no path is available (legacy rows).
 */
export function DocumentLink({
  documentPath,
  fallbackUrl,
  className,
  ariaLabel,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (loading) return;
    if (!documentPath) {
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No document on file");
      }
      return;
    }
    setLoading(true);
    try {
      const res = await getWealthDocumentSignedUrl({ data: { path: documentPath } });
      if (res.ok && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(res.error ?? "Could not open document");
      }
    } catch {
      toast.error("Could not open document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label={ariaLabel}
      disabled={loading}
      className={className}
    >
      {children}
    </button>
  );
}
