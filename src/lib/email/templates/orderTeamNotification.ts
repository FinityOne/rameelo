import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_HEAD, FONT_BODY } from "../theme";
import { money } from "../../money";

// New-order notification sent to an organization's team (owners/admins + the event
// creator) every time an order is placed for one of their events. Keeps it light:
// who bought, how many, which tier, the event summary, and a small event banner —
// with a CTA into the event's orders dashboard.
export function orderTeamNotificationEmail(p: {
  recipientFirstName?: string | null;
  buyerFirstName: string;
  qty: number;
  tierName: string;
  grandTotal: number;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  ordersUrl: string;
}): { subject: string; html: string; text: string } {
  const greet = (p.recipientFirstName ?? "").trim().split(" ")[0] || "there";
  const buyer = (p.buyerFirstName ?? "").trim() || "Someone";
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `🎟️ New order · ${p.qty} ${ticketWord} — ${p.eventTitle}`;

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
        ${row("Tickets", `${p.qty} ${ticketWord}`)}
        ${row("Tier", p.tierName || "Ticket")}
        <tr><td colspan="2" style="border-top:1px solid ${C.ivory200};padding-top:2px;"></td></tr>
        ${row("Order total", `$${money(p.grandTotal)}`, { strong: true })}
      </table>
    </td></tr></table>`;

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
    `  Tickets: ${p.qty} ${ticketWord}`,
    `  Tier: ${p.tierName || "Ticket"}`,
    `  Order total: $${money(p.grandTotal)}`,
    "",
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
