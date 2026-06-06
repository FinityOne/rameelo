import { Resend } from "resend";
import { EMAIL } from "./theme";

// Single send entry point for every Rameelo email. Templates produce
// { subject, html, text }; this applies the shared from/reply-to.
// Requires RESEND_API_KEY in the environment (local .env.local AND the
// production host, e.g. Vercel project env, for the live rameelo.com site).
export async function sendEmail({
  to, subject, html, text,
}: { to: string; subject: string; html: string; text?: string }): Promise<{ id: string | null; error: string | null }> {
  if (!process.env.RESEND_API_KEY) {
    return { id: null, error: "Email is not configured (RESEND_API_KEY is missing in this environment)." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: EMAIL.from,
    to,
    subject,
    html,
    text,
    replyTo: EMAIL.replyTo,
  });
  if (error) return { id: null, error: error.message ?? "send failed" };
  return { id: data?.id ?? null, error: null };
}
