import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sponsorshipInquiryEmail } from "@/lib/email/templates/sponsorshipInquiry";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";

export const runtime = "nodejs";

// Notifies every platform admin when a sponsorship inquiry is submitted. Details
// + admin emails come from a SECURITY DEFINER RPC keyed by the inquiry id, gated
// to fresh submissions — so it works for anonymous submitters and can't be abused.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  if (!inquiryId) return NextResponse.json({ error: "Missing inquiryId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sponsorship_for_notify", { p_inquiry_id: inquiryId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = (Array.isArray(data) ? data[0] : data) as {
    business_name: string; contact_name: string; email: string; phone: string | null;
    website: string | null; category: string | null; goals: string | null;
    budget: string | null; message: string | null; created_at: string;
    admin_emails: string[] | null;
  } | null;

  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const admins = (row.admin_emails ?? []).filter(Boolean);
  if (admins.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no admins" });

  const { subject, html, text } = sponsorshipInquiryEmail({
    businessName: row.business_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    category: row.category,
    goals: row.goals,
    budget: row.budget,
    message: row.message,
    submittedAt: new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });

  let sent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: to,
      type: "sponsorship_inquiry",
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
