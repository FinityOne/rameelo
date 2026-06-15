import { renderEmail, eyebrow, h1, lead, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal admin notification when someone registers a Rameelo account. Lists the
// new member's contact details so an admin can reach out directly from the email.
export function newUserSignupEmail(p: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  role?: string | null;
  registeredAt: string;
}): { subject: string; html: string; text: string } {
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "New member";
  const location = [p.city, p.state].filter(s => s && String(s).trim()).join(", ");
  const subject = `New Rameelo signup — ${fullName}`;

  const rows: [string, string | null | undefined][] = [
    ["Name", fullName],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Location", location],
    ["Role", p.role && p.role !== "user" ? p.role : "Member"],
    ["Registered", p.registeredAt],
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
      <a href="mailto:${p.email}?subject=${encodeURIComponent("Welcome to Rameelo!")}" style="display:inline-block;padding:11px 22px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Reach out to ${p.firstName || "them"}</a>
    </td></tr></table>`;

  const content = [
    eyebrow("New member"),
    h1("New account created 🎉"),
    lead(`<strong>${fullName}</strong> just registered on Rameelo. Their details:`),
    sectionTitle("Member details"),
    panel,
    replyBtn,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${fullName} just signed up${location ? ` · ${location}` : ""}.`,
    contentHtml: content,
  });

  const text = [
    `New Rameelo signup — ${fullName}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    "",
    `Reach out: ${p.email}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].join("\n");

  return { subject, html, text };
}
