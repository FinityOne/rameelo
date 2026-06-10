import { renderEmail, eyebrow, h1, lead, para, button, divider } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Sent when a payment fails after checkout — most commonly a bank (ACH) transfer
// that was initiated but later bounced/returned. Tells the buyer plainly that the
// payment didn't go through, their tickets are not valid, and how to fix it.
export function paymentFailedEmail(p: {
  buyerName?: string | null;
  eventTitle: string;
  qty: number;
  reason?: string | null;
  retryUrl: string;
}): { subject: string; html: string; text: string } {
  const name = (p.buyerName ?? "").trim().split(" ")[0] || "there";
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `Action needed: your payment for ${p.eventTitle} didn't go through`;

  const reasonPanel = p.reason
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;background:${C.durga}0F;border:1px solid ${C.durga}33;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.durga};">Reason</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:14px;color:${C.ink};">${p.reason}</p>
        </td></tr></table>`
    : "";

  const content = [
    eyebrow("Payment failed"),
    h1("Your payment didn&rsquo;t go through"),
    lead(`Hi ${name}, unfortunately your payment for <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle} could not be completed, so your order has been canceled and the ${ticketWord} are not valid.`),
    reasonPanel,
    para("This most often happens when a bank transfer is returned or a card is declined. The good news: your spot may still be available — you can complete your purchase again with a different payment method."),
    button(p.retryUrl, "Try your purchase again"),
    divider(),
    para(`If you believe this is a mistake or need a hand, just reply to this email or reach us at <a href="mailto:${EMAIL.support}" style="color:${C.durga};font-weight:600;">${EMAIL.support}</a> and we&rsquo;ll sort it out.`),
  ].join("");

  const html = renderEmail({
    preheader: `Your payment for ${p.eventTitle} didn't go through — your order was canceled. Here's how to fix it.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${name},`,
    "",
    `Unfortunately your payment for ${p.qty} ${ticketWord} to ${p.eventTitle} could not be completed, so your order has been canceled and the ${ticketWord} are not valid.`,
    p.reason ? `Reason: ${p.reason}` : "",
    "",
    "This usually happens when a bank transfer is returned or a card is declined. You can complete your purchase again with a different payment method:",
    p.retryUrl,
    "",
    `Need help? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
