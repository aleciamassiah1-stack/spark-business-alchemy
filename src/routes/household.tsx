import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { useAccess } from "@/lib/access-context";
import {
  listMyProfiles,
  createManagedProfile,
  deleteManagedProfile,
  listProfileMembers,
  grantProfileAccessByEmail,
  revokeProfileAccess,
  type ProfileSummary,
} from "@/lib/profiles.functions";

export const Route = createFileRoute("/household")({
  head: () => ({
    meta: [
      { title: "Household profiles — Æther Wealth" },
      {
        name: "description",
        content:
          "Create and manage household profiles, and invite spouse or family logins to share access.",
      },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <HouseholdPage />
    </RequireOnboarding>
  ),
});

function HouseholdPage() {
  const access = useAccess();
  const isFamily = access.tier === "family" || access.isAdmin;
  const qc = useQueryClient();

  const fetchProfiles = useServerFn(listMyProfiles);
  const { data, isLoading } = useQuery({
    queryKey: ["household-profiles"],
    queryFn: () => fetchProfiles(),
    enabled: isFamily,
  });

  const profiles = data?.profiles ?? [];

  if (!access.ready) {
    return (
      <MobileShell>
        <div className="px-5 pt-10 text-center text-sm text-muted-foreground">Loading…</div>
      </MobileShell>
    );
  }

  if (!isFamily) {
    return (
      <MobileShell title="Household">
        <div className="px-5 pt-4">
          <LuxCard className="p-6 text-center">
            <p className="text-sm text-foreground">
              Household profiles are part of the Family Office plan.
            </p>
            <Link
              to="/pricing"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              See plans
            </Link>
          </LuxCard>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Household" subtitle="Profiles & shared access">
      <div className="space-y-4 px-5 pb-24 pt-2">
        <Link
          to="/family-office"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Family Office
        </Link>

        <CreateProfileCard
          onCreated={() => qc.invalidateQueries({ queryKey: ["household-profiles"] })}
        />

        <div className="space-y-3">
          {isLoading && (
            <p className="text-center text-xs text-muted-foreground">Loading profiles…</p>
          )}
          {profiles.map((p) => (
            <ProfileRow
              key={p.id}
              profile={p}
              onChanged={() => qc.invalidateQueries({ queryKey: ["household-profiles"] })}
            />
          ))}
          {!isLoading && profiles.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">No profiles yet.</p>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function CreateProfileCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const create = useServerFn(createManagedProfile);
  const m = useMutation({
    mutationFn: (input: { display_name: string; relationship?: string }) =>
      create({ data: input }),
    onSuccess: () => {
      toast.success("Profile created");
      setName("");
      setRelationship("");
      setOpen(false);
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create"),
  });

  return (
    <LuxCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Add household profile</p>
          <p className="text-xs text-muted-foreground">
            Create a profile for your spouse, child, or trust.
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? "ghost" : "secondary"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <Input
            placeholder="Display name (e.g. Jane Smith)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <Input
            placeholder="Relationship (spouse, child, trust…)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            maxLength={80}
          />
          <Button
            className="w-full"
            disabled={!name.trim() || m.isPending}
            onClick={() =>
              m.mutate({
                display_name: name.trim(),
                relationship: relationship.trim() || undefined,
              })
            }
          >
            {m.isPending ? "Creating…" : "Create profile"}
          </Button>
        </div>
      )}
    </LuxCard>
  );
}

function ProfileRow({
  profile,
  onChanged,
}: {
  profile: ProfileSummary;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const del = useServerFn(deleteManagedProfile);
  const delM = useMutation({
    mutationFn: () => del({ data: { id: profile.id } }),
    onSuccess: () => {
      toast.success("Profile deleted");
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete"),
  });

  return (
    <LuxCard className="p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            background: profile.color ?? "hsl(var(--primary) / 0.18)",
            color: "var(--primary-foreground)",
          }}
        >
          {profile.initials ?? profile.display_name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {profile.is_self ? "You" : profile.relationship ?? "Linked profile"}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide" : "Manage"}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
          {profile.role === "owner" ? (
            <MembersPanel profileId={profile.id} />
          ) : (
            <p className="text-xs text-muted-foreground">
              You have member access to this profile. Only the owner can manage logins.
            </p>
          )}
          {!profile.is_self && profile.role === "owner" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive"
              onClick={() => {
                if (confirm(`Delete profile "${profile.display_name}"? This cannot be undone.`))
                  delM.mutate();
              }}
              disabled={delM.isPending}
            >
              <Trash2 className="mr-2 h-3 w-3" />
              {delM.isPending ? "Deleting…" : "Delete profile"}
            </Button>
          )}
        </div>
      )}
    </LuxCard>
  );
}

function MembersPanel({ profileId }: { profileId: string }) {
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listProfileMembers);
  const grant = useServerFn(grantProfileAccessByEmail);
  const revoke = useServerFn(revokeProfileAccess);
  const [email, setEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profile-members", profileId],
    queryFn: () => fetchMembers({ data: { profile_id: profileId } }),
  });

  const grantM = useMutation({
    mutationFn: () => grant({ data: { profile_id: profileId, email: email.trim() } }),
    onSuccess: () => {
      toast.success("Access granted");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["profile-members", profileId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not grant access"),
  });

  const revokeM = useMutation({
    mutationFn: (auth_user_id: string) =>
      revoke({ data: { profile_id: profileId, auth_user_id } }),
    onSuccess: () => {
      toast.success("Access revoked");
      qc.invalidateQueries({ queryKey: ["profile-members", profileId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not revoke"),
  });

  const members = data?.members ?? [];

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Logins with access
      </p>
      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {members.map((m) => (
          <div
            key={m.auth_user_id}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs text-foreground">{m.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.role}
              </span>
              {m.role !== "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Revoke access for ${m.email}?`))
                      revokeM.mutate(m.auth_user_id);
                  }}
                  disabled={revokeM.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && members.length === 0 && (
          <p className="text-xs text-muted-foreground">No one has access yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => grantM.mutate()}
          disabled={!email.trim() || grantM.isPending}
        >
          <UserPlus className="mr-1 h-3 w-3" />
          {grantM.isPending ? "…" : "Invite"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        They must already have an Æther Wealth account. Ask them to sign up first if needed.
      </p>
    </div>
  );
}
