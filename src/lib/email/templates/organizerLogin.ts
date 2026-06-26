import { renderEmail, eyebrow, h1, lead, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal admin alert fired when an ORGANIZER signs in to the platform. Lists who
// signed in, the organization(s) they belong to, a 30-day login count, and a link
// to their admin detail page — so admins have a live pulse on organizer activity.
export function organizerLoginEmail(p: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  orgs?: string[] | null;
  loginCount30d?: number | null;
  signedInAt: string;
}): { subject: string; html: string; text: string } {
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "An organizer";
  const orgList = (p.orgs ?? []).filter(Boolean).join(", ");
  const subject = `Organizer signed in — ${fullName}`;

  const rows: [string, string | null | undefined][] = [
    ["Name", fullName],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Organization", orgList],
    ["Logins (30d)", p.loginCount30d != null ? String(p.loginCount30d) : null],
    ["Signed in", p.signedInAt],
  ];

  const detailRows = rows
    .filter(([, v]) => v && String(v).trim())
    .map(([label, v]) =>
      `<tr>
        <td style="padding:7px 0;vertical-align:top;width:120px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</td>
        <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.ink};">${String(v).replace(/\n/g, "<br>")}</td>
      </tr>`
    ).join("");

  const panel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:8px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
    </td></tr></table>`;

  const profileUrl = `${EMAIL.site}/admin/users/${p.userId}`;
  const viewBtn = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;"><tr>
    <td style="border-radius:10px;background:${C.aubergine};">
      <a href="${profileUrl}" style="display:inline-block;padding:11px 22px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View organizer in admin</a>
    </td></tr></table>`;

  const content = [
    eyebrow("Organizer activity"),
    h1("An organizer just signed in"),
    lead(`<strong>${fullName}</strong>${orgList ? ` (${orgList})` : ""} signed in to Rameelo. Their details:`),
    sectionTitle("Organizer details"),
    panel,
    viewBtn,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${fullName} signed in${orgList ? ` · ${orgList}` : ""}.`,
    contentHtml: content,
  });

  const text = [
    `Organizer signed in — ${fullName}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    "",
    `View in admin: ${profileUrl}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].join("\n");

  return { subject, html, text };
}
