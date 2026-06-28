import type { SupabaseClient } from "@supabase/supabase-js";

// ── Promo-lead → platform account provisioning ───────────────────────────────
// Giveaway entrants (promotion_entries) don't sign up, so historically they had
// no account and were invisible to the Campaigns audience engine (which reads
// `profiles`). This module turns each unique-email lead into a real platform
// profile so admins can email them — flagged `source = 'promo'` and tagged
// "Giveaway" so they're a one-click segment.
//
// Rules:
//   • Email is the unique key. If a profile already exists for the email we link
//     the entry to it and add the Giveaway tag — we never create a duplicate and
//     never overwrite an existing account's source (a real signup stays a signup).
//   • New emails get an inert auth account (no password, email unconfirmed —
//     identical to the bulk-import flow) plus a stamped profile.
//   • Idempotent: entries already linked to a user are skipped, so this is safe
//     to run on every new entry and to re-run as a backfill.
// Requires a SERVICE-ROLE client (auth.admin.createUser bypasses RLS).

export const PROMO_TAG = "Giveaway";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONCURRENCY = 6;

const uniq = (a: (string | null | undefined)[]) =>
  Array.from(new Set(a.map((s) => (s ?? "").trim()).filter(Boolean)));

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) { const idx = i++; await worker(items[idx]); }
    })
  );
}

type Entry = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  user_id: string | null;
};

export type ProvisionResult = {
  created: number;   // brand-new accounts created
  linked: number;    // existing profiles linked to a lead (+ Giveaway tag)
  skipped: number;   // already linked or invalid
  failed: number;
  errors: string[];
};

// Provisions accounts for promotion entries that aren't yet linked to a profile.
// Pass `onlyEntryId` to provision a single fresh entry (live submit path); omit
// to backfill every unlinked entry.
export async function provisionPromoAccounts(
  admin: SupabaseClient,
  opts: { onlyEntryId?: string } = {}
): Promise<ProvisionResult> {
  const res: ProvisionResult = { created: 0, linked: 0, skipped: 0, failed: 0, errors: [] };

  let q = admin
    .from("promotion_entries")
    .select("id, first_name, last_name, email, phone, city, state, user_id")
    .is("user_id", null);
  if (opts.onlyEntryId) q = q.eq("id", opts.onlyEntryId);

  const { data, error } = await q;
  if (error) { res.errors.push(error.message); return res; }
  const entries = (data ?? []) as Entry[];

  // Keep one entry per email (the first); flag the rest as skipped so a person
  // who entered multiple promos only yields one account.
  const byEmail = new Map<string, Entry>();
  const valid: Entry[] = [];
  for (const e of entries) {
    const email = (e.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { res.skipped++; continue; }
    if (byEmail.has(email)) { res.skipped++; continue; }
    byEmail.set(email, e);
    valid.push({ ...e, email });
  }
  if (valid.length === 0) return res;

  // Which emails already have profiles? Look them up in bulk (service role).
  const emails = Array.from(byEmail.keys());
  const existing = new Map<string, { id: string; tags: string[] }>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, email, tags")
      .in("email", emails.slice(i, i + 200));
    for (const p of (profs ?? []) as { id: string; email: string | null; tags: string[] | null }[]) {
      if (p.email) existing.set(p.email.toLowerCase(), { id: p.id, tags: p.tags ?? [] });
    }
  }

  await pool(valid, CONCURRENCY, async (e) => {
    const email = e.email as string;
    try {
      const found = existing.get(email);
      if (found) {
        // Link the lead to the existing account + ensure the Giveaway tag. Don't
        // touch source/name — this person already has a real profile.
        const tags = uniq([...found.tags, PROMO_TAG]);
        await admin.from("profiles").update({ tags }).eq("id", found.id);
        await admin.from("promotion_entries").update({ user_id: found.id }).eq("id", e.id);
        res.linked++;
        return;
      }

      const { data: cu, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          firstName: e.first_name ?? "", lastName: e.last_name ?? "",
          phone: e.phone ?? "", city: e.city ?? "", state: e.state ?? "",
        },
      });
      if (cErr || !cu?.user) throw new Error(cErr?.message ?? "create failed");
      const id = cu.user.id;

      await admin.from("profiles").update({
        source: "promo",
        tags: [PROMO_TAG],
        first_name: e.first_name || undefined,
        last_name: e.last_name || undefined,
        phone: e.phone || undefined,
        city: e.city || undefined,
        state: e.state || undefined,
      }).eq("id", id);
      await admin.from("promotion_entries").update({ user_id: id }).eq("id", e.id);
      res.created++;
    } catch (err) {
      res.failed++;
      if (res.errors.length < 10) res.errors.push(`${email}: ${err instanceof Error ? err.message : "failed"}`);
    }
  });

  return res;
}
