import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle, divider, actionCard } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to the person a Rameelo member transfers ticket(s) to. Unlike a comp,
// this is one member handing tickets to another — so the voice is personal and
// names the sender explicitly ("Priya sent you 2 tickets"). The recipient claims
// via the single claim link, which works whether or not they have an account:
//   • already a member → log in and the tickets attach instantly
//   • not yet          → create a free account with this same email, step by step
// We branch the copy on account state and always point first-timers at the
// "how to create an account" help article.
export function ticketTransferEmail(p: {
  recipientName?: string | null;   // to_name captured at transfer time (or member name)
  recipientEmail: string;
  fromName?: string | null;        // who sent the tickets
  qty: number;
  seatNumbers?: number[];          // empty = all seats in the order
  tierName: string;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  hasAccount: boolean;
  claimUrl: string;                // /tickets/claim/<token> — works signed-in or not
  helpCreateAccountUrl: string;    // help-center walkthrough for first-timers
}): { subject: string; html: string; text: string } {
  const greet = (p.recipientName ?? "").trim().split(" ")[0] || "there";
  const from = (p.fromName ?? "").trim();
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const seats = (p.seatNumbers ?? []).filter(Boolean);
  const seatLabel = seats.length > 0 ? seats.map((s) => `T${s}`).join(", ") : "";
  const ctaLabel = p.hasAccount ? "Log in & accept your tickets" : "Claim your tickets";
  const subject = from
    ? `🎟️ ${from} sent you ${p.qty} ${ticketWord} to ${p.eventTitle}`
    : `🎟️ You've been sent ${p.qty} ${ticketWord} to ${p.eventTitle}`;

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
      <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.peacock};">${p.qty} ${ticketWord} · ${p.tierName || "Ticket"}${seatLabel ? ` · ${seatLabel}` : ""}</p>
    </td></tr></table>`;

  // Account state → exactly what they do next to get the tickets into their wallet.
  const accountPanel = p.hasAccount
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.peacock}0F;border:1px solid ${C.peacock}40;border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">✅ You already have a Rameelo account</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Tap the button below and <strong>log in</strong> with <strong>${p.recipientEmail}</strong> to accept ${p.qty === 1 ? "the ticket" : "the tickets"}. ${p.qty === 1 ? "It lands" : "They land"} in <strong>My Tickets</strong> right away — your QR ${p.qty === 1 ? "code is" : "codes are"} ready at the door.
          </p>
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">🆕 New to Rameelo? It only takes a minute</p>
          <p style="margin:0 0 10px;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
            Your ${ticketWord} ${p.qty === 1 ? "is" : "are"} held for <strong>${p.recipientEmail}</strong>. Create a free account with that same email and ${p.qty === 1 ? "it" : "they"}'ll attach automatically — there's no password to remember:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:${FONT_BODY};font-size:13px;line-height:1.7;color:${C.inkMuted};">
            <strong style="color:${C.ink};">1.</strong> Tap <strong>Claim your tickets</strong> below.<br/>
            <strong style="color:${C.ink};">2.</strong> Enter <strong>${p.recipientEmail}</strong> — we email you a 6-digit code (no password).<br/>
            <strong style="color:${C.ink};">3.</strong> Type the code to create your account, then tap <strong>Accept</strong>.<br/>
            <strong style="color:${C.ink};">4.</strong> Done — your ${ticketWord} ${p.qty === 1 ? "is" : "are"} in <strong>My Tickets</strong> with ${p.qty === 1 ? "a QR code" : "QR codes"} for the door.
          </td></tr></table>
        </td></tr></table>`;

  const content = [
    eyebrow("A ticket is waiting for you"),
    h1(`${from ? `${from} sent you tickets` : "You&rsquo;ve been sent tickets"} 🎟️`),
    lead(`Hi ${greet}, ${from ? `<strong>${from}</strong> has sent you` : "you&rsquo;ve been sent"} <strong>${p.qty} ${ticketWord}</strong> to ${p.eventTitle}. ${p.qty === 1 ? "It&rsquo;s" : "They&rsquo;re"} reserved for you — just claim ${p.qty === 1 ? "it" : "them"} to make ${p.qty === 1 ? "it" : "them"} yours.`),
    banner,
    sectionTitle("Your tickets"),
    eventPanel,
    sectionTitle("How to claim"),
    accountPanel,
    button(p.claimUrl, ctaLabel),
    p.hasAccount
      ? para(`Once accepted, ${p.qty === 1 ? "this ticket belongs" : "these tickets belong"} to you and the sender can no longer use ${p.qty === 1 ? "it" : "them"}. Your QR ${p.qty === 1 ? "code lives" : "codes live"} in your Rameelo portal under My Tickets.`)
      : actionCard("📘", "First time creating an account?", "A 2-minute walkthrough of signing up with Rameelo — no password needed, just your email and a code.", p.helpCreateAccountUrl, "Read the guide"),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${from ? `${from} sent you` : "You've been sent"} ${p.qty} ${ticketWord} to ${p.eventTitle} — claim ${p.qty === 1 ? "it" : "them"} now.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${greet},`,
    "",
    `${from ? `${from} has sent you` : "You've been sent"} ${p.qty} ${ticketWord} to ${p.eventTitle}.`,
    "",
    "YOUR TICKETS",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    `  ${p.qty} ${ticketWord} (${p.tierName || "Ticket"})${seatLabel ? ` · ${seatLabel}` : ""}`,
    "",
    "HOW TO CLAIM",
    p.hasAccount
      ? `  You already have a Rameelo account. Open the link below, log in with ${p.recipientEmail}, and accept — your ${ticketWord} land in My Tickets.`
      : `  New to Rameelo? Open the link below, enter ${p.recipientEmail}, type the 6-digit code we email you (no password), then tap Accept. Your ${ticketWord} attach automatically.\n  How to create an account: ${p.helpCreateAccountUrl}`,
    "",
    `  Claim here: ${p.claimUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
