import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS = 500;     // per import; larger files should be split
const CONCURRENCY = 8;    // parallel user creations
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Row = { first_name: string; last_name: string; email: string; phone: string; city: string; state: string; tags: string[]; notes: string };

// Runs `worker` over items with bounded concurrency (fast, but never hammers).
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

const uniq = (a: string[]) => Array.from(new Set(a.map(s => s.trim()).filter(Boolean)));

// Creates platform accounts for the new emails in a CSV import, tags them, optionally
// marks them as attendees of past events, and records it all under one batch. Existing
// users are never re-created (only enriched if the admin opts in). No emails are sent.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Import isn't configured on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim() || "Untitled import";
  const filename = String(body.filename ?? "").trim() || null;
  const note = String(body.note ?? "").trim() || null;
  const batchTags = uniq(Array.isArray(body.tags) ? body.tags.map(String) : []);
  const eventIds = uniq(Array.isArray(body.eventIds) ? body.eventIds.map(String) : []);
  const applyToExisting = body.applyToExisting === true;
  const rawRows: Row[] = Array.isArray(body.rows) ? body.rows : [];

  // De-dupe by email + drop invalid; cap the size.
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const r of rawRows) {
    const email = String(r.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    rows.push({ ...r, email, tags: uniq(Array.isArray(r.tags) ? r.tags.map(String) : []) });
  }
  if (rows.length === 0) return NextResponse.json({ error: "No valid rows to import." }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (${rows.length}). Split into files of ${MAX_ROWS} or fewer.` }, { status: 413 });

  const admin = createAdminClient();

  // Which emails already exist (skip creation; optionally enrich).
  const emails = rows.map(r => r.email);
  const existingByEmail = new Map<string, { id: string; tags: string[] }>();
  for (let i = 0; i < emails.length; i += 500) {
    const { data } = await admin.from("profiles").select("id, email, tags").in("email", emails.slice(i, i + 500));
    for (const p of (data ?? []) as { id: string; email: string | null; tags: string[] | null }[]) {
      if (p.email) existingByEmail.set(p.email.toLowerCase(), { id: p.id, tags: p.tags ?? [] });
    }
  }

  const newRows = rows.filter(r => !existingByEmail.has(r.email));
  const matchedRows = rows.filter(r => existingByEmail.has(r.email));

  // Create the batch up front so created profiles can reference it.
  const { data: batch, error: bErr } = await admin
    .from("user_import_batches")
    .insert({ label, filename, note, tags: batchTags, event_ids: eventIds, total_rows: rows.length, created_by: user.id })
    .select("id")
    .single();
  if (bErr || !batch) return NextResponse.json({ error: "Could not start the import." }, { status: 500 });
  const batchId = batch.id as string;

  let created = 0, failed = 0;
  const errors: string[] = [];
  const attendanceRows: { profile_id: string; event_id: string }[] = [];

  // Create each new user, then stamp source/batch/tags on their profile.
  await pool(newRows, CONCURRENCY, async (r) => {
    try {
      const { data: cu, error: cErr } = await admin.auth.admin.createUser({
        email: r.email,
        email_confirm: false,
        user_metadata: { firstName: r.first_name, lastName: r.last_name, phone: r.phone, city: r.city, state: r.state },
      });
      if (cErr || !cu?.user) throw new Error(cErr?.message ?? "create failed");
      const id = cu.user.id;
      const tags = uniq([...batchTags, ...r.tags]);
      await admin.from("profiles").update({
        source: "import",
        import_batch_id: batchId,
        imported_at: new Date().toISOString(),
        imported_by: user.id,
        tags,
        // Backfill profile fields the trigger may have left blank.
        first_name: r.first_name || undefined,
        last_name: r.last_name || undefined,
        phone: r.phone || undefined,
        city: r.city || undefined,
        state: r.state || undefined,
      }).eq("id", id);
      for (const ev of eventIds) attendanceRows.push({ profile_id: id, event_id: ev });
      created++;
    } catch (e) {
      failed++;
      if (errors.length < 10) errors.push(`${r.email}: ${e instanceof Error ? e.message : "failed"}`);
    }
  });

  // Optionally enrich existing matched users (merge tags + attendance) — never creates.
  if (applyToExisting) {
    await pool(matchedRows, CONCURRENCY, async (r) => {
      const ex = existingByEmail.get(r.email)!;
      const tags = uniq([...ex.tags, ...batchTags, ...r.tags]);
      await admin.from("profiles").update({ tags }).eq("id", ex.id);
      for (const ev of eventIds) attendanceRows.push({ profile_id: ex.id, event_id: ev });
    });
  }

  // Insert event attendance (idempotent on the PK).
  for (let i = 0; i < attendanceRows.length; i += 500) {
    const chunk = attendanceRows.slice(i, i + 500);
    if (chunk.length) await admin.from("profile_event_attendance").upsert(chunk, { onConflict: "profile_id,event_id" });
  }

  await admin.from("user_import_batches").update({
    created_count: created, matched_count: matchedRows.length, failed_count: failed,
  }).eq("id", batchId);

  return NextResponse.json({
    ok: true, batchId,
    created, matched: matchedRows.length, failed,
    appliedToExisting: applyToExisting ? matchedRows.length : 0,
    errors,
  });
}
