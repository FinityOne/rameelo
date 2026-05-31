import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PKPass } from "passkit-generator";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}
function fmtTime(t: string | null) {
  if (!t) return "TBA";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const seat = new URL(req.url).searchParams.get("seat");

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Fetch order ───────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, buyer_name, buyer_email, qty, unit_price, grand_total, status, created_at,
      events (id, title, start_date, start_time, venue_name, city, state),
      ticket_tiers (name, price)
    `)
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (error || !data || data.status !== "confirmed") {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const raw = data as unknown as {
    id: string; buyer_name: string; buyer_email: string; qty: number;
    unit_price: number; grand_total: number; status: string; created_at: string;
    events: { id: string; title: string; start_date: string; start_time: string | null; venue_name: string; city: string; state: string };
    ticket_tiers: { name: string; price: number };
  };

  const ev   = raw.events;
  const tier = raw.ticket_tiers;

  // ── Check required env vars ───────────────────────────────────────────────
  const {
    APPLE_PASS_TYPE_IDENTIFIER,
    APPLE_TEAM_IDENTIFIER,
    APPLE_WWDR_CERT,
    APPLE_SIGNER_CERT,
    APPLE_SIGNER_KEY,
    APPLE_SIGNER_KEY_PASSPHRASE,
  } = process.env;

  if (!APPLE_PASS_TYPE_IDENTIFIER || !APPLE_TEAM_IDENTIFIER || !APPLE_WWDR_CERT || !APPLE_SIGNER_CERT || !APPLE_SIGNER_KEY) {
    return NextResponse.json(
      { error: "Apple Wallet not configured. Set APPLE_PASS_TYPE_IDENTIFIER, APPLE_TEAM_IDENTIFIER, APPLE_WWDR_CERT, APPLE_SIGNER_CERT, and APPLE_SIGNER_KEY." },
      { status: 503 }
    );
  }

  // ── Build the pass ────────────────────────────────────────────────────────
  try {
    const signerCert           = Buffer.from(APPLE_SIGNER_CERT, "base64").toString("utf-8");
    const signerKey            = Buffer.from(APPLE_SIGNER_KEY, "base64").toString("utf-8");
    const wwdr                 = Buffer.from(APPLE_WWDR_CERT, "base64").toString("utf-8");
    const signerKeyPassphrase  = APPLE_SIGNER_KEY_PASSPHRASE ?? undefined;

    // Each seat gets its own serial so it's a distinct pass in Wallet
    const seatNum      = seat ? parseInt(seat, 10) : null;
    const seatSuffix   = seatNum ? `-T${seatNum}` : "";
    const serialNumber = `RM-${raw.id.replace(/-/g, "").slice(0, 10).toUpperCase()}${seatSuffix}`;
    const ticketId     = `${raw.id.slice(0, 8).toUpperCase()}${seatSuffix}`;
    const passDate     = new Date(ev.start_date + "T00:00:00").toISOString();

    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_IDENTIFIER,
      serialNumber,
      teamIdentifier: APPLE_TEAM_IDENTIFIER,
      organizationName: "Rameelo",
      description: `Ticket — ${ev.title}`,
      logoText: "Rameelo",

      foregroundColor: "rgb(252, 249, 242)",
      backgroundColor: "rgb(46, 27, 48)",
      labelColor:      "rgb(245, 166, 35)",

      eventTicket: {
        primaryFields: [
          { key: "event", label: "EVENT", value: ev.title },
        ],
        secondaryFields: [
          { key: "date", label: "DATE", value: fmtDate(ev.start_date) },
          { key: "time", label: "TIME", value: fmtTime(ev.start_time) },
        ],
        auxiliaryFields: [
          { key: "venue",  label: "VENUE",  value: `${ev.venue_name}, ${ev.city}` },
          { key: "tier",   label: "TICKET", value: tier.name },
          ...(seatNum ? [{ key: "seat", label: "SEAT", value: `${seatNum} of ${raw.qty}` }] : [
            { key: "qty", label: "QTY", value: `${raw.qty}` },
          ]),
        ],
        backFields: [
          { key: "holder",   label: "Ticket Holder", value: raw.buyer_name },
          { key: "email",    label: "Email",          value: raw.buyer_email },
          { key: "ticketid", label: "Ticket ID",      value: ticketId },
          { key: "order",    label: "Order ID",       value: serialNumber },
          { key: "paid",     label: "Amount Paid",    value: `$${Number(raw.grand_total).toFixed(2)}` },
          { key: "support",  label: "Support",        value: "help@rameelo.com" },
        ],
      },

      barcodes: [
        {
          message: `RAMEELO:${raw.id}${seatSuffix}`,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
          altText: ticketId,
        },
      ],

      relevantDate: passDate,
      expirationDate: new Date(
        new Date(ev.start_date + "T23:59:59").getTime() + 86400000
      ).toISOString(),
    };

    const pass = new PKPass(
      { "pass.json": Buffer.from(JSON.stringify(passJson)) },
      { wwdr, signerCert, signerKey, signerKeyPassphrase },
    );

    const buffer = pass.getAsBuffer();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="rameelo-${ticketId}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PKPass generation error:", err);
    return NextResponse.json({ error: "Failed to generate pass" }, { status: 500 });
  }
}
