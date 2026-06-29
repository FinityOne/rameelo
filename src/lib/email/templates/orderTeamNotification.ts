import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_HEAD, FONT_BODY } from "../theme";
import { money } from "../../money";

// New-order notification sent to an organization's team (owners/admins + the event
// creator) every time an order is placed for one of their events. Keeps it light:
// who bought, how many, which tier, the event summary, and a small event banner —
// with a CTA into the event's orders dashboard.
//
// IMPORTANT — all money shown here is TICKET FACE VALUE only (qty × unit_price −
// discount), which is the organizer's revenue. The Rameelo platform fee and card
// processing fee are charged to the buyer and never deducted from the organizer, so
// they're deliberately left out — this email is the organizer's order summary.
export function orderTeamNotificationEmail(p: {
  recipientFirstName?: string | null;
  buyerFirstName: string;
  qty: number;
  tierName: string;
  unitPrice: number;       // per-ticket face price
  discountAmount?: number; // total discount applied (subtracted from face value)
  faceValue: number;       // qty × unitPrice − discountAmount — organizer revenue
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  ordersUrl: string;
  paymentMethod: string; // 'card' | 'ach'
}): { subject: string; html: string; text: string } {
  const greet = (p.recipientFirstName ?? "").trim().split(" ")[0] || "there";
  const buyer = (p.buyerFirstName ?? "").trim() || "Someone";
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const method = (p.paymentMethod ?? "").toLowerCase();
  const isAch = method === "ach";
  const isManual = method === "manual";
  const payLabel = isManual ? "Manual / offline" : isAch ? "Bank transfer (ACH)" : "Credit / Debit card";
  const discount = Math.max(0, Number(p.discountAmount) || 0);
  // Consistent, scannable subject: who · how many · which event.
  const subject = `🎟️ ${buyer} ordered ${p.qty} ${ticketWord} — ${p.eventTitle}`;

  // Small event banner (image when the event has a cover, otherwise a branded strip).
  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="border-radius:14px;overflow:hidden;">
          <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:140px;display:block;border:0;outline:none;text-decoration:none;border-radius:14px;object-fit:cover;" />
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="background:${C.aubergine};border-radius:14px;padding:20px 18px;text-align:center;">
          <p style="margin:0;font-family:${FONT_HEAD};font-size:16px;font-weight:800;color:${C.white};">${p.eventTitle}</p>
        </td></tr></table>`;

  // Order detail rows (buyer / tickets / tier / total).
  const row = (label: string, value: string, opts?: { strong?: boolean }) =>
    `<tr>
      <td style="padding:7px 0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${label}</td>
      <td align="right" style="padding:7px 0;font-family:${FONT_BODY};font-size:${opts?.strong ? 15 : 14}px;${opts?.strong ? "font-weight:700;" : "font-weight:600;"}color:${C.ink};">${value}</td>
    </tr>`;
  const orderPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#fff;border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row("Buyer", buyer)}
        ${row("Tier", p.tierName || "Ticket")}
        ${row("Tickets", `${p.qty} ${ticketWord} × $${money(p.unitPrice)}`)}
        ${discount > 0 ? row("Discount", `−$${money(discount)}`) : ""}
        ${row("Payment", payLabel)}
        <tr><td colspan="2" style="border-top:1px solid ${C.ivory200};padding-top:2px;"></td></tr>
        ${row("Ticket revenue", `$${money(p.faceValue)}`, { strong: true })}
      </table>
      <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.5;color:${C.inkMuted};">${isManual ? "Manual / offline order — you collected this payment directly. It isn&rsquo;t processed through Rameelo, and there are no Rameelo or card fees." : "Ticket face value — your revenue. Rameelo &amp; card fees are paid by the buyer and aren&rsquo;t deducted from this."}</p>
    </td></tr></table>`;

  // ACH orders settle over a few days — make clear the tickets aren't valid yet.
  const achNote = isAch
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">⏳ Paid by bank transfer (ACH) — payment clearing</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Bank transfers take <strong>2&ndash;5 business days</strong> to clear. <strong>QR codes are not issued until the payment settles</strong> &mdash; this order&rsquo;s tickets stay reserved and won&rsquo;t scan at the door until the funds clear. We&rsquo;ll confirm automatically once they do.
          </p>
        </td></tr></table>`
    : "";

  // Event summary panel.
  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
    </td></tr></table>`;

  const content = [
    eyebrow("New order"),
    h1("You&rsquo;ve got a new order! 🎉"),
    lead(`Hi ${greet}, <strong>${buyer}</strong> just ordered <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle}.`),
    banner,
    sectionTitle("Order details"),
    orderPanel,
    achNote,
    sectionTitle("Event"),
    eventPanel,
    button(p.ordersUrl, "View all orders"),
    para("You&rsquo;re receiving this because you&rsquo;re on this event&rsquo;s organizing team. Manage your events and sales anytime from your Rameelo organizer dashboard."),
  ].join("");

  const html = renderEmail({
    preheader: `${buyer} ordered ${p.qty} ${ticketWord} (${p.tierName || "Ticket"}) to ${p.eventTitle}.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${greet},`,
    "",
    `New order for ${p.eventTitle}:`,
    `  Buyer: ${buyer}`,
    `  Tier: ${p.tierName || "Ticket"}`,
    `  Tickets: ${p.qty} ${ticketWord} x $${money(p.unitPrice)}`,
    discount > 0 ? `  Discount: -$${money(discount)}` : "",
    `  Payment: ${payLabel}`,
    `  Ticket revenue (face value): $${money(p.faceValue)}`,
    isManual
      ? "  (Manual / offline order — collected directly by you, not processed through Rameelo.)"
      : "  (Rameelo & card fees are paid by the buyer — not deducted from your revenue.)",
    "",
    isAch
      ? "NOTE: Paid by bank transfer (ACH). Payments take 2-5 business days to clear, and QR codes are NOT issued until the payment settles — the tickets stay reserved and won't scan at the door until the funds clear.\n"
      : "",
    "Event:",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    "",
    `View all orders: ${p.ordersUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
