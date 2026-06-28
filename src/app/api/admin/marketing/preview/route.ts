import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMAIL } from "@/lib/email/theme";
import { loadBlastEvent, buildBlastEmail, loadUpcomingGeoEvents, pickNearbyEvents, buildNearbyEmail } from "@/lib/email/build-blast";
import { blastTemplate } from "@/lib/email/blast-templates";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Renders the blast email HTML for the selected template + event so the admin can
// review it inline before sending. Returns { subject, html } — no email is sent.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role, first_name, state").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const templateKey = String(b.templateKey ?? "custom");
  const tmpl = blastTemplate(templateKey);
  if (!tmpl) return NextResponse.json({ error: "Unknown template." }, { status: 400 });

  // Location-aware template: preview the recipient's-eye view using the admin's
  // own state (falls back to soonest-nationally when they have none set).
  if (tmpl.perRecipientGeo) {
    const geoEvents = await loadUpcomingGeoEvents(supabase as SupabaseClient);
    if (geoEvents.length === 0) return NextResponse.json({ error: "No upcoming on-sale events to feature right now." }, { status: 422 });
    const { items, locationLabel } = pickNearbyEvents(geoEvents, me.state ?? null);
    const { subject, html } = buildNearbyEmail({
      recipientFirstName: me.first_name ?? null, items, locationLabel,
      unsubscribeUrl: `${EMAIL.site}/api/unsubscribe/preview`,
    });
    return NextResponse.json({ ok: true, subject, html });
  }

  const eventId = typeof b.eventId === "string" && b.eventId ? b.eventId : null;
  const event = eventId ? await loadBlastEvent(supabase as SupabaseClient, eventId) : null;
  if (eventId && !event) return NextResponse.json({ error: "That event isn't published or wasn't found." }, { status: 404 });
  if (tmpl.requiresEvent && !event) return NextResponse.json({ error: `Pick an event to preview the “${tmpl.name}” template.` }, { status: 400 });

  const custom = {
    subject: String(b.subject ?? "").trim(),
    headline: String(b.headline ?? "").trim() || null,
    body: String(b.body ?? "").trim() || null,
  };

  const { subject, html } = buildBlastEmail({
    templateKey,
    recipientFirstName: me.first_name ?? null,
    event,
    unsubscribeUrl: `${EMAIL.site}/api/unsubscribe/preview`,
    custom,
  });

  return NextResponse.json({ ok: true, subject, html });
}
