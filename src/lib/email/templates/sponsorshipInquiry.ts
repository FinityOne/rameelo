import { renderEmail, eyebrow, h1, lead, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal admin notification when someone submits the /sponsor form. Lists every
// field so an admin can act without opening the dashboard.
export function sponsorshipInquiryEmail(p: {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  goals?: string | null;
  budget?: string | null;
  message?: string | null;
  submittedAt: string;
}): { subject: string; html: string; text: string } {
  const subject = `New sponsorship inquiry — ${p.businessName}`;

  const rows: [string, string | null | undefined][] = [
    ["Business", p.businessName],
    ["Contact", p.contactName],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Website", p.website],
    ["Industry", p.category],
    ["Budget", p.budget],
    ["Looking for", p.goals],
    ["Message", p.message],
    ["Submitted", p.submittedAt],
  ];

  const detailRows = rows
    .filter(([, v]) => v && String(v).trim())
    .map(([label, v]) =>
      `<tr>
        <td style="padding:7px 0;vertical-align:top;width:110px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
        <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${String(v).replace(/\n/g, "<br>")}</td>
      </tr>`
    ).join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
    </td></tr></table>`;

  const replyBtn = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;"><tr>
    <td style="border-radius:10px;background:${C.aubergine};">
      <a href="mailto:${p.email}?subject=${encodeURIComponent("Re: Sponsoring Rameelo")}" style="display:inline-block;padding:11px 22px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Reply to ${p.contactName.split(" ")[0]}</a>
    </td></tr></table>`;

  const content = [
    eyebrow("Sponsorship inquiry"),
    h1("New sponsorship inquiry 📣"),
    lead(`<strong>${p.businessName}</strong> just submitted the sponsor form. Here are all the details:`),
    sectionTitle("Details"),
    panel,
    replyBtn,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${p.businessName} wants to sponsor Rameelo${p.budget ? ` · ${p.budget}` : ""}.`,
    contentHtml: content,
  });

  const text = [
    `New sponsorship inquiry — ${p.businessName}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    "",
    `Reply: ${p.email}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].join("\n");

  return { subject, html, text };
}
