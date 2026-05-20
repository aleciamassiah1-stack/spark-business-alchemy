import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Users } from "lucide-react";
import { useActiveProfile } from "@/lib/active-profile-context";

export function ProfileSwitcher({ className = "" }: { className?: string }) {
  const { ready, profiles, activeProfile, activeProfileId, setActiveProfileId } =
    useActiveProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!ready || profiles.length <= 1) return null;
  const active = activeProfile ?? profiles[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground hover:bg-white/[0.06]"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{
            background: active?.color ?? "hsl(var(--primary) / 0.18)",
            color: "var(--primary-foreground)",
          }}
        >
          {active?.initials ?? <Users className="h-3 w-3" />}
        </span>
        <span className="max-w-[120px] truncate">{active?.display_name ?? "Profile"}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-background shadow-xl">
          <div className="border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Viewing as
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileId(p.id);
                      setOpen(false);
                      // Reload so all in-flight queries refetch under the new scope
                      if (typeof window !== "undefined") window.location.reload();
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        background: p.color ?? "hsl(var(--primary) / 0.18)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {p.initials ?? p.display_name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground">{p.display_name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {p.is_self ? "You" : p.relationship ?? "Linked profile"}
                      </span>
                    </span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
