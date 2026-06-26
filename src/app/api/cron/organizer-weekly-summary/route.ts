import { NextResponse } from "next/server";
import { sendOrganizerWeeklySummaries, priorPacificWeekStart } from "@/lib/organizer-weekly-summary";

export const runtime = "nodejs";
export const maxDuration = 60;

// Weekly organizer sales summary. Triggered by Vercel Cron at 08:00 UTC every
// Saturday (= Saturday midnight Pacific), reporting the prior 7 Pacific days
// (the just-completed Sat→Fri week). Vercel attaches
// `Authorization: Bearer <CRON_SECRET>`; we require it so only the scheduler
// can trigger the send.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured (CRON_SECRET missing)." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = priorPacificWeekStart();
  const result = await sendOrganizerWeeklySummaries(weekStart);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true, weekStart, orgs: result.orgs, emailed: result.emailed, sent: result.sent });
}
