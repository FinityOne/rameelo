import { renderEmail, eyebrow, h1, lead, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// ── "Events near you" digest ─────────────────────────────────────────────────
// A location-aware blast: each recipient gets the soonest upcoming events in
// their own state/metro (resolved per-recipient in the send route). Built for the
// giveaway-leads campaign — turn an entrant into a buyer by showing the garba
// closest to them. Lists up to a few events, each with date/venue/from-price and
// its own "Get tickets" link, plus a single browse-all CTA.

export type NearbyEventItem = {
  title: string;
  metroCity?: string | null;
  eventWhen: string;
  eventWhere: string;
  fromPrice?: number | null;
  bannerUrl?: string | null;
  url: string;
};

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;

export function nearbyEventsEmail(p: {
  recipientFirstName?: string | null;
  locationLabel?: string | null; // e.g. "New Jersey" — null → generic "near you"
  events: NearbyEventItem[];
  browseUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const where = (p.locationLabel ?? "").trim();
  const whereInline = where ? ` in ${where}` : " near you";
  const lead0 = p.events[0];

  const subject = p.events.length > 1
    ? `🎟️ Garba${whereInline}: ${lead0.title} & ${p.events.length - 1} more`
    : `🎟️ ${lead0.title} — garba${whereInline}`;

  const preheader = `Upcoming Garba & Dandiya nights${whereInline}${lead0.fromPrice != null ? ` from ${money(lead0.fromPrice)}` : ""} — grab tickets before they sell out.`;

  const card = (ev: NearbyEventItem) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;background:#fff;border:1px solid ${C.ivory200};border-radius:16px;overflow:hidden;">
    ${ev.bannerUrl ? `<tr><td style="padding:0;"><img src="${ev.bannerUrl}" alt="${ev.title}" width="560" style="width:100%;max-width:560px;height:auto;max-height:180px;display:block;border:0;object-fit:cover;" /></td></tr>` : ""}
    <tr><td style="padding:16px 18px;">
      ${ev.metroCity ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.marigoldDark};">📍 ${ev.metroCity}</p>` : ""}
      <p style="margin:0 0 6px;font-family:${FONT_HEAD};font-size:18px;font-weight:800;color:${C.ink};">${ev.title}</p>
      ${ev.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${ev.eventWhen}</p>` : ""}
      ${ev.eventWhere ? `<p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${ev.eventWhere}</p>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border-radius:11px;background:${C.marigold};">
          <a href="${ev.url}" target="_blank" style="display:inline-block;padding:9px 18px;font-family:${FONT_HEAD};font-size:13px;font-weight:700;color:${C.aubergine};text-decoration:none;border-radius:11px;">${ev.fromPrice != null ? `Get tickets · from ${money(ev.fromPrice)}` : "Get tickets"} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>
  </table>`;

  const content = [
    eyebrow(where ? `Happening in ${where}` : "Happening near you"),
    h1(p.events.length > 1 ? "Garba nights near you 🪔" : "A garba night near you 🪔"),
    lead(`${first ? `Hi ${first} — t` : "T"}hanks for entering our giveaway! Here ${p.events.length > 1 ? "are the upcoming Garba & Dandiya nights" : "is an upcoming Garba night"}${whereInline}. Spots go fast — grab your tickets while they last. 💃`),
    sectionTitle(p.events.length > 1 ? "Upcoming near you" : "Up next near you"),
    p.events.map(card).join(""),
    button(p.browseUrl, "Browse all events →"),
    `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.inkMuted};">Win or not, the floor is calling. See you out there. 🕺</p>`,
  ].join("");

  const footer = `<p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you entered a Rameelo giveaway.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({ preheader, contentHtml: content + footer });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `Thanks for entering our giveaway! Here ${p.events.length > 1 ? "are upcoming Garba & Dandiya nights" : "is an upcoming Garba night"}${whereInline}:`,
    "",
    ...p.events.map(ev => [
      `• ${ev.title}${ev.metroCity ? ` (${ev.metroCity})` : ""}`,
      ev.eventWhen ? `  When: ${ev.eventWhen}` : "",
      ev.eventWhere ? `  Where: ${ev.eventWhere}` : "",
      `  Tickets${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""}: ${ev.url}`,
    ].filter(Boolean).join("\n")),
    "",
    `Browse all events: ${p.browseUrl}`,
    "",
    `Unsubscribe from marketing emails: ${p.unsubscribeUrl}`,
    `— Rameelo (${EMAIL.site})`,
  ].filter(s => s !== "").join("\n");

  return { subject, html, text };
}
