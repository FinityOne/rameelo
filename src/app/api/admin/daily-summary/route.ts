import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendDailySummary } from "@/lib/daily-summary";

export const runtime = "nodejs";

// Manually send the daily summary email to all admins for a chosen day. Gated to
// admins via the cookie-bound session (the actual compute/send uses the
// service-role client inside sendDailySummary).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: role } = await supabase.rpc("get_my_role");
  if (role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : "";
  if (!day) return NextResponse.json({ error: "Provide a valid date (YYYY-MM-DD)." }, { status: 400 });

  const result = await sendDailySummary(day);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Could not send summary." }, { status: 500 });

  return NextResponse.json({ ok: true, sent: result.sent, total: result.total, summary: result.data });
}
