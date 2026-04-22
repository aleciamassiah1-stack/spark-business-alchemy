import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

/** Throws 403 if the caller is not an admin. Returns the admin's userId. */
async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
  return userId;
}

export type DiagnosticStep = {
  label: string;
  ok: boolean;
  detail: string;
};

export type PropertyImageDiagnostic = {
  ok: boolean;
  steps: DiagnosticStep[];
  property: {
    id: string;
    name: string;
    address: string;
    image_url: string | null;
  } | null;
  uploadedUrl: string | null;
  uploadedPath: string | null;
};

/**
 * Admin-only end-to-end test:
 * 1. Locate the 178 Westminster property for the current admin user
 * 2. Upload a sample image (provided as base64) to property-images bucket
 * 3. Verify the storage object exists, public URL is reachable
 * 4. Persist image_url to the property row
 * 5. Re-read the row to confirm round-trip
 */
export const adminTestPropertyImage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          fileName: z.string().trim().min(1).max(255),
          base64: z.string().min(10),
          mimeType: z
            .string()
            .trim()
            .max(80)
            .regex(/^image\/(jpeg|jpg|png|webp)$/i, "Image only"),
        })
        .parse(input),
  )
  .handler(async ({ data }): Promise<PropertyImageDiagnostic> => {
    const steps: DiagnosticStep[] = [];
    const result: PropertyImageDiagnostic = {
      ok: false,
      steps,
      property: null,
      uploadedUrl: null,
      uploadedPath: null,
    };

    // 1. Auth + admin gate
    let adminId: string;
    try {
      adminId = await requireAdmin();
      steps.push({ label: "Admin authentication", ok: true, detail: `User ${adminId}` });
    } catch {
      steps.push({ label: "Admin authentication", ok: false, detail: "Not an admin" });
      return result;
    }

    // 2. Locate Westminster property for this admin
    const { data: propRows, error: propErr } = await supabaseAdmin
      .from("properties")
      .select("id, name, address, image_url")
      .eq("user_id", adminId)
      .ilike("address", "%westminster%yonkers%")
      .limit(1);

    if (propErr) {
      steps.push({ label: "Locate Westminster property", ok: false, detail: propErr.message });
      return result;
    }
    const property = propRows?.[0];
    if (!property) {
      steps.push({
        label: "Locate Westminster property",
        ok: false,
        detail: "No property matching '178 Westminster' found for this admin",
      });
      return result;
    }
    result.property = property;
    steps.push({
      label: "Locate Westminster property",
      ok: true,
      detail: `${property.name} — ${property.address}`,
    });

    // 3. Upload to property-images bucket
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${adminId}/diag_${Date.now()}_${safeName}`;
    let buf: Uint8Array;
    try {
      buf = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    } catch {
      steps.push({ label: "Decode base64", ok: false, detail: "Invalid base64 payload" });
      return result;
    }
    steps.push({ label: "Decode base64", ok: true, detail: `${buf.length} bytes` });

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("property-images")
      .upload(path, buf, { contentType: data.mimeType, upsert: false });
    if (uploadErr) {
      steps.push({ label: "Upload to property-images bucket", ok: false, detail: uploadErr.message });
      return result;
    }
    result.uploadedPath = path;
    steps.push({ label: "Upload to property-images bucket", ok: true, detail: path });

    // 4. Get public URL + verify it resolves
    const { data: pub } = supabaseAdmin.storage.from("property-images").getPublicUrl(path);
    result.uploadedUrl = pub.publicUrl;
    try {
      const head = await fetch(pub.publicUrl, { method: "HEAD" });
      if (!head.ok) {
        steps.push({
          label: "Verify public URL is reachable",
          ok: false,
          detail: `HTTP ${head.status} — bucket may not be public`,
        });
      } else {
        steps.push({
          label: "Verify public URL is reachable",
          ok: true,
          detail: `HTTP ${head.status} (${head.headers.get("content-type") ?? "unknown"})`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "fetch failed";
      steps.push({ label: "Verify public URL is reachable", ok: false, detail: msg });
    }

    // 5. Persist image_url to the property row
    const { error: updateErr } = await supabaseAdmin
      .from("properties")
      .update({ image_url: pub.publicUrl })
      .eq("id", property.id)
      .eq("user_id", adminId);
    if (updateErr) {
      steps.push({ label: "Persist image_url to property row", ok: false, detail: updateErr.message });
      return result;
    }
    steps.push({ label: "Persist image_url to property row", ok: true, detail: "Row updated" });

    // 6. Round-trip read
    const { data: confirm, error: confirmErr } = await supabaseAdmin
      .from("properties")
      .select("id, name, address, image_url")
      .eq("id", property.id)
      .single();
    if (confirmErr || !confirm) {
      steps.push({
        label: "Round-trip read from properties",
        ok: false,
        detail: confirmErr?.message ?? "row not found",
      });
      return result;
    }
    if (confirm.image_url !== pub.publicUrl) {
      steps.push({
        label: "Round-trip read from properties",
        ok: false,
        detail: "Stored image_url does not match uploaded URL",
      });
      return result;
    }
    result.property = confirm;
    steps.push({
      label: "Round-trip read from properties",
      ok: true,
      detail: "image_url persisted and matches",
    });

    result.ok = steps.every((s) => s.ok);
    return result;
  });

/** Admin-only: clean up any diagnostic uploads left in storage for this admin. */
export const adminCleanupDiagnosticUploads = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; removed: number; error: string | null }> => {
    let adminId: string;
    try {
      adminId = await requireAdmin();
    } catch {
      return { ok: false, removed: 0, error: "Forbidden" };
    }
    const { data: list, error: listErr } = await supabaseAdmin.storage
      .from("property-images")
      .list(adminId, { limit: 100 });
    if (listErr) return { ok: false, removed: 0, error: listErr.message };
    const diagPaths = (list ?? [])
      .filter((f) => f.name.startsWith("diag_"))
      .map((f) => `${adminId}/${f.name}`);
    if (diagPaths.length === 0) return { ok: true, removed: 0, error: null };
    const { error: rmErr } = await supabaseAdmin.storage.from("property-images").remove(diagPaths);
    if (rmErr) return { ok: false, removed: 0, error: rmErr.message };
    return { ok: true, removed: diagPaths.length, error: null };
  },
);
