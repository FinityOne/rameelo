// ── Rameelo email layout ─────────────────────────────────────────────────────
// The ONE core shell every email uses: marigold top bar → aubergine header with
// logo → white content card → footer. Templates compose the body from the block
// helpers below (eyebrow/h1/lead/para/button/actionCard/…). This keeps emails
// consistent and easy to extend — add a template, reuse these pieces.

import { C, FONT_HEAD, FONT_BODY, EMAIL } from "./theme";

// ── Block helpers ────────────────────────────────────────────────────────────
export const eyebrow = (text: string) =>
  `<p style="margin:0 0 10px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.marigoldDark};">${text}</p>`;

export const h1 = (text: string) =>
  `<h1 class="h1" style="margin:0 0 16px;font-family:${FONT_HEAD};font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-0.5px;color:${C.ink};">${text}</h1>`;

export const lead = (text: string) =>
  `<p style="margin:0 0 22px;font-family:${FONT_BODY};font-size:16px;line-height:1.65;color:${C.ink};">${text}</p>`;

export const para = (text: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${C.inkMuted};">${text}</p>`;

export const sectionTitle = (text: string) =>
  `<p style="margin:0 0 14px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.inkMuted};">${text}</p>`;

export const divider = () =>
  `<div style="height:1px;line-height:1px;background:${C.ivory200};margin:28px 0;">&nbsp;</div>`;

export const spacer = (h = 16) =>
  `<div style="height:${h}px;line-height:${h}px;">&nbsp;</div>`;

export function button(href: string, label: string, variant: "primary" | "secondary" = "primary"): string {
  const bg = variant === "primary" ? C.marigold : C.aubergine;
  const fg = variant === "primary" ? C.aubergine : C.white;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" style="border-radius:14px;background:${bg};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT_HEAD};font-size:15px;font-weight:700;color:${fg};text-decoration:none;border-radius:14px;">${label}</a>
    </td></tr></table>`;
}

/** A bordered "thing you can do" panel: emoji + title + description + a link. */
export function actionCard(emoji: string, title: string, desc: string, href: string, cta: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="52" style="vertical-align:top;">
          <div style="width:40px;height:40px;border-radius:12px;background:${C.white};border:1px solid ${C.ivory200};text-align:center;font-size:20px;line-height:40px;">${emoji}</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <p style="margin:0 0 3px;font-family:${FONT_HEAD};font-size:15px;font-weight:700;color:${C.ink};">${title}</p>
          <p style="margin:0 0 9px;font-family:${FONT_BODY};font-size:13px;line-height:1.55;color:${C.inkMuted};">${desc}</p>
          <a href="${href}" target="_blank" style="font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.durga};text-decoration:none;">${cta} &rarr;</a>
        </td>
      </tr></table>
    </td></tr></table>`;
}

// ── Core shell ───────────────────────────────────────────────────────────────
export function renderEmail({ preheader = "", contentHtml }: { preheader?: string; contentHtml: string }): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Rameelo</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin:0; padding:0; background:${C.ivory}; -webkit-text-size-adjust:100%; }
    a { text-decoration:none; }
    @media only screen and (max-width:620px) {
      .px { padding-left:24px !important; padding-right:24px !important; }
      .h1 { font-size:26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.ivory};font-family:${FONT_BODY};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ivory};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <!-- marigold accent bar -->
        <tr><td style="height:5px;line-height:5px;background:${C.marigold};border-radius:18px 18px 0 0;">&nbsp;</td></tr>
        <!-- header -->
        <tr><td class="px" style="background:${C.aubergine};padding:24px 40px;text-align:center;">
          <img src="${EMAIL.logoWhite}" alt="Rameelo" height="26" style="height:26px;display:inline-block;border:0;outline:none;text-decoration:none;" />
        </td></tr>
        <!-- content -->
        <tr><td class="px" style="background:${C.white};padding:40px;border-left:1px solid ${C.ivory200};border-right:1px solid ${C.ivory200};">
          ${contentHtml}
        </td></tr>
        <!-- footer -->
        <tr><td class="px" style="background:${C.white};padding:0 40px 36px;border-left:1px solid ${C.ivory200};border-right:1px solid ${C.ivory200};border-bottom:1px solid ${C.ivory200};border-radius:0 0 18px 18px;">
          <div style="border-top:1px solid ${C.ivory200};padding-top:24px;text-align:center;">
            <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${C.inkMuted};">
              Questions? Just reply to this email, or reach us at
              <a href="mailto:${EMAIL.support}" style="color:${C.durga};font-weight:600;">${EMAIL.support}</a>.
            </p>
            <p style="margin:0;font-family:${FONT_BODY};font-size:11px;color:${C.inkFaint};">
              &copy; ${year} Rameelo &middot; The home for Raas Garba in America
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
