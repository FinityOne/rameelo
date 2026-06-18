import { Resend } from "resend";
import { EMAIL } from "./theme";

// Single send entry point for every Rameelo email. Templates produce
// { subject, html, text }; this applies the shared from/reply-to.
// Requires RESEND_API_KEY in the environment (local .env.local AND the
// production host, e.g. Vercel project env, for the live rameelo.com site).

// Ticketing / order / purchase emails send from the dedicated tickets@ identity so
// they read as official order mail (customer receipts, comps, and the organizer +
// admin order alerts). Keyed by the same `type` string each call already logs to
// email_logs — one source of truth, so a new ticketing email just adds its type here.
const TICKETING_EMAIL_TYPES = new Set<string>([
  "order_confirmation",        // buyer receipt
  "tickets_pending",           // ACH reserved (payment clearing)
  "payment_failed",            // payment failed / returned
  "order_team_notification",   // organizer order alert
  "order_admin_notification",  // platform-admin order alert
  "comp_ticket",               // organizer-issued free tickets
  "group_ticket_claim",        // group buyer → per-member claim link
  "group_created",             // group order link created
  "group_joined",              // group member joined
  "group_reminder",            // "invite more to your group" reminder
]);

/** Pick the From identity for an email type: ticketing/order mail → tickets@, else hello@. */
export function fromAddressForType(type?: string): string {
  return type && TICKETING_EMAIL_TYPES.has(type) ? EMAIL.fromTickets : EMAIL.from;
}

export async function sendEmail({
  to, subject, html, text, type, from, headers,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** email_logs type — selects the From identity (ticketing types send from tickets@). */
  type?: string;
  /** Explicit From override; takes precedence over the type-based default. */
  from?: string;
  /** Extra headers, e.g. List-Unsubscribe for marketing mail. */
  headers?: Record<string, string>;
}): Promise<{ id: string | null; error: string | null }> {
  if (!process.env.RESEND_API_KEY) {
    return { id: null, error: "Email is not configured (RESEND_API_KEY is missing in this environment)." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: from ?? fromAddressForType(type),
    to,
    subject,
    html,
    text,
    replyTo: EMAIL.replyTo,
    ...(headers ? { headers } : {}),
  });
  if (error) return { id: null, error: error.message ?? "send failed" };
  return { id: data?.id ?? null, error: null };
}
