import { renderEmail, eyebrow, h1, lead, para, button, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Sent to a group's creator right after they make a group link — gives them the
// link to share and explains how group orders work. Discounts are never
// hardcoded: the caller passes the actual discount from the event's ticket tier
// (or null), and we only mention discounts when one genuinely exists.
export function groupCreatedEmail(p: {
  hostName?: string | null;
  eventTitle: string;
  eventWhen: string;
  eventWhere: string;
  shareUrl: string;
  discount: { minQty: number; amount: string } | null;
}): { subject: string; html: string; text: string } {
  const name = (p.hostName ?? "").trim().split(" ")[0] || "there";
  const hasDiscount = !!p.discount;
  const subject = `Your group for ${p.eventTitle} is ready — share the link 🎉`;

  // How-it-works steps.
  const steps = [
    "Share your group link with friends (paste it anywhere — text, WhatsApp, Insta).",
    "Each person joins and adds the tickets they need — everyone gets their <strong>own ticket &amp; QR code</strong>.",
    hasDiscount
      ? `Once the group reaches <strong>${p.discount!.minQty} tickets</strong>, you unlock <strong>${p.discount!.amount}</strong> for everyone.`
      : "Watch your group page to see who&rsquo;s joined as the crew comes together.",
    "When you&rsquo;re ready, <strong>one person pays for the whole group</strong> in a single checkout — no splitting payments.",
  ];
  const stepsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${
    steps.map((s, i) => `<tr><td style="padding:0 0 12px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="34" style="vertical-align:top;"><div style="width:24px;height:24px;border-radius:999px;background:${C.aubergine};color:#fff;font-family:${FONT_HEAD};font-size:12px;font-weight:700;text-align:center;line-height:24px;">${i + 1}</div></td>
        <td style="vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.55;color:${C.inkMuted};padding-top:2px;">${s}</td>
      </tr></table>
    </td></tr>`).join("")
  }</table>`;

  // Link panel.
  const linkPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.inkMuted};">Your group link</p>
      <a href="${p.shareUrl}" style="font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${C.durga};word-break:break-all;">${p.shareUrl}</a>
    </td></tr></table>`;

  // Discount encouragement — only when the event's tier actually offers one.
  const discountPanel = hasDiscount ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;background:${C.peacock}14;border:1px solid ${C.peacock}33;border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.peacock};">The more, the merrier 💸</p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${C.ink};">
          Get <strong>${p.discount!.minQty} tickets</strong> in the group and everyone gets <strong style="color:${C.peacock};">${p.discount!.amount}</strong>. Rally the crew to hit the number!
        </p>
      </td></tr>
    </table>` : "";

  const content = [
    eyebrow("Group order created"),
    h1("Your group link is ready 🎉"),
    lead(`Hi ${name}, your group for <strong>${p.eventTitle}</strong> (${p.eventWhen}${p.eventWhere ? ` &middot; ${p.eventWhere}` : ""}) is all set. Share the link below so friends can join &mdash; everyone gets their own ticket, and one person pays for the whole group at checkout.`),
    linkPanel,
    button(p.shareUrl, "Open your group page"),
    discountPanel,
    divider(),
    sectionTitle("How group orders work"),
    stepsHtml,
    divider(),
    para("Round up the crew and let&rsquo;s dance. <strong style=\"color:#241C26;\">Garbe ki raat, Rameelo ke saath!</strong> 💃"),
  ].join("");

  const html = renderEmail({
    preheader: `Share your group link for ${p.eventTitle}${hasDiscount ? ` — hit ${p.discount!.minQty} tickets for ${p.discount!.amount}.` : "."}`,
    contentHtml: content,
  });

  const textLines = [
    `Hi ${name},`,
    "",
    `Your group for ${p.eventTitle} (${p.eventWhen}${p.eventWhere ? ` · ${p.eventWhere}` : ""}) is ready.`,
    "",
    `Share your group link: ${p.shareUrl}`,
    "",
    "How group orders work:",
    ...steps.map((s, i) => `  ${i + 1}. ${s.replace(/<[^>]+>/g, "")}`),
  ];
  if (hasDiscount) {
    textLines.push("", `Hit ${p.discount!.minQty} tickets in the group and everyone gets ${p.discount!.amount}.`);
  }
  textLines.push("", `Questions? ${EMAIL.support}`);

  return { subject, html, text: textLines.join("\n") };
}
