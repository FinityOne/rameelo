import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to people on an event's interest list the moment tickets go on sale. This is
// a conversion email, not a receipt: warm thank-you for their interest, the event at
// a glance, gentle urgency, and ONE unmissable CTA into the event page to buy. Each
// send is personalized (first name + the quantity they said they wanted) because
// personalized, single-CTA announcements convert far better than generic blasts.
export function interestTicketsLiveEmail(p: {
  recipientFirstName?: string | null;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  bannerUrl?: string | null;
  qtyInterested?: number | null;
  buyUrl: string;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const artist = (p.artistName ?? "").trim();
  const qty = Math.max(0, Number(p.qtyInterested) || 0);
  // Personalized subject lifts opens; keep the value (event + "on sale") up front.
  const subject = `${first ? `${first}, t` : "T"}ickets for ${p.eventTitle} are now on sale 🎟️`;

  // Full-width event hero — image when present, branded strip otherwise.
  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
        <tr><td style="border-radius:14px;overflow:hidden;">
          <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:200px;display:block;border:0;outline:none;text-decoration:none;border-radius:14px;object-fit:cover;" />
        </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
        <tr><td style="background:${C.aubergine};border-radius:14px;padding:26px 18px;text-align:center;">
          <p style="margin:0;font-family:${FONT_HEAD};font-size:18px;font-weight:800;color:${C.white};">${p.eventTitle}</p>
        </td></tr></table>`;

  // Event-at-a-glance card.
  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
    </td></tr></table>`;

  // Gentle, honest urgency — interest lists mean these tend to move fast.
  const urgency = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;">
    <tr><td style="padding:12px 16px;text-align:center;">
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">⚡ You asked to be first to know — tickets are limited and move quickly.</p>
    </td></tr></table>`;

  const greetLine = first
    ? `Hi ${first}, thank you for expressing interest in <strong>${p.eventTitle}</strong> — great news:`
    : `Thank you for expressing interest in <strong>${p.eventTitle}</strong> — great news:`;

  const interestNote = qty > 0
    ? para(`You let us know you were after about <strong>${qty} ticket${qty !== 1 ? "s" : ""}</strong> — secure them now before they&rsquo;re gone.`)
    : "";

  const content = [
    eyebrow("Tickets are live"),
    h1("Tickets just dropped! 🎉"),
    lead(`${greetLine} <strong>tickets are now on sale.</strong>`),
    banner,
    sectionTitle("The event"),
    eventPanel,
    urgency,
    button(p.buyUrl, "Get your tickets →"),
    interestNote,
    para("Tap the button above to choose your tickets and check out in under a minute. See you on the dance floor! 💃🕺"),
  ].join("");

  const html = renderEmail({
    preheader: `Tickets for ${p.eventTitle} just went on sale — grab yours before they sell out.`,
    contentHtml: content,
    // Recipients are on this event's interest list — give them a clean way out.
  });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `Thank you for expressing interest in ${p.eventTitle} — tickets are now ON SALE.`,
    "",
    "THE EVENT",
    `  ${p.eventTitle}`,
    artist ? `  Artist: ${artist}` : "",
    p.eventWhen ? `  When: ${p.eventWhen}` : "",
    p.eventWhere ? `  Where: ${p.eventWhere}` : "",
    "",
    qty > 0 ? `You asked about ~${qty} ticket${qty !== 1 ? "s" : ""}. Tickets are limited and move quickly — secure yours now:` : "Tickets are limited and move quickly — secure yours now:",
    p.buyUrl,
    "",
    "See you on the dance floor!",
    "",
    `— Rameelo (${EMAIL.site})`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
