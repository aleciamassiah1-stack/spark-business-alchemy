import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

// Demo data seeder — one-click "Load sample data" for empty dashboards.
// Every demo row is tagged so clearDemoData can find and remove it cleanly.
//
// Markers:
//   plaid_items.institution_name = "Demo Bank" AND status = "demo"
//   aggregated_accounts          → via item_id of the demo plaid_items row
//   properties.name              starts with "Demo · "
//   insurance_policies.insurer_name = "Demo Mutual"
//   estate_documents.notes       contains "[demo]"
//   family_members.name          starts with "Demo · "

const DEMO_TAG = "Demo · ";
const DEMO_BANK = "Demo Bank";
const DEMO_INSURER = "Demo Mutual";
const DEMO_NOTE = "[demo] Sample document for preview. Safe to remove.";

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  const now = new Date().toISOString();

  // 1. Demo plaid item (parent for accounts)
  const demoItemId = `demo-${userId}-${Date.now()}`;
  const { data: itemRow, error: itemErr } = await supabaseAdmin
    .from("plaid_items")
    .insert({
      user_id: userId,
      item_id: demoItemId,
      access_token: "demo",
      institution_id: "demo",
      institution_name: DEMO_BANK,
      status: "demo",
      last_synced_at: now,
    })
    .select("id")
    .single();
  if (itemErr || !itemRow) throw new Error(itemErr?.message ?? "Could not create demo institution");

  // 2. Aggregated accounts (checking, brokerage, credit card)
  await supabaseAdmin.from("aggregated_accounts").insert([
    {
      user_id: userId,
      item_id: itemRow.id,
      plaid_account_id: `${demoItemId}-chk`,
      name: "Everyday Checking",
      official_name: "Demo Bank Checking",
      type: "depository",
      subtype: "checking",
      mask: "1234",
      current_balance: 42_500,
      available_balance: 42_500,
    },
    {
      user_id: userId,
      item_id: itemRow.id,
      plaid_account_id: `${demoItemId}-brk`,
      name: "Brokerage",
      official_name: "Demo Bank Brokerage",
      type: "investment",
      subtype: "brokerage",
      mask: "5678",
      current_balance: 1_240_000,
      available_balance: 1_240_000,
    },
    {
      user_id: userId,
      item_id: itemRow.id,
      plaid_account_id: `${demoItemId}-cc`,
      name: "Platinum Card",
      official_name: "Demo Bank Platinum",
      type: "credit",
      subtype: "credit card",
      mask: "9090",
      current_balance: 3_280,
      available_balance: null,
    },
  ]);

  // 3. Property
  await supabaseAdmin.from("properties").insert({
    user_id: userId,
    name: `${DEMO_TAG}Aspen Retreat`,
    address: "12 Powder Ridge Rd, Aspen, CO 81611",
    property_type: "residential",
    estimated_value: 2_850_000,
    mortgage_balance: 1_120_000,
    beds: 4,
    baths: 3.5,
    sqft: 4_200,
    last_valued_at: now,
  });

  // 4. Insurance policy
  await supabaseAdmin.from("insurance_policies").insert({
    user_id: userId,
    policy_type: "life",
    insurer_name: DEMO_INSURER,
    policy_number: "DM-LIFE-0001",
    coverage_amount: 5_000_000,
    premium_amount: 485,
    premium_frequency: "monthly",
    status: "active",
    beneficiaries: ["Spouse", "Children (equal share)"],
  });

  // 5. Estate document
  await supabaseAdmin.from("estate_documents").insert({
    user_id: userId,
    document_type: "will",
    title: "Last Will & Testament (Sample)",
    status: "current",
    signed_date: now.slice(0, 10),
    notes: DEMO_NOTE,
  });

  // 6. Family member
  await supabaseAdmin.from("family_members").insert({
    user_id: userId,
    name: `${DEMO_TAG}Sample Spouse`,
    relationship: "Spouse",
    age: 42,
    initials: "SS",
    net_worth: 685_000,
    accounts: [
      { name: "Roth IRA — Schwab", balance: 285_000 },
      { name: "Brokerage", balance: 400_000 },
    ],
  });

  return { ok: true };
});

export const clearDemoData = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();

  // Find demo plaid items first so we can delete their accounts.
  const { data: demoItems } = await supabaseAdmin
    .from("plaid_items")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "demo")
    .eq("institution_name", DEMO_BANK);
  const demoItemIds = (demoItems ?? []).map((r) => r.id);

  if (demoItemIds.length > 0) {
    await supabaseAdmin
      .from("aggregated_accounts")
      .delete()
      .eq("user_id", userId)
      .in("item_id", demoItemIds);
    await supabaseAdmin.from("plaid_items").delete().eq("user_id", userId).in("id", demoItemIds);
  }

  await supabaseAdmin.from("properties").delete().eq("user_id", userId).like("name", `${DEMO_TAG}%`);
  await supabaseAdmin
    .from("insurance_policies")
    .delete()
    .eq("user_id", userId)
    .eq("insurer_name", DEMO_INSURER);
  await supabaseAdmin
    .from("estate_documents")
    .delete()
    .eq("user_id", userId)
    .like("notes", "%[demo]%");
  await supabaseAdmin
    .from("family_members")
    .delete()
    .eq("user_id", userId)
    .like("name", `${DEMO_TAG}%`);

  return { ok: true };
});

export const hasDemoData = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { count } = await supabaseAdmin
    .from("plaid_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "demo")
    .eq("institution_name", DEMO_BANK);
  return { hasDemo: (count ?? 0) > 0 };
});
