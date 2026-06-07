import { renderEmail, eyebrow, h1, lead, para, button, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Sent to each group member (other than the purchaser) once someone in their
// group has paid for everyone. They click through to claim their tickets by
// signing in or creating an account on the address this email was sent to.
export function groupTicketClaimEmail(p: {
  recipientName?: string | null;
  buyerName: string;
  eventTitle: string;
  eventWhen: string;
  eventWhere: string;
  qty: number;
  claimUrl: string;
}): { subject: string; html: string; text: string } {
  const name = (p.recipientName ?? "").trim().split(" ")[0] || "there";
  const buyer = (p.buyerName ?? "").trim() || "Someone in your group";
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `${buyer} got your ${ticketWord} for ${p.eventTitle} — claim them 🎟️`;

  // Event summary panel.
  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:16px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">${p.eventWhere}</p>` : ""}
      <p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${C.peacock};">${p.qty} ${ticketWord} reserved for you</p>
    </td></tr></table>`;

  const steps = [
    "Tap the button below to open your tickets.",
    "Sign in — or create a free account — using <strong>this email address</strong>.",
    `Your ${p.qty} ${ticketWord} drop straight into your Rameelo wallet with a scannable QR code.`,
  ];
  const stepsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${
    steps.map((s, i) => `<tr><td style="padding:0 0 10px;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.55;color:${C.inkMuted};">
      <strong style="color:${C.ink};">${i + 1}.</strong> ${s}</td></tr>`).join("")
  }</table>`;

  const content = [
    eyebrow("Your group tickets are ready"),
    h1("Claim your tickets 🎟️"),
    lead(`Hi ${name}, <strong>${buyer}</strong> paid for the whole group and reserved <strong>${p.qty} ${ticketWord}</strong> for you. Claim them so they&rsquo;re in your wallet for the big night.`),
    eventPanel,
    button(p.claimUrl, `Claim my ${ticketWord}`),
    divider(),
    sectionTitle("How to claim"),
    stepsHtml,
    divider(),
    para("See you on the dance floor. <strong style=\"color:#241C26;\">Garbe ki raat, Rameelo ke saath!</strong> 💃"),
  ].join("");

  const html = renderEmail({
    preheader: `${buyer} reserved ${p.qty} ${ticketWord} for you at ${p.eventTitle} — claim them now.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${name},`,
    "",
    `${buyer} paid for the whole group and reserved ${p.qty} ${ticketWord} for you at ${p.eventTitle}${p.eventWhen ? ` (${p.eventWhen})` : ""}.`,
    "",
    `Claim your ${ticketWord}: ${p.claimUrl}`,
    "",
    "Sign in or create a free account using this email address and your tickets land in your Rameelo wallet.",
    "",
    `Questions? ${EMAIL.support}`,
  ].join("\n");

  return { subject, html, text };
}
