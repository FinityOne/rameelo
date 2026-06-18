import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Returns which of the submitted emails already belong to a platform user (matched
// case-insensitively), so the review step can show "X new · Y already on the platform"
// before anything is created. Email is the unique key — no duplicate ever slips by.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const emails = Array.isArray(body.emails)
    ? Array.from(new Set(body.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)))
    : [];
  if (emails.length === 0) return NextResponse.json({ existing: [] });

  // Case-insensitive existence check via the admin's session (the SECURITY DEFINER
  // RPC is gated to admins). Chunked to keep each call small.
  const existing = new Set<string>();
  for (let i = 0; i < emails.length; i += 500) {
    const { data } = await supabase.rpc("find_existing_profiles", { p_emails: emails.slice(i, i + 500) });
    for (const r of (data ?? []) as { email: string | null }[]) {
      if (r.email) existing.add(r.email.toLowerCase());
    }
  }
  return NextResponse.json({ existing: Array.from(existing) });
}
