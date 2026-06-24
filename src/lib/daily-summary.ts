import { createAdminClient } from "@/lib/supabase/admin";
import { dailySummaryEmail, type DailySummaryData } from "@/lib/email/templates/dailySummary";
import { sendEmail } from "@/lib/email/send";
import { recordEmailLog } from "@/lib/email/log";
import type { SupabaseClient } from "@supabase/supabase-js";

// Computes a day's activity summary and emails it to every platform admin.
// Shared by the manual admin button and the midnight cron. Uses the service-role
// admin client so it works without a user session (cron) and isn't blocked by RLS.
export async function sendDailySummary(day: string): Promise<{ ok: boolean; sent: number; total: number; error?: string; data?: DailySummaryData }> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("admin_daily_summary", { p_day: day });
  if (error) return { ok: false, sent: 0, total: 0, error: error.message };
  const summary = data as DailySummaryData;

  // Admin recipients.
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  const ids = (admins ?? []).map((a: { id: string }) => a.id);
  if (ids.length === 0) return { ok: true, sent: 0, total: 0, data: summary };

  // Resolve emails from auth.users (profiles has no email column).
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emails = (usersList?.users ?? [])
    .filter((u) => ids.includes(u.id) && u.email)
    .map((u) => u.email as string);

  if (emails.length === 0) return { ok: true, sent: 0, total: 0, data: summary };

  const { subject, html, text } = dailySummaryEmail(summary);

  let sent = 0;
  for (const to of emails) {
    const { id: providerId, error: sendError } = await sendEmail({ to, subject, html, text });
    await recordEmailLog(admin as SupabaseClient, {
      toEmail: to,
      type: "daily_summary",
      subject,
      status: sendError ? "failed" : "sent",
      trigger: "automatic",
      providerId,
      error: sendError,
    });
    if (!sendError) sent++;
  }

  return { ok: true, sent, total: emails.length, data: summary };
}

/** The prior calendar day in Pacific time, as YYYY-MM-DD. */
export function priorPacificDay(): string {
  // en-CA gives YYYY-MM-DD; subtract a day in the Pacific zone.
  const nowPacific = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  nowPacific.setDate(nowPacific.getDate() - 1);
  const y = nowPacific.getFullYear();
  const m = String(nowPacific.getMonth() + 1).padStart(2, "0");
  const d = String(nowPacific.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
