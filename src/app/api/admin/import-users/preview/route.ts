import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Returns which of the submitted emails already belong to a platform user, so the
// review step can show "X new · Y already on the platform" before anything is created.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Import isn't configured on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const emails = Array.isArray(body.emails)
    ? Array.from(new Set(body.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean)))
    : [];
  if (emails.length === 0) return NextResponse.json({ existing: [] });

  const admin = createAdminClient();
  const existing: string[] = [];
  // Chunk the IN() list to keep each query small.
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    const { data } = await admin.from("profiles").select("email").in("email", chunk);
    for (const r of (data ?? []) as { email: string | null }[]) {
      if (r.email) existing.push(r.email.toLowerCase());
    }
  }
  return NextResponse.json({ existing: Array.from(new Set(existing)) });
}
