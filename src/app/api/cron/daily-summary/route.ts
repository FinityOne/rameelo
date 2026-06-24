import { NextResponse } from "next/server";
import { sendDailySummary, priorPacificDay } from "@/lib/daily-summary";

export const runtime = "nodejs";

// Automated daily summary. Triggered by Vercel Cron at 08:00 UTC (= midnight PST
// / 1 AM PDT), so it always runs shortly after a Pacific day ends and reports the
// FULL prior day. Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron
// requests; we require it so the endpoint can't be triggered by anyone else.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured (CRON_SECRET missing)." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const day = priorPacificDay();
  const result = await sendDailySummary(day);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true, day, sent: result.sent, total: result.total });
}
