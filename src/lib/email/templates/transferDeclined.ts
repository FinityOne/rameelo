import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle, divider } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to the SENDER when the person they transferred ticket(s) to declines.
// The tone is reassuring, not alarming: nothing was lost, the tickets are back
// in their wallet, and they can send them to someone else in a tap. Closes the
// loop on the ticket-transfer flow (the recipient already got the "you've been
// sent tickets" email; this is its mirror for a declined hand-off).
export function transferDeclinedEmail(p: {
  senderName?: string | null;       // who originally sent the tickets (recipient of THIS email)
  declinerName?: string | null;     // who declined (to_name / their profile)
  declinerEmail: string;
  qty: number;
  seatNumbers?: number[];
  tierName: string;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  ticketsUrl: string;               // /portal/tickets — to re-send
}): { subject: string; html: string; text: string } {
  const greet = (p.senderName ?? "").trim().split(" ")[0] || "there";
  const decliner = (p.declinerName ?? "").trim() || p.declinerEmail;
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const itThem = p.qty === 1 ? "it" : "them";
  const seats = (p.seatNumbers ?? []).filter(Boolean);
  const seatLabel = seats.length > 0 ? seats.map((s) => `T${s}`).join(", ") : "";
  const subject = `${decliner} declined your ${ticketWord} to ${p.eventTitle}`;

  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="border-radius:14px;overflow:hidden;">
          <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:150px;display:block;border:0;outline:none;text-decoration:none;border-radius:14px;object-fit:cover;" />
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td style="background:${C.aubergine};border-radius:14px;padding:22px 18px;text-align:center;">
          <p style="margin:0;font-family:${FONT_HEAD};font-size:17px;font-weight:800;color:${C.white};">${p.eventTitle}</p>
        </td></tr></table>`;

  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
      <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">${p.qty} ${ticketWord} · ${p.tierName || "Ticket"}${seatLabel ? ` · ${seatLabel}` : ""}</p>
    </td></tr></table>`;

  // Reassurance panel — the whole point of this email.
  const reassure = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.peacock}0F;border:1px solid ${C.peacock}40;border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">✅ Your ${ticketWord} ${p.qty === 1 ? "is" : "are"} back in your wallet</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
        Nothing was lost. The QR ${p.qty === 1 ? "code is" : "codes are"} active again under <strong>My Tickets</strong>, so you can use ${itThem} yourself or send ${itThem} to someone else whenever you like.
      </p>
    </td></tr></table>`;

  const content = [
    eyebrow("Transfer declined"),
    h1("Your ticket transfer wasn&rsquo;t accepted"),
    lead(`Hi ${greet}, <strong>${decliner}</strong> declined the <strong>${p.qty} ${ticketWord}</strong> you sent for ${p.eventTitle}. No worries — here&rsquo;s exactly where things stand.`),
    banner,
    sectionTitle("The tickets"),
    eventPanel,
    sectionTitle("What happens now"),
    reassure,
    button(p.ticketsUrl, `Send ${p.qty === 1 ? "it" : "them"} to someone else`),
    para(`Want to try a different person? Open My Tickets, pick ${p.qty === 1 ? "the ticket" : "the tickets"}, and tap Transfer to send a fresh invite.`),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${decliner} declined your ${ticketWord} — ${p.qty === 1 ? "it's" : "they're"} back in your wallet, ready to re-send.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${greet},`,
    "",
    `${decliner} declined the ${p.qty} ${ticketWord} you sent for ${p.eventTitle}.`,
    "",
    "THE TICKETS",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    `  ${p.qty} ${ticketWord} (${p.tierName || "Ticket"})${seatLabel ? ` · ${seatLabel}` : ""}`,
    "",
    "WHAT HAPPENS NOW",
    `  Nothing was lost — your ${ticketWord} ${p.qty === 1 ? "is" : "are"} active again under My Tickets. Use ${itThem} yourself or send ${itThem} to someone else.`,
    `  ${p.ticketsUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
