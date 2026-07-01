import { renderEmail, eyebrow, h1, lead, divider, sectionTitle, button } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";
import { money } from "../../money";
import { effectiveProfit, type PayMethod } from "../../fees";

// Internal platform-admin notification on every confirmed, non-test order. Far more
// detailed than the organizer's team alert: it lists the full buyer contact, the
// face-value price breakdown, the buyer-paid fees, AND Rameelo's effective profit
// after the Stripe processing cost. This is an internal back-office record — admins
// opt out per event from the event's admin detail page.
export function orderAdminNotificationEmail(p: {
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone?: string | null;
  qty: number;
  tierName: string;
  unitPrice: number;
  discountAmount?: number;
  promoCode?: string | null; // when a promo code was used, its code (for labeling)
  rameeloFee: number;
  processingFee: number;
  grandTotal: number;
  paymentMethod: string; // 'card' | 'ach'
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  receiptNum: string;
  orderUrl: string;       // admin event detail / order link
  placedAt: string;       // human-readable timestamp
}): { subject: string; html: string; text: string } {
  const fullName = (p.buyerName ?? "").trim() || "Unknown buyer";
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.slice(1).join(" ") || "—";
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const rawMethod = (p.paymentMethod ?? "").toLowerCase();
  const isManual = rawMethod === "manual";
  const method = (rawMethod === "ach" ? "ach" : "card") as PayMethod;
  const isAch = method === "ach";
  const payLabel = isManual ? "Manual / offline" : isAch ? "Bank transfer (ACH)" : "Credit / Debit card";

  const unitPrice = Number(p.unitPrice) || 0;
  const discount = Math.max(0, Number(p.discountAmount) || 0);
  const promoCode = (p.promoCode ?? "").trim();
  const discountLabel = promoCode ? `Promo · ${promoCode}` : "Group discount";
  const faceValue = Math.max(0, p.qty * unitPrice - discount);
  const rameeloFee = Number(p.rameeloFee) || 0;
  const processingFee = Number(p.processingFee) || 0;
  const grandTotal = Number(p.grandTotal) || 0;

  // Manual / offline orders are settled directly by the organizer — Rameelo
  // processes nothing, so there's no Stripe cost and no platform-fee profit.
  const { platformRevenue, stripeCost, netProfit } = isManual
    ? { platformRevenue: 0, stripeCost: 0, netProfit: 0 }
    : effectiveProfit(rameeloFee, processingFee, grandTotal, method);
  const profitPositive = netProfit >= 0;

  const subject = `${isManual ? "📝 Manual order" : "💰 Order"} ${p.receiptNum} · ${firstName} ${lastName} · ${p.qty} ${ticketWord} — ${p.eventTitle}`;

  // ── Buyer contact ──────────────────────────────────────────────────────────
  const contactRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;vertical-align:top;width:96px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
      <td style="padding:6px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${value}</td>
    </tr>`;
  const contactPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${contactRow("First name", firstName)}
        ${contactRow("Last name", lastName)}
        ${contactRow("Email", p.buyerEmail ? `<a href="mailto:${p.buyerEmail}" style="color:${C.aubergine};text-decoration:none;">${p.buyerEmail}</a>` : "—")}
        ${contactRow("Phone", p.buyerPhone?.trim() ? p.buyerPhone : "—")}
      </table>
    </td></tr></table>`;

  // ── Order + event ──────────────────────────────────────────────────────────
  const orderRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;vertical-align:top;width:96px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
      <td style="padding:6px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${value}</td>
    </tr>`;
  const orderPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${orderRow("Receipt", p.receiptNum)}
        ${orderRow("Event", p.eventTitle)}
        ${p.artistName?.trim() ? orderRow("Artist", p.artistName) : ""}
        ${p.eventWhen ? orderRow("Event date", p.eventWhen) : ""}
        ${p.eventWhere ? orderRow("Venue", p.eventWhere) : ""}
        ${orderRow("Tickets", `${p.qty} × ${p.tierName || "Ticket"}`)}
        ${orderRow("Payment", payLabel)}
        ${orderRow("Placed", p.placedAt)}
      </table>
    </td></tr></table>`;

  // ── Price breakdown (what the buyer paid) ──────────────────────────────────
  const moneyRow = (label: string, value: string, opts?: { strong?: boolean; color?: string; muted?: boolean }) =>
    `<tr>
      <td style="padding:6px 0;font-family:${FONT_BODY};font-size:${opts?.strong ? 14 : 13}px;${opts?.strong ? "font-weight:700;" : ""}color:${opts?.muted ? C.inkMuted : C.ink};">${label}</td>
      <td align="right" style="padding:6px 0;font-family:${FONT_BODY};font-size:${opts?.strong ? 15 : 14}px;font-weight:${opts?.strong ? 700 : 600};color:${opts?.color ?? C.ink};">${value}</td>
    </tr>`;
  const pricePanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#fff;border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${moneyRow(`Tickets (${p.qty} × $${money(unitPrice)})`, `$${money(p.qty * unitPrice)}`)}
        ${discount > 0 ? moneyRow(discountLabel, `−$${money(discount)}`, { color: C.peacock }) : ""}
        ${moneyRow("Ticket face value (organizer)", `$${money(faceValue)}`, { strong: true })}
        <tr><td colspan="2" style="border-top:1px solid ${C.ivory200};padding-top:2px;"></td></tr>
        ${moneyRow("Rameelo platform fee (3%)", `$${money(rameeloFee)}`, { muted: true })}
        ${processingFee > 0 ? moneyRow("Card processing fee (5%)", `$${money(processingFee)}`, { muted: true }) : moneyRow("Processing fee", isManual ? "$0.00 (manual — none)" : "$0.00 (ACH — none)", { muted: true })}
        <tr><td colspan="2" style="border-top:1px solid ${C.ivory200};padding-top:2px;"></td></tr>
        ${moneyRow(isManual ? "Total collected (offline)" : "Total paid by buyer", `$${money(grandTotal)}`, { strong: true })}
      </table>
    </td></tr></table>`;

  // ── Effective profit (after Stripe cost) ───────────────────────────────────
  const stripeLabel = isAch ? "Stripe ACH cost (0.8%, $5 cap)" : "Stripe card cost (2.9% + $0.30)";
  const profitColor = profitPositive ? C.peacock : C.durga;
  const profitPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${profitColor}0F;border:1px solid ${profitColor}40;border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${moneyRow("Platform fee revenue", `$${money(platformRevenue)}`, { muted: true })}
        ${moneyRow(stripeLabel, `−$${money(stripeCost)}`, { muted: true, color: C.ink })}
        <tr><td colspan="2" style="border-top:1px solid ${profitColor}33;padding-top:2px;"></td></tr>
        <tr>
          <td style="padding:8px 0 0;font-family:${FONT_HEAD};font-size:15px;font-weight:800;color:${C.ink};">Effective profit</td>
          <td align="right" style="padding:8px 0 0;font-family:${FONT_HEAD};font-size:18px;font-weight:800;color:${profitColor};">${profitPositive ? "" : "−"}$${money(Math.abs(netProfit))}</td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.5;color:${C.inkMuted};">Effective profit = Rameelo platform fee${processingFee > 0 ? " + card processing fee" : ""} − Stripe&rsquo;s processing cost on the $${money(grandTotal)} charged.</p>
    </td></tr></table>`;

  // Manual / offline orders: Rameelo earns nothing — replace the profit panel.
  const manualEconPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 5px;font-family:${FONT_HEAD};font-size:15px;font-weight:800;color:${C.ink};">📝 Manual / offline order</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">Settled directly by the organizer. Rameelo processed <strong>$0.00</strong> and earns no platform or processing fee on this order — the $${money(grandTotal)} face value was collected offline by the organizer.</p>
    </td></tr></table>`;

  const content = [
    eyebrow("New order · admin"),
    h1("New order received 💰"),
    lead(`<strong>${firstName} ${lastName}</strong> ordered <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle}. Full order breakdown below.`),
    sectionTitle("Buyer"),
    contactPanel,
    sectionTitle("Order & event"),
    orderPanel,
    sectionTitle("Price breakdown"),
    pricePanel,
    sectionTitle("Rameelo economics"),
    isManual ? manualEconPanel : profitPanel,
    button(p.orderUrl, "Open in admin"),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${firstName} ${lastName} · ${p.qty} ${ticketWord} · $${money(grandTotal)} · ${isManual ? "manual / offline" : `profit $${money(netProfit)}`} — ${p.eventTitle}`,
    contentHtml: content,
  });

  const text = [
    `New order ${p.receiptNum} — ${p.eventTitle}`,
    "",
    "BUYER",
    `  First name: ${firstName}`,
    `  Last name: ${lastName}`,
    `  Email: ${p.buyerEmail || "—"}`,
    `  Phone: ${p.buyerPhone?.trim() || "—"}`,
    "",
    "ORDER & EVENT",
    `  Receipt: ${p.receiptNum}`,
    `  Event: ${p.eventTitle}`,
    p.artistName?.trim() ? `  Artist: ${p.artistName}` : "",
    p.eventWhen ? `  Event date: ${p.eventWhen}` : "",
    p.eventWhere ? `  Venue: ${p.eventWhere}` : "",
    `  Tickets: ${p.qty} x ${p.tierName || "Ticket"}`,
    `  Payment: ${payLabel}`,
    `  Placed: ${p.placedAt}`,
    "",
    "PRICE BREAKDOWN",
    `  Tickets (${p.qty} x $${money(unitPrice)}): $${money(p.qty * unitPrice)}`,
    discount > 0 ? `  ${discountLabel}: -$${money(discount)}` : "",
    `  Ticket face value (organizer): $${money(faceValue)}`,
    `  Rameelo platform fee (3%): $${money(rameeloFee)}`,
    processingFee > 0 ? `  Card processing fee (5%): $${money(processingFee)}` : `  Processing fee: $0.00 (${isManual ? "manual" : "ACH"})`,
    `  ${isManual ? "Total collected (offline)" : "Total paid by buyer"}: $${money(grandTotal)}`,
    "",
    "RAMEELO ECONOMICS",
    ...(isManual
      ? ["  Manual / offline order — settled directly by the organizer.",
         `  Rameelo processed $0.00 and earns no fee. $${money(grandTotal)} collected offline.`]
      : [`  Platform fee revenue: $${money(platformRevenue)}`,
         `  ${stripeLabel}: -$${money(stripeCost)}`,
         `  Effective profit: ${profitPositive ? "" : "-"}$${money(Math.abs(netProfit))}`]),
    "",
    `Open in admin: ${p.orderUrl}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
