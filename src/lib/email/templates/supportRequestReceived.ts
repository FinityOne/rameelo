import { renderEmail, eyebrow, h1, lead, para, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Confirmation sent to the customer the moment they submit a support request, so
// they know they've been heard and have their reference number for follow-up.
export function supportRequestReceivedEmail(p: {
  name?: string | null;
  ref: string;
  issueLabel: string;
  reference?: string | null; // the customer's own order/reference, if provided
  description: string;
  submittedAt: string;
}): { subject: string; html: string; text: string } {
  const subject = `We've got your request — ${p.ref}`;
  const firstName = (p.name ?? "").trim().split(" ")[0];

  const rows: [string, string | null | undefined][] = [
    ["Reference", p.ref],
    ["Issue", p.issueLabel],
    ["Your reference", p.reference],
    ["Submitted", p.submittedAt],
  ];
  const detailRows = rows
    .filter(([, v]) => v && String(v).trim())
    .map(([label, v]) =>
      `<tr>
        <td style="padding:7px 0;vertical-align:top;width:120px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
        <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${String(v)}</td>
      </tr>`,
    ).join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
    </td></tr></table>`;

  const quote = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;">
    <tr><td style="padding:14px 18px;background:${C.white};border-left:3px solid ${C.marigold};border-top:1px solid ${C.ivory200};border-right:1px solid ${C.ivory200};border-bottom:1px solid ${C.ivory200};border-radius:0 12px 12px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.ink};">${p.description.replace(/\n/g, "<br>")}</td></tr></table>`;

  const content = [
    eyebrow("Support request received"),
    h1(firstName ? `Thanks, ${firstName} — we're on it` : "Thanks — we're on it"),
    lead(`We've received your request and our support team will get back to you soon, typically within <strong>1–2 business days</strong>. Keep your reference handy: <strong>${p.ref}</strong>.`),
    sectionTitle("Summary"),
    panel,
    sectionTitle("What you told us"),
    quote,
    divider(),
    para(`Need to add something? Just reply to this email and it'll be attached to your request. You can also reach us at <a href="mailto:${EMAIL.support}" style="color:${C.durga};font-weight:600;">${EMAIL.support}</a>.`),
  ].join("");

  const html = renderEmail({
    preheader: `Your request ${p.ref} is in — we'll be in touch within 1–2 business days.`,
    contentHtml: content,
  });

  const text = [
    `Thanks — we're on it`,
    "",
    `We've received your support request. We'll get back to you, typically within 1-2 business days.`,
    "",
    `Reference: ${p.ref}`,
    `Issue: ${p.issueLabel}`,
    p.reference ? `Your reference: ${p.reference}` : "",
    `Submitted: ${p.submittedAt}`,
    "",
    `What you told us:`,
    p.description,
    "",
    `Need to add something? Reply to this email or reach us at ${EMAIL.support}.`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
