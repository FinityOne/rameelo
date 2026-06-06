import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passwordResetEmail } from "@/lib/email/templates/passwordReset";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";

export const runtime = "nodejs";

// Admin-triggered password reset. Generates a one-time token (server, via the
// admin RPC), then emails a branded reset link through Resend.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!body.userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Member's first name (for the greeting).
  const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", body.userId).maybeSingle();

  // Create the reset token (admin-gated RPC) — returns the raw token + email.
  const { data, error: rpcError } = await supabase.rpc("admin_create_password_reset", { p_user_id: body.userId });
  const res = data as { token?: string; email?: string } | null;
  if (rpcError || !res?.token || !res?.email) {
    return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
  }

  const resetUrl = `${EMAIL.site}/auth/reset-password?token=${res.token}`;
  const { subject, html, text } = passwordResetEmail({ firstName: profile?.first_name, resetUrl });

  const { id: providerId, error: sendError } = await sendEmail({ to: res.email, subject, html, text });

  await recordEmailLog(supabase, {
    userId: body.userId,
    toEmail: res.email,
    type: "password_reset",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "manual",
    providerId,
    error: sendError,
  });

  if (sendError) {
    console.error("send-password-reset error:", sendError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
