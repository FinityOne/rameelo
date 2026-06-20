import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle, divider } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to a customer when an organizer records a MANUAL / offline order for them
// (paid by cash, Zelle, at the door, etc. — not through Rameelo). It reads as an
// order confirmation: the organizer has confirmed your order; here's how to access
// your tickets. Branches on whether they already have a Rameelo account.
export function manualOrderConfirmationEmail(p: {
  recipientFirstName?: string | null;
  recipientEmail: string;
  organizerName?: string | null;
  qty: number;
  total: number;
  tierName: string;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  hasAccount: boolean;
  signInUrl: string;
  signUpUrl: string;
}): { subject: string; html: string; text: string } {
  const greet = (p.recipientFirstName ?? "").trim().split(" ")[0] || "there";
  const org = (p.organizerName ?? "").trim();
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const amount = `$${Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const ctaUrl = p.hasAccount ? p.signInUrl : p.signUpUrl;
  const ctaLabel = p.hasAccount ? "Log in to see your tickets" : "Create your free account";
  const subject = `Your order is confirmed — ${p.eventTitle}`;

  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="border-radius:14px;overflow:hidden;">
          <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:150px;display:block;border:0;outline:none;text-decoration:none;border-radius:14px;object-fit:cover;" />
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="background:${C.aubergine};border-radius:14px;padding:22px 18px;text-align:center;">
          <p style="margin:0;font-family:${FONT_HEAD};font-size:17px;font-weight:800;color:${C.white};">${p.eventTitle}</p>
        </td></tr></table>`;

  const orderPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
      <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">${p.qty} ${ticketWord} · ${p.tierName || "Ticket"} · ${amount}</p>
    </td></tr></table>`;

  const accountPanel = p.hasAccount
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.peacock}0F;border:1px solid ${C.peacock}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">✅ You already have a Rameelo account</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Log in with <strong>${p.recipientEmail}</strong> and your ${ticketWord} are waiting under <strong>My Tickets</strong>.
          </p>
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">🆕 One quick step: create your free account</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Sign up with <strong>this same email</strong> (<strong>${p.recipientEmail}</strong>) and your ${ticketWord} will appear automatically under <strong>My Tickets</strong>.
          </p>
        </td></tr></table>`;

  const content = [
    eyebrow("Order confirmed"),
    h1("Your order is confirmed 🎟️"),
    lead(`Hi ${greet}, ${org ? `<strong>${org}</strong> has confirmed your order for` : "your order has been confirmed for"} <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle}. Payment was handled directly with the organizer.`),
    banner,
    sectionTitle("Your order"),
    orderPanel,
    sectionTitle("How to access your tickets"),
    accountPanel,
    button(ctaUrl, ctaLabel),
    para("Your ticket QR codes live in your Rameelo portal under My Tickets — show them at the door to get in. This order was arranged and paid directly with the organizer, so there&rsquo;s nothing more to pay on Rameelo."),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `Your order for ${p.eventTitle} is confirmed — ${p.hasAccount ? "log in" : "create a free account"} to access your tickets.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${greet},`,
    "",
    `${org ? `${org} has confirmed your order for` : "Your order has been confirmed for"} ${p.qty} ${ticketWord} to ${p.eventTitle}. Payment was handled directly with the organizer.`,
    "",
    "YOUR ORDER",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    `  ${p.qty} ${ticketWord} (${p.tierName || "Ticket"}) · ${amount}`,
    "",
    "HOW TO ACCESS YOUR TICKETS",
    p.hasAccount
      ? `  Log in with ${p.recipientEmail} and your ${ticketWord} are under My Tickets.\n  ${p.signInUrl}`
      : `  Create a free account with this same email (${p.recipientEmail}) and your ${ticketWord} will appear automatically under My Tickets.\n  ${p.signUpUrl}`,
    "",
    "Your ticket QR codes live in your Rameelo portal under My Tickets. This order was arranged and paid directly with the organizer.",
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
