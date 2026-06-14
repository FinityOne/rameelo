import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle, divider } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to someone an organizer gifts complimentary ("comp") tickets to. These are
// free, not a purchase — so the messaging is celebratory, not a receipt. The key
// action differs by whether the recipient already has a Rameelo account: log in vs.
// create one with this same email (which auto-attaches the tickets on first sign-in).
export function compTicketEmail(p: {
  recipientFirstName?: string | null;
  recipientEmail: string;
  hostName?: string | null;     // who sent them (organizer / org)
  qty: number;
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
  const host = (p.hostName ?? "").trim();
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const ctaUrl = p.hasAccount ? p.signInUrl : p.signUpUrl;
  const ctaLabel = p.hasAccount ? "Log in to see your tickets" : "Create your free account";
  const subject = `🎟️ You've got ${p.qty} free ${ticketWord} to ${p.eventTitle}`;

  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="border-radius:14px;overflow:hidden;">
          <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:150px;display:block;border:0;outline:none;text-decoration:none;border-radius:14px;object-fit:cover;" />
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="background:${C.aubergine};border-radius:14px;padding:22px 18px;text-align:center;">
          <p style="margin:0;font-family:${FONT_HEAD};font-size:17px;font-weight:800;color:${C.white};">${p.eventTitle}</p>
        </td></tr></table>`;

  // Event summary panel.
  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
      <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.peacock};">${p.qty} complimentary ${ticketWord} · ${p.tierName || "Ticket"}</p>
    </td></tr></table>`;

  // Account state → the one thing they need to do next.
  const accountPanel = p.hasAccount
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.peacock}0F;border:1px solid ${C.peacock}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">✅ You already have a Rameelo account</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Just <strong>log in</strong> with <strong>${p.recipientEmail}</strong> and your ${ticketWord} are already waiting under <strong>My Tickets</strong> — nothing else to do.
          </p>
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">🆕 One quick step: create your free account</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Sign up with <strong>this same email</strong> (<strong>${p.recipientEmail}</strong>) and your ${ticketWord} will appear automatically under <strong>My Tickets</strong> — no payment, no code to enter.
          </p>
        </td></tr></table>`;

  const content = [
    eyebrow("Complimentary tickets"),
    h1("You&rsquo;ve been gifted tickets! 🎁"),
    lead(`Hi ${greet}, ${host ? `<strong>${host}</strong> has sent you` : "you&rsquo;ve been sent"} <strong>${p.qty} free ${ticketWord}</strong> to ${p.eventTitle}.`),
    banner,
    sectionTitle("Your tickets"),
    eventPanel,
    sectionTitle("How to get them"),
    accountPanel,
    button(ctaUrl, ctaLabel),
    para("Your ticket QR codes live in your Rameelo portal under My Tickets — show them at the door to get in. These tickets are complimentary; there&rsquo;s nothing to pay."),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${p.qty} free ${ticketWord} to ${p.eventTitle} — ${p.hasAccount ? "log in" : "create a free account"} to claim.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${greet},`,
    "",
    `${host ? `${host} has sent you` : "You've been sent"} ${p.qty} FREE ${ticketWord} to ${p.eventTitle}.`,
    "",
    "YOUR TICKETS",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    `  ${p.qty} complimentary ${ticketWord} (${p.tierName || "Ticket"})`,
    "",
    "HOW TO GET THEM",
    p.hasAccount
      ? `  You already have a Rameelo account. Log in with ${p.recipientEmail} and your ${ticketWord} are waiting under My Tickets.\n  ${p.signInUrl}`
      : `  Create a free account with this same email (${p.recipientEmail}) and your ${ticketWord} will appear automatically under My Tickets.\n  ${p.signUpUrl}`,
    "",
    "Your ticket QR codes live in your Rameelo portal under My Tickets. These tickets are complimentary — nothing to pay.",
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
