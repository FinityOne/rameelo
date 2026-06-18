import { renderEmail, eyebrow, h1, lead, para, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Admin marketing blast: a custom message wrapped around a featured upcoming event,
// nudging the recipient to buy tickets. Includes a one-click unsubscribe footer.
export function marketingBlastEmail(p: {
  recipientFirstName?: string | null;
  subject: string;
  headline?: string | null;
  body?: string | null;           // plain text; blank lines split paragraphs
  event?: {
    title: string; artistName?: string | null; eventWhen: string; eventWhere: string;
    metroCity?: string | null; bannerUrl?: string | null; fromPrice?: number | null; url: string;
  } | null;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const bodyParas = (p.body ?? "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

  const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
  const ev = p.event;

  // Featured event card.
  const eventCard = ev ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0;background:#fff;border:1px solid ${C.ivory200};border-radius:16px;overflow:hidden;">
    ${ev.bannerUrl ? `<tr><td style="padding:0;"><img src="${ev.bannerUrl}" alt="${ev.title}" width="560" style="width:100%;max-width:560px;height:auto;max-height:200px;display:block;border:0;object-fit:cover;" /></td></tr>` : ""}
    <tr><td style="padding:16px 18px;">
      ${ev.metroCity ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.marigoldDark};">📍 ${ev.metroCity}</p>` : ""}
      <p style="margin:0 0 ${ev.artistName ? 2 : 6}px;font-family:${FONT_HEAD};font-size:18px;font-weight:800;color:${C.ink};">${ev.title}</p>
      ${ev.artistName ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.aubergine};">🎤 ${ev.artistName}</p>` : ""}
      ${ev.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${ev.eventWhen}</p>` : ""}
      ${ev.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${ev.eventWhere}</p>` : ""}
      ${ev.fromPrice != null ? `<p style="margin:10px 0 0;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">Tickets from ${money(ev.fromPrice)}</p>` : ""}
    </td></tr>
  </table>` : "";

  const content = [
    eyebrow("Rameelo"),
    h1(p.headline?.trim() || (ev ? `Don't miss ${ev.title}` : "From Rameelo")),
    lead(first ? `Hi ${first},` : "Hi there,"),
    ...bodyParas.map(t => para(t.replace(/\n/g, "<br>"))),
    ev ? sectionTitle("The event") : "",
    eventCard,
    ev ? button(ev.url, "Get tickets →") : "",
  ].filter(Boolean).join("");

  // Unsubscribe footer (also surfaced as a List-Unsubscribe header at send time).
  const footer = `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you're part of the Rameelo community.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({
    preheader: p.headline?.trim() || (ev ? `${ev.title} — get your tickets on Rameelo` : "A note from Rameelo"),
    contentHtml: content + footer,
  });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    ...bodyParas,
    ev ? "" : null,
    ev ? `${ev.title}${ev.artistName ? ` · ${ev.artistName}` : ""}` : null,
    ev?.eventWhen ? `When: ${ev.eventWhen}` : null,
    ev?.eventWhere ? `Where: ${ev.eventWhere}` : null,
    ev?.fromPrice != null ? `Tickets from ${money(ev.fromPrice)}` : null,
    ev ? `Get tickets: ${ev.url}` : null,
    "",
    `Unsubscribe from marketing emails: ${p.unsubscribeUrl}`,
    `— Rameelo (${EMAIL.site})`,
  ].filter(v => v !== null).join("\n");

  return { subject: p.subject, html, text };
}
