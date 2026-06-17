import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Sparkles, FileDown, Save, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { getWillDraft, saveWillDraft, getWillSeedData, type WillData, type WillSeedData } from "@/lib/will-builder.functions";
import { generateWillPdf } from "@/lib/will-pdf";
import { upsertEstateDocument, uploadWealthDocument } from "@/lib/wealth.functions";

export const Route = createFileRoute("/will-builder")({
  head: () => ({
    meta: [
      { title: "Will Builder — Æther Wealth" },
      {
        name: "description",
        content:
          "Guided step-by-step builder for your Last Will and Testament. Name executors, guardians, beneficiaries and generate a printable draft saved to your estate vault.",
      },
      { property: "og:title", content: "Will Builder — Æther Wealth" },
      {
        property: "og:description",
        content: "Build a clear, complete draft of your Last Will and Testament in minutes.",
      },
      { property: "og:url", content: "https://aetherwealth.co/will-builder" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/will-builder" }],
  }),
  component: () => (
    <RequireOnboarding>
      <WillBuilderPage />
    </RequireOnboarding>
  ),
});

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const STEPS = [
  "Welcome",
  "About you",
  "Family",
  "Executor",
  "Guardians",
  "Beneficiaries",
  "Specific bequests",
  "Pets",
  "Final wishes",
  "Witnesses",
  "Review & generate",
];

function blankData(): WillData {
  return {
    testator: { maritalStatus: "" },
    executor: {},
    guardian: { hasMinorChildren: false, children: [] },
    beneficiaries: [],
    specificBequests: [],
    residualClause: "beneficiaries",
    finalWishes: { disposition: "" },
    pets: [],
    attestation: { notary: true },
  };
}

function fileToFingerprint(d: WillData) {
  return JSON.stringify(d);
}

function applySeedData(seed: WillSeedData): Partial<WillData> {
  const patch: Partial<WillData> = {};

  const spouse = seed.familyMembers.find((m) =>
    /spouse|wife|husband|partner/i.test(m.relationship),
  );
  if (spouse) {
    patch.testator = {
      ...patch.testator,
      maritalStatus: "married",
      spouseName: spouse.name,
    };
  }

  const childKeywords = /son|daughter|child|kid/i;
  const minorChildren = seed.familyMembers.filter(
    (m) => (m.age !== null && m.age < 18) || childKeywords.test(m.relationship),
  );
  if (minorChildren.length > 0) {
    patch.guardian = {
      hasMinorChildren: true,
      children: minorChildren.map((c) => ({ name: c.name })),
    };
  }

  const beneficiaryMap = new Map<string, { name: string; relation?: string }>();
  for (const name of seed.insuranceBeneficiaries) {
    const familyMatch = seed.familyMembers.find(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
    );
    beneficiaryMap.set(name.toLowerCase(), {
      name,
      relation: familyMatch?.relationship,
    });
  }
  for (const m of seed.familyMembers) {
    if (!beneficiaryMap.has(m.name.toLowerCase())) {
      beneficiaryMap.set(m.name.toLowerCase(), {
        name: m.name,
        relation: m.relationship,
      });
    }
  }

  const beneficiaries = Array.from(beneficiaryMap.values());
  if (beneficiaries.length > 0) {
    const share = Math.floor(100 / beneficiaries.length);
    const remainder = 100 - share * beneficiaries.length;
    patch.beneficiaries = beneficiaries.map((b, i) => ({
      name: b.name,
      relation: b.relation,
      sharePercent: share + (i === 0 ? remainder : 0),
    }));
  }

  if (spouse) {
    patch.executor = {
      name: spouse.name,
      relation: spouse.relationship,
    };
  }

  return patch;
}

function WillBuilderPage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WillData>(blankData());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getWillDraft(), getWillSeedData()])
      .then(([draftRes, seedRes]) => {
        if (!mounted) return;
        if (draftRes.draft) {
          setDraftId(draftRes.draft.id);
          const merged = { ...blankData(), ...(draftRes.draft.data as WillData) };
          setData(merged);
          setStep(Math.min(draftRes.draft.step ?? 0, STEPS.length - 1));
          setLastSavedFingerprint(fileToFingerprint(merged));
        } else {
          // No existing draft — apply seed data from Family Vault + insurance
          const seededData = applySeedData(seedRes);
          if (seededData && (seededData.beneficiaries?.length || seededData.guardian?.children?.length || seededData.testator?.spouseName)) {
            const merged = { ...blankData(), ...seededData };
            setData(merged);
            setSeeded(true);
            setLastSavedFingerprint(fileToFingerprint(merged));
            // Auto-save the seeded draft silently
            saveWillDraft({ data: { data: merged, step: 0, status: "draft" } }).then((res) => {
              if (res.id) setDraftId(res.id);
            }).catch(() => { /* ignore */ });
          }
        }
      })
      .finally(() => mounted && setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  // Autosave (debounced) when the user changes step or pauses editing
  useEffect(() => {
    if (!loaded) return;
    const fp = fileToFingerprint(data);
    if (fp === lastSavedFingerprint) return;
    const handle = setTimeout(async () => {
      try {
        const res = await saveWillDraft({ data: { id: draftId ?? undefined, data, step, status: "draft" } });
        if (res.ok) {
          if (res.id) setDraftId(res.id);
          setLastSavedFingerprint(fp);
        }
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => clearTimeout(handle);
  }, [data, step, loaded, draftId, lastSavedFingerprint]);

  const totalShare = useMemo(
    () => (data.beneficiaries ?? []).reduce((s, b) => s + (Number(b.sharePercent) || 0), 0),
    [data.beneficiaries],
  );

  const updateTestator = (patch: Partial<NonNullable<WillData["testator"]>>) =>
    setData((d) => ({ ...d, testator: { ...d.testator, ...patch } }));
  const updateExecutor = (patch: Partial<NonNullable<WillData["executor"]>>) =>
    setData((d) => ({ ...d, executor: { ...d.executor, ...patch } }));
  const updateGuardian = (patch: Partial<NonNullable<WillData["guardian"]>>) =>
    setData((d) => ({ ...d, guardian: { ...d.guardian, ...patch } }));
  const updateWishes = (patch: Partial<NonNullable<WillData["finalWishes"]>>) =>
    setData((d) => ({ ...d, finalWishes: { ...d.finalWishes, ...patch } }));
  const updateAttestation = (patch: Partial<NonNullable<WillData["attestation"]>>) =>
    setData((d) => ({ ...d, attestation: { ...d.attestation, ...patch } }));

  async function manualSave() {
    setSaving(true);
    try {
      const res = await saveWillDraft({ data: { id: draftId ?? undefined, data, step, status: "draft" } });
      if (res.ok) {
        if (res.id) setDraftId(res.id);
        setLastSavedFingerprint(fileToFingerprint(data));
        toast.success("Draft saved");
      } else {
        toast.error(res.error ?? "Could not save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function generateAndSave() {
    if (!data.testator?.fullName?.trim()) {
      toast.error("Please add your full legal name first.");
      setStep(1);
      return;
    }
    if (totalShare > 0 && Math.round(totalShare) !== 100 && data.residualClause === "beneficiaries") {
      toast.error(`Beneficiary shares must total 100% (currently ${totalShare}%).`);
      setStep(5);
      return;
    }
    setGenerating(true);
    try {
      const stateCode = data.testator?.state || "";
      const bytes = await generateWillPdf(data, stateCode);
      // Trigger local download
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fileName = `Last-Will-${(data.testator?.fullName ?? "Draft").replace(/\s+/g, "-")}.pdf`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Upload to vault
      let b64 = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        b64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(b64);

      const up = await uploadWealthDocument({
        data: {
          folder: "estate",
          fileName,
          base64,
          mimeType: "application/pdf",
        },
      });
      if (up.ok) {
        await upsertEstateDocument({
          data: {
            document_type: "will",
            title: `Last Will & Testament — ${data.testator?.fullName ?? "Draft"}`,
            status: "needs_review",
            signed_date: new Date().toISOString().slice(0, 10),
            document_path: up.path,
            document_url: up.url,
          },
        });
        toast.success("Will draft generated and saved to your Estate Vault");
      } else {
        toast.warning("PDF downloaded, but couldn't save to vault: " + (up.error ?? ""));
      }

      await saveWillDraft({
        data: { id: draftId ?? undefined, data, step: STEPS.length - 1, status: "completed" },
      });
      navigate({ to: "/legacy" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  if (!loaded) {
    return (
      <MobileShell title="Will Builder" subtitle="Guided template">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <MobileShell title="Will Builder" subtitle={STEPS[step]}>
      <div className="space-y-4 px-5 pb-32">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label-mono">Step {step + 1} of {STEPS.length}</p>
            <button
              type="button"
              onClick={manualSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save draft
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {seeded && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] text-primary">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Pre-filled from your Family Vault &amp; insurance beneficiaries. Review and adjust as needed.</span>
          </div>
        )}

        {step === 0 && (
          <LuxCard className="p-5">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="font-serif text-xl text-foreground">Build your Last Will & Testament</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A guided template that walks you through executors, guardians, beneficiaries and final wishes.
              When you finish, we'll generate a printable PDF draft and save it to your Estate Vault.
            </p>
            <ul className="mt-4 space-y-2 text-[12px] text-muted-foreground">
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 text-gold shrink-0" /> Takes about 10 minutes — your progress autosaves.</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 text-gold shrink-0" /> Includes a state-specific signing & witness page.</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 text-gold shrink-0" /> Always review with a licensed attorney before signing.</li>
            </ul>
          </LuxCard>
        )}

        {step === 1 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">About you</h2>
            <Field label="Full legal name">
              <Input value={data.testator?.fullName ?? ""} onChange={(e) => updateTestator({ fullName: e.target.value })} placeholder="Jane Marie Doe" />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={data.testator?.dob ?? ""} onChange={(e) => updateTestator({ dob: e.target.value })} />
            </Field>
            <Field label="Street address">
              <Input value={data.testator?.address ?? ""} onChange={(e) => updateTestator({ address: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City"><Input value={data.testator?.city ?? ""} onChange={(e) => updateTestator({ city: e.target.value })} /></Field>
              <Field label="ZIP"><Input value={data.testator?.zip ?? ""} onChange={(e) => updateTestator({ zip: e.target.value })} /></Field>
            </div>
            <Field label="State of residence">
              <Select value={data.testator?.state ?? ""} onValueChange={(v) => updateTestator({ state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </LuxCard>
        )}

        {step === 2 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Family</h2>
            <Field label="Marital status">
              <Select
                value={data.testator?.maritalStatus || ""}
                onValueChange={(v) => updateTestator({ maritalStatus: v as NonNullable<WillData["testator"]>["maritalStatus"] })}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {data.testator?.maritalStatus === "married" && (
              <Field label="Spouse's full name">
                <Input value={data.testator?.spouseName ?? ""} onChange={(e) => updateTestator({ spouseName: e.target.value })} />
              </Field>
            )}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-sm">I have minor children</Label>
              <Switch
                checked={!!data.guardian?.hasMinorChildren}
                onCheckedChange={(v) => updateGuardian({ hasMinorChildren: v, children: v ? data.guardian?.children ?? [{ name: "" }] : [] })}
              />
            </div>
            {data.guardian?.hasMinorChildren && (
              <div className="space-y-2">
                {(data.guardian.children ?? []).map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
                    <Input
                      placeholder="Child name"
                      value={c.name}
                      onChange={(e) => {
                        const arr = [...(data.guardian?.children ?? [])];
                        arr[i] = { ...arr[i], name: e.target.value };
                        updateGuardian({ children: arr });
                      }}
                    />
                    <Input
                      type="date"
                      value={c.dob ?? ""}
                      onChange={(e) => {
                        const arr = [...(data.guardian?.children ?? [])];
                        arr[i] = { ...arr[i], dob: e.target.value };
                        updateGuardian({ children: arr });
                      }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const arr = [...(data.guardian?.children ?? [])];
                      arr.splice(i, 1);
                      updateGuardian({ children: arr });
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => updateGuardian({ children: [...(data.guardian?.children ?? []), { name: "" }] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add child
                </Button>
              </div>
            )}
          </LuxCard>
        )}

        {step === 3 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Executor</h2>
            <p className="text-xs text-muted-foreground">The person who will administer your estate and carry out the instructions in this Will.</p>
            <Field label="Primary executor name"><Input value={data.executor?.name ?? ""} onChange={(e) => updateExecutor({ name: e.target.value })} /></Field>
            <Field label="Relationship"><Input value={data.executor?.relation ?? ""} placeholder="e.g. spouse, sibling, friend" onChange={(e) => updateExecutor({ relation: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={data.executor?.phone ?? ""} onChange={(e) => updateExecutor({ phone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={data.executor?.email ?? ""} onChange={(e) => updateExecutor({ email: e.target.value })} /></Field>
            </div>
            <Field label="Alternate executor name"><Input value={data.executor?.alternateName ?? ""} onChange={(e) => updateExecutor({ alternateName: e.target.value })} /></Field>
            <Field label="Alternate relationship"><Input value={data.executor?.alternateRelation ?? ""} onChange={(e) => updateExecutor({ alternateRelation: e.target.value })} /></Field>
          </LuxCard>
        )}

        {step === 4 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Guardians for minor children</h2>
            {data.guardian?.hasMinorChildren ? (
              <>
                <p className="text-xs text-muted-foreground">If both parents are unable to care for your minor children, this person will become their legal guardian.</p>
                <Field label="Primary guardian name"><Input value={data.guardian?.primaryName ?? ""} onChange={(e) => updateGuardian({ primaryName: e.target.value })} /></Field>
                <Field label="Relationship"><Input value={data.guardian?.primaryRelation ?? ""} onChange={(e) => updateGuardian({ primaryRelation: e.target.value })} /></Field>
                <Field label="Alternate guardian name"><Input value={data.guardian?.alternateName ?? ""} onChange={(e) => updateGuardian({ alternateName: e.target.value })} /></Field>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You indicated you don't have minor children. You can skip this step.</p>
            )}
          </LuxCard>
        )}

        {step === 5 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Beneficiaries</h2>
            <p className="text-xs text-muted-foreground">Who should inherit the remainder of your estate, and in what proportions? Shares must total 100%.</p>
            <Field label="Residuary clause">
              <Select value={data.residualClause ?? "beneficiaries"} onValueChange={(v) => setData((d) => ({ ...d, residualClause: v as WillData["residualClause"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beneficiaries">Distribute among named beneficiaries</SelectItem>
                  {data.testator?.maritalStatus === "married" && <SelectItem value="spouse">All to my spouse</SelectItem>}
                  <SelectItem value="custom">Custom language</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {data.residualClause === "custom" && (
              <Field label="Custom residuary language">
                <Textarea rows={4} value={data.residualCustom ?? ""} onChange={(e) => setData((d) => ({ ...d, residualCustom: e.target.value }))} />
              </Field>
            )}
            {data.residualClause !== "custom" && data.residualClause !== "spouse" && (
              <div className="space-y-2">
                {(data.beneficiaries ?? []).map((b, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2">
                    <Input placeholder="Name" value={b.name} onChange={(e) => {
                      const arr = [...(data.beneficiaries ?? [])]; arr[i] = { ...arr[i], name: e.target.value };
                      setData((d) => ({ ...d, beneficiaries: arr }));
                    }} />
                    <Input placeholder="Relation" value={b.relation ?? ""} onChange={(e) => {
                      const arr = [...(data.beneficiaries ?? [])]; arr[i] = { ...arr[i], relation: e.target.value };
                      setData((d) => ({ ...d, beneficiaries: arr }));
                    }} />
                    <Input type="number" placeholder="%" value={b.sharePercent ?? ""} onChange={(e) => {
                      const arr = [...(data.beneficiaries ?? [])]; arr[i] = { ...arr[i], sharePercent: Number(e.target.value) };
                      setData((d) => ({ ...d, beneficiaries: arr }));
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const arr = [...(data.beneficiaries ?? [])]; arr.splice(i, 1);
                      setData((d) => ({ ...d, beneficiaries: arr }));
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setData((d) => ({ ...d, beneficiaries: [...(d.beneficiaries ?? []), { name: "", sharePercent: 0 }] }))}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add beneficiary
                  </Button>
                  <p className={`font-mono text-xs ${Math.round(totalShare) === 100 ? "text-primary" : "text-warning"}`}>
                    Total: {totalShare}%
                  </p>
                </div>
              </div>
            )}
          </LuxCard>
        )}

        {step === 6 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Specific bequests</h2>
            <p className="text-xs text-muted-foreground">Particular items going to specific people — heirlooms, jewelry, vehicles, art. Optional.</p>
            {(data.specificBequests ?? []).map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Item" value={b.item} onChange={(e) => {
                  const arr = [...(data.specificBequests ?? [])]; arr[i] = { ...arr[i], item: e.target.value };
                  setData((d) => ({ ...d, specificBequests: arr }));
                }} />
                <Input placeholder="To recipient" value={b.recipient} onChange={(e) => {
                  const arr = [...(data.specificBequests ?? [])]; arr[i] = { ...arr[i], recipient: e.target.value };
                  setData((d) => ({ ...d, specificBequests: arr }));
                }} />
                <Button variant="ghost" size="icon" onClick={() => {
                  const arr = [...(data.specificBequests ?? [])]; arr.splice(i, 1);
                  setData((d) => ({ ...d, specificBequests: arr }));
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setData((d) => ({ ...d, specificBequests: [...(d.specificBequests ?? []), { item: "", recipient: "" }] }))}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add bequest
            </Button>
          </LuxCard>
        )}

        {step === 7 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Pets</h2>
            <p className="text-xs text-muted-foreground">Name a caretaker for each pet and optionally set aside funds for their care.</p>
            {(data.pets ?? []).map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2">
                <Input placeholder="Pet name" value={p.name} onChange={(e) => {
                  const arr = [...(data.pets ?? [])]; arr[i] = { ...arr[i], name: e.target.value };
                  setData((d) => ({ ...d, pets: arr }));
                }} />
                <Input placeholder="Caretaker" value={p.caretakerName ?? ""} onChange={(e) => {
                  const arr = [...(data.pets ?? [])]; arr[i] = { ...arr[i], caretakerName: e.target.value };
                  setData((d) => ({ ...d, pets: arr }));
                }} />
                <Input type="number" placeholder="Fund $" value={p.fundAmount ?? ""} onChange={(e) => {
                  const arr = [...(data.pets ?? [])]; arr[i] = { ...arr[i], fundAmount: Number(e.target.value) };
                  setData((d) => ({ ...d, pets: arr }));
                }} />
                <Button variant="ghost" size="icon" onClick={() => {
                  const arr = [...(data.pets ?? [])]; arr.splice(i, 1);
                  setData((d) => ({ ...d, pets: arr }));
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setData((d) => ({ ...d, pets: [...(d.pets ?? []), { name: "" }] }))}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add pet
            </Button>
          </LuxCard>
        )}

        {step === 8 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Final wishes</h2>
            <Field label="Disposition of remains">
              <Select value={data.finalWishes?.disposition || ""} onValueChange={(v) => updateWishes({ disposition: v as NonNullable<WillData["finalWishes"]>["disposition"] })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="burial">Burial</SelectItem>
                  <SelectItem value="cremation">Cremation</SelectItem>
                  <SelectItem value="donation">Donation to science</SelectItem>
                  <SelectItem value="executor">Leave to executor's discretion</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-sm">I wish to be an organ donor</Label>
              <Switch checked={!!data.finalWishes?.organDonor} onCheckedChange={(v) => updateWishes({ organDonor: v })} />
            </div>
            <Field label="Additional instructions (optional)">
              <Textarea rows={3} value={data.finalWishes?.notes ?? ""} onChange={(e) => updateWishes({ notes: e.target.value })} />
            </Field>
            <Field label="Digital assets instructions (optional)">
              <Textarea rows={3} placeholder="Email, cloud storage, crypto, social media…" value={data.digitalAssets ?? ""} onChange={(e) => setData((d) => ({ ...d, digitalAssets: e.target.value }))} />
            </Field>
          </LuxCard>
        )}

        {step === 9 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Witnesses & notary</h2>
            <p className="text-xs text-muted-foreground">
              Most US states require two adult witnesses who are not beneficiaries. Names are optional now — the witness lines will appear on the printed document for signature.
            </p>
            <Field label="Witness 1 (printed name)"><Input value={data.attestation?.witness1Name ?? ""} onChange={(e) => updateAttestation({ witness1Name: e.target.value })} /></Field>
            <Field label="Witness 2 (printed name)"><Input value={data.attestation?.witness2Name ?? ""} onChange={(e) => updateAttestation({ witness2Name: e.target.value })} /></Field>
            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-sm">Include notary acknowledgment</Label>
                <p className="text-[11px] text-muted-foreground">Recommended; required in some states (e.g. self-proving affidavit).</p>
              </div>
              <Switch checked={!!data.attestation?.notary} onCheckedChange={(v) => updateAttestation({ notary: v })} />
            </div>
          </LuxCard>
        )}

        {step === 10 && (
          <LuxCard className="space-y-3 p-5">
            <h2 className="font-serif text-lg text-foreground">Review & generate</h2>
            <ul className="space-y-1.5 text-sm">
              <Row label="Testator" value={data.testator?.fullName} />
              <Row label="State" value={data.testator?.state} />
              <Row label="Executor" value={data.executor?.name} />
              <Row label="Alt. executor" value={data.executor?.alternateName} />
              {data.guardian?.hasMinorChildren && <Row label="Guardian" value={data.guardian?.primaryName} />}
              <Row label="Beneficiaries" value={`${(data.beneficiaries ?? []).filter((b) => b.name?.trim()).length} listed`} />
              <Row label="Specific bequests" value={`${(data.specificBequests ?? []).filter((b) => b.item?.trim()).length} items`} />
              <Row label="Pets" value={`${(data.pets ?? []).filter((p) => p.name?.trim()).length}`} />
            </ul>
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
              This is a self-drafted template. Witness, notary, and execution rules vary by state — please review with a licensed estate attorney before signing.
            </div>
            <Button onClick={generateAndSave} disabled={generating} className="w-full gradient-violet glow-violet">
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Generate PDF & save to Estate Vault
            </Button>
          </LuxCard>
        )}
      </div>

      {/* Sticky footer nav */}
      <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-5">
        <div className="glass flex items-center justify-between rounded-full p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-full"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {STEPS[step]}
          </span>
          <Button
            size="sm"
            disabled={step >= STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded-full gradient-violet"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <li className="flex items-center justify-between border-b border-white/[0.04] py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value || "—"}</span>
    </li>
  );
}
