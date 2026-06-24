import { renderEmail, eyebrow, h1, lead, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal admin notification when someone enters a promotion/giveaway. Basic —
// just lets admins know a new entry came in, with the contact details and a
// running total. Mirrors the sponsorship-inquiry admin alert.
export function promotionEntryEmail(p: {
  promotionName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  entryCount?: number | null;
  enteredAt: string;
}): { subject: string; html: string; text: string } {
  const fullName = `${p.firstName} ${p.lastName}`.trim();
  const location = [p.city, p.state].filter(Boolean).join(", ");
  const subject = `🎟️ New giveaway entry — ${fullName} (${p.promotionName})`;

  const rows: [string, string | null | undefined][] = [
    ["Name", fullName],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Location", location],
    ["Promotion", p.promotionName],
    ["Entered", p.enteredAt],
  ];

  const detailRows = rows
    .filter(([, v]) => v && String(v).trim())
    .map(([label, v]) =>
      `<tr>
        <td style="padding:7px 0;vertical-align:top;width:110px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
        <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${String(v)}</td>
      </tr>`
    ).join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
    </td></tr></table>`;

  const totalLine = p.entryCount
    ? `<p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">This promotion now has <strong style="color:${C.ink};">${p.entryCount}</strong> total ${p.entryCount === 1 ? "entry" : "entries"}.</p>`
    : "";

  const viewBtn = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;"><tr>
    <td style="border-radius:10px;background:${C.aubergine};">
      <a href="${EMAIL.site}/admin/promotions" style="display:inline-block;padding:11px 22px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View entries in admin</a>
    </td></tr></table>`;

  const content = [
    eyebrow("Promotion entry"),
    h1("New giveaway entry 🎟️"),
    lead(`<strong>${fullName}</strong> just entered <strong>${p.promotionName}</strong>.`),
    sectionTitle("Details"),
    panel,
    totalLine,
    viewBtn,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${fullName} entered ${p.promotionName}${location ? ` · ${location}` : ""}.`,
    contentHtml: content,
  });

  const text = [
    `New giveaway entry — ${p.promotionName}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    p.entryCount ? `\nTotal entries: ${p.entryCount}` : "",
    "",
    `View entries: ${EMAIL.site}/admin/promotions`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
