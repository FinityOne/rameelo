import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { promotionEntryEmail } from "@/lib/email/templates/promotionEntry";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { getAdminRecipients } from "@/lib/email/recipients";

export const runtime = "nodejs";

// Notifies every platform admin when a new promotion/giveaway entry is received.
// Entry details + admin emails come from a SECURITY DEFINER RPC keyed by the
// entry id, gated to fresh entries — so it works for anonymous submitters and
// can't be replayed. Best-effort: never blocks the entrant's confirmation.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  if (!entryId) return NextResponse.json({ error: "Missing entryId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_promotion_entry_for_notify", { p_entry_id: entryId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = data as {
    promotion_name: string; first_name: string; last_name: string; email: string;
    phone: string | null; city: string | null; state: string | null;
    created_at: string; entry_count: number | null; admin_emails: string[] | null;
  } | null;

  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const admins = await getAdminRecipients(supabase, "promotion-entry", row.admin_emails ?? []);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const { subject, html, text } = promotionEntryEmail({
    promotionName: row.promotion_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    entryCount: row.entry_count,
    enteredAt: new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "promotion_entry",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    if (!sendError) sent++;
  }

  return NextResponse.json({ ok: true, sent, total: admins.length });
}
