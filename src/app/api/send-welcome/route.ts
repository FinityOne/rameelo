import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";

// Resend SDK runs on the Node.js runtime.
export const runtime = "nodejs";

// Welcome email. Two authorized paths:
//   • an admin sending to any member (by userId or email), or
//   • a signed-in user welcoming their own address (signup self-welcome).
// Anything else is rejected so the branded sender can't be abused for spam.
export async function POST(request: Request) {
  const supabase = await createClient();

  // Identify the caller via a Bearer access token (passed by the signup flow,
  // reliable right after account creation) or the cookie session (admin panel).
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const { data: { user } } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = me?.role === "admin";

  const body = await request.json().catch(() => ({}));
  let email: string | undefined = typeof body.email === "string" ? body.email : undefined;
  let firstName: string | undefined = typeof body.firstName === "string" ? body.firstName : undefined;

  // Recipient profile id (for the email log), resolved where possible.
  let recipientId: string | null = body.userId ?? null;

  // Sending to another member by id is admin-only.
  if (body.userId) {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: p } = await supabase.from("profiles").select("email, first_name").eq("id", body.userId).single();
    if (!p?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
    email = p.email;
    firstName = p.first_name ?? undefined;
  }

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // Non-admins may only welcome their own address.
  const isSelf = !isAdmin;
  if (isSelf && (user?.email ?? "").toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!recipientId && isSelf && user) recipientId = user.id;

  const { subject, html, text } = welcomeEmail({ firstName });
  const { id: providerId, error } = await sendEmail({ to: email, subject, html, text });

  // Log every attempt (sent or failed) for the email history.
  await recordEmailLog(supabase, {
    userId: recipientId,
    toEmail: email,
    type: "welcome",
    subject,
    status: error ? "failed" : "sent",
    trigger: isSelf ? "automatic" : "manual",
    providerId,
    error,
  });

  if (error) {
    console.error("send-welcome error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
