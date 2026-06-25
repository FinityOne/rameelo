import { renderEmail, eyebrow, h1, lead, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal admin alert when someone submits the interest ("notify me") form on an
// event that isn't selling tickets on Rameelo yet. Lets admins see, in one glance,
// which not-yet-live events are getting traction — with the submitter's details and
// a running interest total. Mirrors the promotion-entry / sponsorship-inquiry alerts.
export function eventInterestNotificationEmail(p: {
  name: string;
  email: string;
  phone?: string | null;
  qtyInterested?: number | null;
  city?: string | null;
  message?: string | null;
  eventTitle: string;
  eventWhen: string;
  eventWhere?: string | null;
  eventId: string;
  interestCount?: number | null;
  submittedAt: string;
}): { subject: string; html: string; text: string } {
  const name = p.name.trim() || "Someone";
  const qtyLabel = p.qtyInterested
    ? `${p.qtyInterested} ticket${p.qtyInterested === 1 ? "" : "s"}`
    : null;
  const subject = `🎟️ New interest — ${name} for ${p.eventTitle}`;

  const rows: [string, string | null | undefined][] = [
    ["Name", name],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Their city", p.city],
    ["Wants", qtyLabel],
    ["Message", p.message],
    ["Submitted", p.submittedAt],
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

  const where = p.eventWhere ? ` · ${p.eventWhere}` : "";
  const eventLine = `<p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">Event: <strong style="color:${C.ink};">${p.eventTitle}</strong> — ${p.eventWhen}${where}</p>`;

  const totalLine = p.interestCount
    ? `<p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">This event now has <strong style="color:${C.ink};">${p.interestCount}</strong> total interest signup${p.interestCount === 1 ? "" : "s"}.</p>`
    : "";

  const viewBtn = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;"><tr>
    <td style="border-radius:10px;background:${C.aubergine};">
      <a href="${EMAIL.site}/admin/events/${p.eventId}" style="display:inline-block;padding:11px 22px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View event in admin</a>
    </td></tr></table>`;

  const content = [
    eyebrow("Event interest"),
    h1("New interest signup 🎟️"),
    lead(`<strong>${name}</strong> just registered interest in <strong>${p.eventTitle}</strong>, which isn't selling on Rameelo yet.`),
    eventLine,
    sectionTitle("Details"),
    panel,
    totalLine,
    viewBtn,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${name} is interested in ${p.eventTitle}${qtyLabel ? ` · ${qtyLabel}` : ""}.`,
    contentHtml: content,
  });

  const text = [
    `New interest signup — ${p.eventTitle}`,
    `${p.eventWhen}${where}`,
    "",
    ...rows.filter(([, v]) => v && String(v).trim()).map(([label, v]) => `${label}: ${v}`),
    p.interestCount ? `\nTotal interest signups: ${p.interestCount}` : "",
    "",
    `View event: ${EMAIL.site}/admin/events/${p.eventId}`,
    "",
    `— Rameelo (${EMAIL.site})`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
