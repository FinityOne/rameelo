import { NextResponse } from "next/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { verifyUnsubToken } from "@/lib/marketing-token";

export const runtime = "nodejs";

async function optOut(token: string): Promise<boolean> {
  if (!serviceRoleConfigured) return false;
  const email = verifyUnsubToken(token);
  if (!email) return false;
  await createAdminClient().rpc("set_marketing_opt_out", { p_email: email });
  return true;
}

// One-click unsubscribe (RFC 8058) — email clients POST here directly.
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const ok = await optOut(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

// Human click from the email footer — opt out, then show a simple confirmation.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const ok = await optOut(token);
  const body = ok
    ? `<h1>You're unsubscribed</h1><p>You won't receive marketing emails from Rameelo anymore. Order receipts and ticket emails still come through.</p>`
    : `<h1>Link expired</h1><p>This unsubscribe link is invalid. Email <a href="mailto:support@rameelo.com">support@rameelo.com</a> and we'll remove you.</p>`;
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribe · Rameelo</title>
     <style>body{margin:0;background:#FCF9F2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#241C26;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
     .c{max-width:420px;text-align:center;background:#fff;border:1px solid #ECE6DA;border-radius:20px;padding:36px 28px}
     h1{font-size:22px;margin:0 0 10px}p{font-size:14px;line-height:1.6;color:#6E6675;margin:0}a{color:#2E1B30}</style></head>
     <body><div class="c">${body}</div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
