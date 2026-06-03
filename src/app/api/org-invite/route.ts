import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { error: sendError } = await resend.emails.send({
    from: "Rameelo <welcome@rameelo.com>",
    to: cleanEmail,
    subject: `You're invited to ${org.name} on Rameelo`,
    html: inviteEmail({ orgName: org.name, role: ROLE_LABELS[role] ?? role, inviterName, acceptUrl }),
  });
  if (sendError) {
    console.error("Resend error:", sendError);
    // The invite row still exists; surface a soft failure so the UI can advise.
    return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true, emailed: true });
}

function inviteEmail({ orgName, role, inviterName, acceptUrl }: {
  orgName: string; role: string; inviterName: string; acceptUrl: string;
}): string {
  const roleLine = role === "Scanner"
    ? "You'll be able to scan tickets at the door."
    : "You'll be able to manage events, orders, and the team.";
  return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#1a0e1c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a0e1c;padding:40px 20px;"><tr><td align="center">
    <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:28px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">ra<span style="color:#F5A623;">●</span>meelo</span>
      </td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2E1B30 0%,#3d1f3f 50%,#2E1B30 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(245,166,35,0.2);">
          <tr><td style="background-color:#F5A623;height:4px;"></td></tr>
          <tr><td style="padding:36px 40px 32px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#F5A623;">Team invitation</p>
            <h1 style="margin:0 0 14px;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">Join ${orgName} on Rameelo</h1>
            <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.6;">
              <strong style="color:#fff;">${inviterName}</strong> added you to <strong style="color:#fff;">${orgName}</strong> as a <strong style="color:#F5A623;">${role}</strong>. ${roleLine}
            </p>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background-color:#F5A623;border-radius:14px;">
                <a href="${acceptUrl}" style="display:block;padding:14px 32px;font-size:15px;font-weight:700;color:#2E1B30;text-decoration:none;">Accept invitation →</a>
              </td>
            </tr></table>
            <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;">
              Sign up (or log in) with this email and you'll be added automatically. If you didn't expect this, you can ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-top:24px;" align="center">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">© 2026 Rameelo · The home of Raas Garba in America</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();
}
