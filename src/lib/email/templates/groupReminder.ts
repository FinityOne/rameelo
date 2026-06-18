import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// "Keep your group going" reminder — nudges a group member to invite more people,
// with their group's live progress, the event details, an (optional) discount goal,
// and ONE clear CTA to the group page. Designed to drive invites + excitement.
export function groupReminderEmail(p: {
  recipientFirstName?: string | null;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  metroCity?: string | null;
  bannerUrl?: string | null;
  members: number;          // people currently in the group
  targetSize: number;       // the group's headcount goal
  tickets: number;          // tickets currently in the group
  groupUrl: string;
  // Discount goal (from the event's tier), when this group hasn't unlocked it yet.
  discount?: { amount: string; needMore: number } | null;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const target = Math.max(p.targetSize, p.members, 1);
  const pct = Math.min(100, Math.round((p.members / target) * 100));
  const remaining = Math.max(0, target - p.members);

  const subject = p.discount && p.discount.needMore > 0
    ? `Invite ${p.discount.needMore} more & unlock ${p.discount.amount} — ${p.eventTitle}`
    : `Your group for ${p.eventTitle} — invite a few more! 🎉`;

  // Event-at-a-glance with banner.
  const banner = p.bannerUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td style="border-radius:14px;overflow:hidden;">
        <img src="${p.bannerUrl}" alt="${p.eventTitle}" width="520" style="width:100%;max-width:520px;height:auto;max-height:170px;display:block;border:0;object-fit:cover;border-radius:14px;" /></td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td style="background:${C.aubergine};border-radius:14px;padding:22px 18px;text-align:center;">
        <p style="margin:0;font-family:${FONT_HEAD};font-size:17px;font-weight:800;color:${C.white};">${p.eventTitle}</p></td></tr></table>`;

  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;"><tr><td style="padding:16px 18px;">
    ${p.metroCity ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.marigoldDark};">📍 ${p.metroCity}</p>` : ""}
    <p style="margin:0 0 ${p.artistName ? 2 : 6}px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
    ${p.artistName ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${p.artistName}</p>` : ""}
    ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
    ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
  </td></tr></table>`;

  // Progress bar (table-based for email clients).
  const progress = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0;background:#fff;border:1px solid ${C.ivory200};border-radius:14px;"><tr><td style="padding:16px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">${p.members} of ${target} in your group</td>
      <td align="right" style="font-family:${FONT_HEAD};font-size:13px;font-weight:800;color:${C.peacock};">${pct}%</td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
      <td style="background:${C.ivory200};border-radius:99px;height:8px;line-height:8px;font-size:0;">
        <table role="presentation" width="${Math.max(pct, 4)}%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.peacock};border-radius:99px;height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr></table>
      </td></tr></table>
    <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${p.tickets} ticket${p.tickets !== 1 ? "s" : ""} reserved so far${remaining > 0 ? ` · <strong style="color:${C.ink};">${remaining} more to hit your goal</strong>` : " · 🎯 goal reached!"}</p>
  </td></tr></table>`;

  // Discount goal callout.
  const discountBlock = p.discount && p.discount.needMore > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0;background:${C.marigold}14;border:1px solid ${C.marigold}40;border-radius:14px;"><tr><td style="padding:14px 16px;text-align:center;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">🎁 Invite <span style="color:${C.marigoldDark};">${p.discount.needMore} more</span> and your whole group saves <span style="color:${C.marigoldDark};">${p.discount.amount}</span>!</p>
      </td></tr></table>`
    : "";

  const content = [
    eyebrow("Your group"),
    h1("Keep the crew growing! 🪩"),
    lead(`${first ? `Hi ${first}, y` : "Y"}our group for <strong>${p.eventTitle}</strong> is coming together — invite a few more friends to lock it in${p.discount && p.discount.needMore > 0 ? " and unlock the group discount" : ""}.`),
    banner,
    progress,
    discountBlock,
    button(p.groupUrl, "Invite more to your group →"),
    para("Tap the button, then share your group link with friends and family. The more who join, the better the night — and the bigger the savings."),
    sectionTitle("The event"),
    eventPanel,
  ].join("");

  const html = renderEmail({
    preheader: p.discount && p.discount.needMore > 0
      ? `Invite ${p.discount.needMore} more to unlock ${p.discount.amount} for ${p.eventTitle}.`
      : `Your group for ${p.eventTitle} — invite more friends to join.`,
    contentHtml: content,
  });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `Your group for ${p.eventTitle} is at ${p.members} of ${target} (${pct}%), ${p.tickets} ticket${p.tickets !== 1 ? "s" : ""} so far.`,
    p.discount && p.discount.needMore > 0 ? `Invite ${p.discount.needMore} more to unlock ${p.discount.amount} for the whole group!` : "",
    "",
    `Invite more to your group: ${p.groupUrl}`,
    "",
    "THE EVENT",
    `  ${p.eventTitle}${p.artistName ? ` · ${p.artistName}` : ""}`,
    p.eventWhen ? `  ${p.eventWhen}` : "",
    p.eventWhere ? `  ${p.eventWhere}` : "",
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
