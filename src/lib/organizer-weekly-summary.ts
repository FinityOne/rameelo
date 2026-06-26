import { createAdminClient } from "@/lib/supabase/admin";
import { organizerWeeklySummaryEmail, type OrganizerWeeklyData } from "@/lib/email/templates/organizerWeeklySummary";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import { EMAIL } from "@/lib/email/theme";
import type { SupabaseClient } from "@supabase/supabase-js";

// Sends the weekly sales summary to the team of every organization that is
// ACTIVELY SELLING — i.e. has at least one published, upcoming event toggled to
// sell on Rameelo. Recipients are the org's owners + admins (door "scanner"
// members are excluded). Uses the service-role admin client so it runs from the
// Saturday-midnight cron without a user session and isn't blocked by RLS.
//
// Revenue is FACE VALUE only (computed in the organizer_weekly_summary RPC).

export type OrgWeeklyResult = {
  ok: boolean;
  orgs: number;       // orgs that qualified (actively selling)
  emailed: number;    // recipient emails attempted
  sent: number;       // recipient emails that succeeded
  error?: string;
};

/** Saturday-anchored week start: the Saturday 7 days before the given run date. */
export function priorPacificWeekStart(runDate = pacificToday()): string {
  // run date is the Saturday the cron fires; the completed week is the prior 7
  // days, i.e. start = runDate - 7. Returns YYYY-MM-DD.
  const d = new Date(runDate + "T12:00:00");
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in Pacific time as YYYY-MM-DD. */
export function pacificToday(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function sendOrganizerWeeklySummaries(weekStart: string): Promise<OrgWeeklyResult> {
  const admin = createAdminClient();
  const today = pacificToday();

  // 1) Orgs actively selling: a published, upcoming, on-sale event.
  const { data: sellingEvents, error: evErr } = await admin
    .from("events")
    .select("org_id")
    .eq("status", "published")
    .eq("selling_on_rameelo", true)
    .gte("start_date", today)
    .not("org_id", "is", null);
  if (evErr) return { ok: false, orgs: 0, emailed: 0, sent: 0, error: evErr.message };

  const orgIds = Array.from(new Set((sellingEvents ?? []).map((e: { org_id: string }) => e.org_id)));
  if (orgIds.length === 0) return { ok: true, orgs: 0, emailed: 0, sent: 0 };

  // 2) Recipients per org: owners + admins.
  const { data: members } = await admin
    .from("organization_members")
    .select("org_id, user_id, role")
    .in("org_id", orgIds)
    .in("role", ["owner", "admin"]);

  const byOrg = new Map<string, string[]>(); // org_id → user_ids
  for (const m of (members ?? []) as { org_id: string; user_id: string }[]) {
    const arr = byOrg.get(m.org_id) ?? [];
    arr.push(m.user_id);
    byOrg.set(m.org_id, arr);
  }

  // Resolve emails once (profiles has no email column → auth.users).
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  let emailed = 0;
  let sent = 0;

  for (const orgId of orgIds) {
    const recipientIds = byOrg.get(orgId) ?? [];
    const emails = Array.from(new Set(recipientIds.map((id) => emailById.get(id)).filter(Boolean) as string[]));
    if (emails.length === 0) continue;

    const { data, error } = await admin.rpc("organizer_weekly_summary", { p_org_id: orgId, p_week_start: weekStart });
    if (error || !data) continue;
    const summary = data as OrganizerWeeklyData;

    const { subject, html, text } = organizerWeeklySummaryEmail(summary);

    for (const to of emails) {
      emailed++;
      const { id: providerId, error: sendError } = await sendEmail({
        to, subject, html, text,
        type: "organizer_weekly_summary",
        from: EMAIL.from,
      });
      await recordEmailLog(admin as SupabaseClient, {
        toEmail: to,
        type: "organizer_weekly_summary",
        subject,
        status: sendError ? "failed" : "sent",
        trigger: "automatic",
        providerId,
        error: sendError,
      });
      if (!sendError) sent++;
    }
  }

  return { ok: true, orgs: orgIds.length, emailed, sent };
}
