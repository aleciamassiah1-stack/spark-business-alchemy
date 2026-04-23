import { Link } from "@tanstack/react-router";

type Props = {
  /** Adds bottom padding to clear the fixed BottomNav (use inside MobileShell). */
  withBottomNavSpacing?: boolean;
  className?: string;
};

/**
 * Persistent legal footer with Terms & Privacy links.
 * Shown on the public landing page and across authenticated app screens.
 */
export function LegalFooter({ withBottomNavSpacing = false, className = "" }: Props) {
  return (
    <footer
      className={`relative z-10 flex flex-col items-center gap-2 px-5 pt-6 text-center ${
        withBottomNavSpacing ? "pb-24" : "pb-6"
      } ${className}`}
    >
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Link to="/terms" className="transition-colors hover:text-foreground">
          Terms
        </Link>
        <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <Link to="/privacy" className="transition-colors hover:text-foreground">
          Privacy
        </Link>
      </div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
        © {new Date().getFullYear()} Æther Wealth
      </p>
    </footer>
  );
}
