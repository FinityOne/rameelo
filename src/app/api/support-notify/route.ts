import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supportRequestReceivedEmail } from "@/lib/email/templates/supportRequestReceived";
import { supportRequestAdminEmail } from "@/lib/email/templates/supportRequestAdmin";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";
import { issueTypeLabel, srRef } from "@/lib/support";

export const runtime = "nodejs";

// Fired right after a support request is submitted. Sends a confirmation to the
// requester ("we've got it") and alerts every platform admin with the full
// details — except the uploaded file, which admins view securely in the portal.
// Details + admin recipients come from a SECURITY DEFINER RPC gated to fresh rows,
// so it works for anonymous submitters and can't be abused.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_support_request_for_notify", { p_id: requestId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = (Array.isArray(data) ? data[0] : data) as {
    name: string | null; email: string; issue_type: string; reference: string | null;
    description: string; has_attachment: boolean; created_at: string; admin_emails: string[] | null;
  } | null;

  if (!row) return NextResponse.json({ ok: true, skipped: "not-found" });

  const ref = srRef(requestId);
  const issueLabel = issueTypeLabel(row.issue_type);
  const submittedAt = new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  // 1) Confirmation to the requester.
  let requesterSent = false;
  if (row.email) {
    const { subject, html, text } = supportRequestReceivedEmail({
      name: row.name,
      ref,
      issueLabel,
      reference: row.reference,
      description: row.description,
      submittedAt,
    });
    const { id: providerId, error: sendError } = await sendEmail({ to: row.email, subject, html, text });
    await recordEmailLog(supabase, {
      toEmail: row.email,
      type: "support_request_received",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    requesterSent = !sendError;
  }

  // 2) Alert every platform admin.
  const admins = (row.admin_emails ?? []).filter(Boolean);
  const { subject, html, text } = supportRequestAdminEmail({
    ref,
    name: row.name,
    email: row.email,
    issueLabel,
    reference: row.reference,
    description: row.description,
    hasAttachment: row.has_attachment,
    submittedAt,
    manageUrl: `${EMAIL.site}/admin/support/${requestId}`,
  });

  let adminSent = 0;
  for (const to of admins) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text });
    await recordEmailLog(supabase, {
      toEmail: to,
      type: "support_request_admin",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    if (!sendError) adminSent++;
  }

  return NextResponse.json({ ok: true, requesterSent, adminSent, admins: admins.length });
}
