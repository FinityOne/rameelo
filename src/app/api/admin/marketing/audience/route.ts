import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const arr = (v: unknown) => Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean) : [];

// Returns how many opted-in users match the chosen filters (live recipient count for
// the compose screen), plus a small sample. Resolved via the admin's session.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));

  // Purchaser mode: when "Bought tickets to" events are selected, the audience is
  // resolved directly from orders (everyone who bought, incl. guests) and the
  // profile-based filters don't apply.
  const purchasedEventIds = arr(b.purchasedEventIds);
  const { data, error } = purchasedEventIds.length
    ? await supabase.rpc("resolve_event_purchasers", { p_event_ids: purchasedEventIds })
    : await supabase.rpc("resolve_marketing_audience", {
        p_tags: arr(b.tags),
        p_batch_ids: arr(b.batchIds),
        p_cities: arr(b.cities).map(c => c.toLowerCase()),
        p_states: arr(b.states).map(s => s.toUpperCase()),
        p_attended_event_ids: arr(b.attendedEventIds),
        p_source: typeof b.source === "string" && b.source ? b.source : null,
        p_match_any: b.matchAny === true,
      });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as { email: string; first_name: string | null }[];
  return NextResponse.json({
    count: rows.length,
    sample: rows.slice(0, 6).map(r => r.email),
  });
}
