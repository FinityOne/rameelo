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

// ── Process-wide send pacing ──────────────────────────────────────────────────
// Resend rate-limits to 5 requests/second. Bulk tools (group / marketing /
// interest blasts) fan out many sends at once, so without pacing the surplus
// gets 429'd and silently dropped. We serialize slot acquisition so each send
// starts at least MIN_INTERVAL_MS after the previous one — capping throughput
// just under the limit. (Serverless runs one blast per invocation, so a
// module-level limiter throttles the whole blast.)
const MIN_INTERVAL_MS = 220; // ~4.5 sends/sec, a hair under Resend's 5/sec
let pacingChain: Promise<void> = Promise.resolve();
let lastSlotAt = 0;
function acquireSendSlot(): Promise<void> {
  const next = pacingChain.then(async () => {
    const wait = Math.max(0, lastSlotAt + MIN_INTERVAL_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastSlotAt = Date.now();
  });
  pacingChain = next.catch(() => {});
  return next;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function isRateLimit(error: { message?: string; statusCode?: number | null; name?: string }): boolean {
  return error.statusCode === 429 || /too many requests|rate limit/i.test(error.message ?? "") || error.name === "rate_limit_exceeded";
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
  const payload = {
    from: from ?? fromAddressForType(type),
    to,
    subject,
    html,
    text,
    replyTo: EMAIL.replyTo,
    ...(headers ? { headers } : {}),
  };

  // Paced + retried so bulk blasts stay under Resend's 5/sec limit and a
  // momentary 429 doesn't drop a recipient.
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await acquireSendSlot();
    const { data, error } = await resend.emails.send(payload);
    if (!error) return { id: data?.id ?? null, error: null };
    if (isRateLimit(error) && attempt < MAX_ATTEMPTS) {
      await sleep(500 * attempt); // back off, then re-acquire a slot
      continue;
    }
    return { id: null, error: error.message ?? "send failed" };
  }
  return { id: null, error: "send failed after retries" };
}
