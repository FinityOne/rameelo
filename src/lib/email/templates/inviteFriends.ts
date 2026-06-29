import { renderEmail, eyebrow, h1, lead, button } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";
import type { BlastEventData } from "./eventBlast";

// ── "Bring your crew" post-purchase reminder ─────────────────────────────────
// Sent to people who've ALREADY bought tickets to an event. It is NOT a sales
// push — they're already going. It (1) reminds them of the date/time/location so
// the night stays top-of-mind, (2) tells them how excited we are to do garba
// with them, and (3) nudges them to invite their friends, with one "Invite your
// friends" CTA pointing at the event page so their crew can grab tickets too.
//
// Reuses the same BlastEventData shape as the event-blast family, but only the
// at-a-glance card fields + url (no urgency/countdown — they're past that).

export function inviteFriendsEmail(p: {
  recipientFirstName?: string | null;
  event: BlastEventData;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const ev = p.event;
  const metro = (ev.metroCity ?? "").trim();
  const inMetro = metro ? ` in ${metro}` : "";

  const subject = first
    ? `${first}, who are you bringing to ${ev.title}? 💃`
    : `Who are you bringing to ${ev.title}? 💃`;
  const preheader = `You're all set for ${ev.title}${inMetro} — round up your crew so you can all be on the floor together.`;

  // Event-at-a-glance card (mirrors the eventBlast card so details look familiar).
  const eventCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;background:#fff;border:1px solid ${C.ivory200};border-radius:16px;overflow:hidden;">
    ${ev.bannerUrl ? `<tr><td style="padding:0;"><img src="${ev.bannerUrl}" alt="${ev.title}" width="560" style="width:100%;max-width:560px;height:auto;max-height:200px;display:block;border:0;object-fit:cover;" /></td></tr>` : ""}
    <tr><td style="padding:16px 18px;">
      ${ev.metroCity ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.marigoldDark};">📍 ${ev.metroCity}</p>` : ""}
      <p style="margin:0 0 ${ev.artistName ? 2 : 6}px;font-family:${FONT_HEAD};font-size:19px;font-weight:800;color:${C.ink};">${ev.title}</p>
      ${ev.artistName ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.aubergine};">🎤 ${ev.artistName}</p>` : ""}
      ${ev.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${ev.eventWhen}</p>` : ""}
      ${ev.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${ev.eventWhere}</p>` : ""}
    </td></tr>
  </table>`;

  const content = [
    eyebrow("You're going! 🎉"),
    h1("Bring your whole crew 💃🕺"),
    lead(`${first ? `Hi ${first}, you're` : "You're"} all set for <strong>${ev.title}</strong>${inMetro} — and honestly, we could not be more excited to do garba with you. Now for the best part: who are you bringing?`),
    eventCard,
    `<p style="margin:0 0 18px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${C.inkMuted};">Garba is always better with a full circle. Send this to your friends, your cousins, your roommates — anyone who loves to dance — so you can all be out there together. The best nights are the ones you spend with your people, and tickets are moving, so rope them in before they sell out.</p>`,
    button(ev.url, "Invite your friends →"),
    `<p style="margin:16px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkFaint};">Tap above, then share the event page with your crew so they can grab their tickets too.</p>`,
    `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${C.ink};">We can't wait to see you on the floor${inMetro} — let's make this one a night to remember. 💛</p>`,
  ].join("");

  const footer = `<p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you bought tickets through Rameelo.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({ preheader, contentHtml: content + footer });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `You're all set for ${ev.title}${inMetro} — and we can't wait to do garba with you!`,
    "",
    ev.eventWhen ? `When: ${ev.eventWhen}` : "",
    ev.eventWhere ? `Where: ${ev.eventWhere}` : "",
    ev.artistName ? `Featuring: ${ev.artistName}` : "",
    "",
    "Garba is always better with a full circle. Invite your friends, cousins, and roommates so you can all be on the floor together — tickets are moving, so rope them in before they sell out.",
    "",
    `Invite your friends: ${ev.url}`,
    "",
    "We can't wait to see you there. 💛",
    "",
    `Unsubscribe from marketing emails: ${p.unsubscribeUrl}`,
    `— Rameelo (${EMAIL.site})`,
  ].filter(s => s !== "").join("\n");

  return { subject, html, text };
}
