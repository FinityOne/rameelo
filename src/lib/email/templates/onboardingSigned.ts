import { renderEmail, eyebrow, h1, lead, button, sectionTitle, divider } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";

// Internal alert to every platform admin when an organizer completes onboarding
// and signs the Rameelo Organizer Agreement. It's a record, not a marketing
// email: who signed, when, the agreement version they bound, and the key facts
// from their submission so an admin can review and follow up in one place.
export function onboardingSignedEmail(p: {
  orgName: string;
  signedBy?: string | null;        // typed signature on the agreement
  submittedBy?: string | null;     // name they entered as the submitter
  contactName?: string | null;     // primary contact
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  description?: string | null;
  foundedYear?: string | null;
  city?: string | null;
  state?: string | null;
  eventsCount: number;
  documentsCount: number;
  agreementVersion?: string | null;
  signedAt: string;                // human-formatted date/time
  orgUrl: string;                  // /admin/organizations/[id]
}): { subject: string; html: string; text: string } {
  const signer = (p.signedBy ?? "").trim() || (p.submittedBy ?? "").trim() || "an authorized representative";
  const location = [p.city, p.state].filter(Boolean).join(", ");
  const subject = `✍️ ${p.orgName} signed the Organizer Agreement`;

  // A label/value row — only renders when there's a value.
  const row = (label: string, value?: string | null) =>
    value && value.trim()
      ? `<tr>
          <td style="padding:7px 0;vertical-align:top;width:42%;font-family:${FONT_BODY};font-size:12px;color:${C.inkMuted};">${label}</td>
          <td style="padding:7px 0;vertical-align:top;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.ink};">${value}</td>
        </tr>`
      : "";

  const signaturePanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.peacock}0F;border:1px solid ${C.peacock}40;border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${C.ink};">✅ Agreement signed</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.inkMuted};">
        Signed by <strong>${signer}</strong> on <strong>${p.signedAt}</strong>${p.agreementVersion ? ` · Agreement v${p.agreementVersion}` : ""}.
      </p>
    </td></tr></table>`;

  const detailPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:6px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row("Organization", p.orgName)}
        ${row("Primary contact", p.contactName)}
        ${row("Submitted by", p.submittedBy)}
        ${row("Email", p.email)}
        ${row("Phone", p.phone)}
        ${row("Website", p.website)}
        ${row("Instagram", p.instagram)}
        ${row("Facebook", p.facebook)}
        ${row("Location", location)}
        ${row("Founded", p.foundedYear)}
        ${row("Events in submission", String(p.eventsCount))}
        ${row("Documents uploaded", String(p.documentsCount))}
      </table>
    </td></tr></table>`;

  const aboutPanel = p.description && p.description.trim()
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.white};border:1px solid ${C.ivory200};border-radius:14px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0 0 5px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">About the organization</p>
          <p style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${C.ink};">${p.description}</p>
        </td></tr></table>`
    : "";

  const content = [
    eyebrow("Organizer onboarding"),
    h1("An organizer signed the agreement"),
    lead(`<strong>${p.orgName}</strong> just completed onboarding and signed the Rameelo Organizer Agreement. Here are the details from their submission.`),
    signaturePanel,
    sectionTitle("Submission details"),
    detailPanel,
    aboutPanel,
    button(p.orgUrl, "Review in admin"),
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${p.orgName} signed the Organizer Agreement — signed by ${signer} on ${p.signedAt}.`,
    contentHtml: content,
  });

  const text = [
    `${p.orgName} signed the Rameelo Organizer Agreement.`,
    "",
    `Signed by: ${signer}`,
    `Signed at: ${p.signedAt}`,
    p.agreementVersion ? `Agreement version: v${p.agreementVersion}` : "",
    "",
    "SUBMISSION DETAILS",
    `  Organization: ${p.orgName}`,
    p.contactName ? `  Primary contact: ${p.contactName}` : "",
    p.submittedBy ? `  Submitted by: ${p.submittedBy}` : "",
    p.email ? `  Email: ${p.email}` : "",
    p.phone ? `  Phone: ${p.phone}` : "",
    p.website ? `  Website: ${p.website}` : "",
    p.instagram ? `  Instagram: ${p.instagram}` : "",
    p.facebook ? `  Facebook: ${p.facebook}` : "",
    location ? `  Location: ${location}` : "",
    p.foundedYear ? `  Founded: ${p.foundedYear}` : "",
    `  Events in submission: ${p.eventsCount}`,
    `  Documents uploaded: ${p.documentsCount}`,
    p.description ? `\nABOUT\n  ${p.description}` : "",
    "",
    `Review in admin: ${p.orgUrl}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
