import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groupTicketClaimEmail } from "@/lib/email/templates/groupTicketClaim";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";

export const runtime = "nodejs";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// Emails each group member (other than the purchaser) a link to claim the tickets
// bought for them. Recipients come from a SECURITY DEFINER RPC keyed by order id
// that only returns rows for a freshly-paid group order — so it works for guest
// purchasers (no account yet) and can't be used to spam arbitrary addresses.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_claim_recipients", { p_order_id: orderId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as {
    to_email: string; to_name: string | null; qty: number; token: string; buyer_name: string | null;
    event_title: string; event_start_date: string; event_start_time: string | null;
    city: string; state: string; venue_name: string | null;
  }[];

  let sent = 0;
  for (const r of rows) {
    const eventWhen = `${fmtDate(r.event_start_date)}${fmtTime(r.event_start_time) ? ` · ${fmtTime(r.event_start_time)}` : ""}`;
    const eventWhere = [r.venue_name, r.city, r.state].filter(Boolean).join(", ");
    const { subject, html, text } = groupTicketClaimEmail({
      recipientName: r.to_name,
      buyerName: r.buyer_name ?? "",
      eventTitle: r.event_title,
      eventWhen,
      eventWhere,
      qty: r.qty,
      claimUrl: `${EMAIL.site}/tickets/claim/${r.token}`,
    });

    const { id: providerId, error: sendError } = await sendEmail({ to: r.to_email, subject, html, text });
    await recordEmailLog(supabase, {
      userId: null,
      toEmail: r.to_email,
      type: "group_ticket_claim",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    if (!sendError) sent++;
  }

  return NextResponse.json({ ok: true, sent, total: rows.length });
}
