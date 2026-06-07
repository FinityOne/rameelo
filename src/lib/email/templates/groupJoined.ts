import { renderEmail, eyebrow, h1, lead, para, button } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Basic heads-up to the group host when someone joins their group link.
// Keeps it simple: who joined, which event, and a button to the group page.
export function groupJoinedEmail(p: {
  hostName?: string | null;
  joinerName: string;
  qty: number;
  eventTitle: string;
  eventWhen: string;
  eventWhere: string;
  memberCount: number;
  groupUrl: string;
}): { subject: string; html: string; text: string } {
  const host = (p.hostName ?? "").trim().split(" ")[0] || "there";
  const joiner = (p.joinerName ?? "").trim() || "Someone";
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `${joiner} joined your group for ${p.eventTitle} 🎉`;

  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${p.eventWhere}</p>` : ""}
    </td></tr></table>`;

  const content = [
    eyebrow("New group member"),
    h1(`${joiner} is in! 🎉`),
    lead(`Hi ${host}, <strong>${joiner}</strong> just joined your group with <strong>${p.qty} ${ticketWord}</strong>. Your group now has <strong>${p.memberCount} ${p.memberCount === 1 ? "person" : "people"}</strong>.`),
    eventPanel,
    button(p.groupUrl, "View your group"),
    para("When everyone&rsquo;s in, one person checks out and covers the whole group. Keep sharing your link to fill it up!"),
  ].join("");

  const html = renderEmail({
    preheader: `${joiner} joined your group for ${p.eventTitle}.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${host},`,
    "",
    `${joiner} just joined your group for ${p.eventTitle}${p.eventWhen ? ` (${p.eventWhen})` : ""} with ${p.qty} ${ticketWord}.`,
    `Your group now has ${p.memberCount} ${p.memberCount === 1 ? "person" : "people"}.`,
    "",
    `View your group: ${p.groupUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
