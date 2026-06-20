import { renderEmail, eyebrow, h1, lead, divider, sectionTitle, button } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal alert to platform admins when a support request comes in. Includes
// every detail EXCEPT the uploaded file — admins view that securely in the portal.
export function supportRequestAdminEmail(p: {
  ref: string;
  name?: string | null;
  email: string;
  issueLabel: string;
  reference?: string | null;
  description: string;
  hasAttachment: boolean;
  submittedAt: string;
  manageUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `New support request — ${p.issueLabel} (${p.ref})`;

  const rows: [string, string | null | undefined][] = [
    ["Reference", p.ref],
    ["Issue", p.issueLabel],
    ["From", p.name || "—"],
    ["Email", p.email],
    ["Their reference", p.reference],
    ["Attachment", p.hasAttachment ? "Yes — view in the admin portal" : "None"],
    ["Submitted", p.submittedAt],
  ];
  const detailRows = rows
    .filter(([, v]) => v && String(v).trim())
    .map(([label, v]) =>
      `<tr>
        <td style="padding:7px 0;vertical-align:top;width:130px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
        <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${String(v)}</td>
      </tr>`,
    ).join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
    </td></tr></table>`;

  const quote = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
    <tr><td style="padding:14px 18px;background:${C.white};border-left:3px solid ${C.durga};border-top:1px solid ${C.ivory200};border-right:1px solid ${C.ivory200};border-bottom:1px solid ${C.ivory200};border-radius:0 12px 12px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.ink};">${p.description.replace(/\n/g, "<br>")}</td></tr></table>`;

  const content = [
    eyebrow("New support request"),
    h1("Someone needs a hand 🙋"),
    lead(`A new request just came in via the Help Center. Open it in the admin portal to respond and manage its status.`),
    sectionTitle("Details"),
    panel,
    sectionTitle("Their message"),
    quote,
    button(p.manageUrl, "Manage this request", "primary"),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${p.issueLabel} — ${p.name || p.email}`,
    contentHtml: content,
  });

  const text = [
    `New support request — ${p.ref}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    "",
    `Their message:`,
    p.description,
    "",
    `Manage: ${p.manageUrl}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].join("\n");

  return { subject, html, text };
}
