import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { orgInviteEmail } from "@/lib/email/templates/orgInvite";

// Resend SDK runs on the Node.js runtime.
export const runtime = "nodejs";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", scanner: "Scanner", member: "Member" };

export async function POST(request: Request) {
  const { orgId, email, role } = await request.json();

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!orgId || !cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!["admin", "scanner", "member"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Org name + inviter (best-effort, for the email copy)
  const [{ data: org }, { data: inviter }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
  ]);
  if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

  // Reuse an existing pending invite (partial unique index), else create one.
  // RLS ensures only org admins/owners can write invitations for this org.
  let token: string | null = null;
  const { data: existing } = await supabase
    .from("org_invitations")
    .select("token")
    .eq("org_id", orgId)
    .ilike("email", cleanEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.token) {
    token = existing.token;
    await supabase.from("org_invitations").update({ role, invited_by: user.id }).eq("token", token);
  } else {
    const { data: created, error } = await supabase
      .from("org_invitations")
      .insert({ org_id: orgId, email: cleanEmail, role, invited_by: user.id })
      .select("token")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "You don't have permission to invite for this organization." }, { status: 403 });
    }
    token = created.token;
  }

  const inviterName = [inviter?.first_name, inviter?.last_name].filter(Boolean).join(" ") || "Your team";
  const acceptUrl = `https://rameelo.com/auth/signup?email=${encodeURIComponent(cleanEmail)}&invite=${token}`;

  const { subject, html, text } = orgInviteEmail({
    orgName: org.name,
    role: ROLE_LABELS[role] ?? role,
    inviterName,
    acceptUrl,
  });

  const { id: providerId, error: sendError } = await sendEmail({ to: cleanEmail, subject, html, text });

  // Resolve recipient profile id if they already have an account (for the log).
  const { data: recipient } = await supabase.from("profiles").select("id").ilike("email", cleanEmail).maybeSingle();

  await recordEmailLog(supabase, {
    userId: recipient?.id ?? null,
    toEmail: cleanEmail,
    type: "org_invite",
    subject,
    status: sendError ? "failed" : "sent",
    trigger: "manual",
    providerId,
    error: sendError,
  });

  if (sendError) {
    console.error("org-invite send error:", sendError);
    // The invite row still exists; surface a soft failure so the UI can advise.
    return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true, emailed: true });
}
