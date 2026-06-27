import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Control password for changing admin-email recipient routing. Defaults to
// "rameelo123" (per spec) but can be overridden per-environment without a deploy.
const CONTROL_PASSWORD = process.env.ADMIN_EMAIL_ROUTING_PASSWORD || "rameelo123";

const VALID_MODES = new Set(["all", "selected"]);

// Admin-only. Two actions, both requiring the control password:
//   • { action: "verify", password }                         → unlock the editor
//   • { password, emailKey, mode, recipientIds }             → save one routing row
// The password gate is enforced here (server-side); the DB RPC is additionally
// admin-gated, so a non-admin can't write even with the password.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: role } = await supabase.rpc("get_my_role");
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password !== CONTROL_PASSWORD) {
    return NextResponse.json({ error: "Incorrect control password.", code: "bad_password" }, { status: 403 });
  }

  // Password-only unlock check.
  if (body.action === "verify") return NextResponse.json({ ok: true });

  const emailKey = typeof body.emailKey === "string" ? body.emailKey : "";
  const mode = typeof body.mode === "string" ? body.mode : "";
  const recipientIds: string[] = Array.isArray(body.recipientIds)
    ? body.recipientIds.filter((x: unknown) => typeof x === "string")
    : [];

  if (!emailKey) return NextResponse.json({ error: "Missing emailKey" }, { status: 400 });
  if (!VALID_MODES.has(mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const { error } = await supabase.rpc("set_admin_email_routing", {
    p_email_key: emailKey,
    p_mode: mode,
    p_recipient_ids: mode === "selected" ? recipientIds : [],
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
