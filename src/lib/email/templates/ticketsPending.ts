import { renderEmail, eyebrow, h1, lead, para, button, divider } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Sent right after an ACH/bank checkout, while the transfer is still clearing.
// The order is reserved but NOT yet a valid ticket — the QR codes are released
// only once the bank transfer settles (handled by the Stripe webhook).
export function ticketsPendingEmail(p: {
  buyerName?: string | null;
  receiptNum: string;
  qty: number;
  tierName: string;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  ticketsUrl: string;
}): { subject: string; html: string; text: string } {
  const name = (p.buyerName ?? "").trim().split(" ")[0] || "there";
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `Reserved! Your ${p.qty} ${ticketWord} to ${p.eventTitle} — pending bank transfer`;

  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:16px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
    </td></tr></table>`;

  // The key "what happens next" panel.
  const pendingPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">⏳ Payment clearing</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
        Bank transfers (ACH) take <strong>2&ndash;5 business days</strong> to settle. Your spot is held the whole time. As soon as the transfer clears, your tickets are confirmed and your <strong>QR codes appear in your account</strong> &mdash; and we&rsquo;ll email you to let you know.
      </p>
    </td></tr></table>`;

  const content = [
    eyebrow(`Order ${p.receiptNum}`),
    h1("Your tickets are reserved 🎟️"),
    lead(`Hi ${name}, thanks for your order! Your <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle} are <strong>reserved</strong> while your bank transfer clears.`),
    eventPanel,
    pendingPanel,
    para("You don&rsquo;t need to do anything right now. We&rsquo;ll email you the moment your payment clears and your tickets are ready."),
    button(p.ticketsUrl, "View my order"),
    divider(),
    para("Garbe ki raat, Rameelo ke saath! 💃"),
  ].join("");

  const html = renderEmail({
    preheader: `Your ${p.qty} ${ticketWord} to ${p.eventTitle} are reserved — QR codes arrive once your bank transfer clears.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${name},`,
    "",
    `Your ${p.qty} ${ticketWord} to ${p.eventTitle} (order ${p.receiptNum}) are RESERVED while your bank transfer clears.`,
    artist ? `Artist: ${artist}` : "",
    p.eventWhen ? `When: ${p.eventWhen}` : "",
    p.eventWhere ? `Where: ${p.eventWhere}` : "",
    "",
    "Bank transfers (ACH) take 2-5 business days to settle. Your spot is held the whole time. Once it clears, your tickets are confirmed and your QR codes appear in your account — we'll email you when they're ready.",
    "",
    `View your order: ${p.ticketsUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
