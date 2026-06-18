import { renderEmail, eyebrow, h1, lead, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// "Tickets are LIVE" blast — a high-conversion on-sale announcement for an event.
// Leads with the event, lists the available ticket tiers + prices, and builds
// urgency off the sale-close date ("closes in X days"). One CTA to buy. Honors
// marketing opt-out via the unsubscribe footer (also sent as a List-Unsubscribe
// header). Designed to make people act now.
export type BlastTier = { name: string; price: number; soldOut: boolean };

export function ticketsLiveBlastEmail(p: {
  recipientFirstName?: string | null;
  event: {
    title: string;
    artistName?: string | null;
    eventWhen: string;
    eventWhere: string;
    metroCity?: string | null;
    bannerUrl?: string | null;
    url: string;
    tiers: BlastTier[];
    fromPrice?: number | null;
    saleEndLabel?: string | null;  // e.g. "Sat, Sep 26"
    daysAway?: number | null;      // whole days until sales close
  };
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const ev = p.event;
  const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
  const days = ev.daysAway ?? null;
  const urgent = days != null && days <= 3;
  const soon = days != null && days <= 10;

  // Subject + preheader scale with urgency.
  const subject =
    urgent ? `⏳ Last chance — ${ev.title} tickets close in ${days} day${days === 1 ? "" : "s"}`
    : soon ? `🎟️ ${ev.title} tickets are selling fast — ${days} days left`
    : `🎟️ Tickets are LIVE: ${ev.title}`;

  const preheader =
    ev.saleEndLabel
      ? `Tickets${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""} — sales close ${ev.saleEndLabel}. Grab yours before they're gone.`
      : `Tickets are on sale now${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""}. Get yours on Rameelo.`;

  // Event-at-a-glance card.
  const eventCard = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 14px;background:#fff;border:1px solid ${C.ivory200};border-radius:16px;overflow:hidden;">
    ${ev.bannerUrl ? `<tr><td style="padding:0;"><img src="${ev.bannerUrl}" alt="${ev.title}" width="560" style="width:100%;max-width:560px;height:auto;max-height:200px;display:block;border:0;object-fit:cover;" /></td></tr>` : ""}
    <tr><td style="padding:16px 18px;">
      ${ev.metroCity ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.marigoldDark};">📍 ${ev.metroCity}</p>` : ""}
      <p style="margin:0 0 ${ev.artistName ? 2 : 6}px;font-family:${FONT_HEAD};font-size:19px;font-weight:800;color:${C.ink};">${ev.title}</p>
      ${ev.artistName ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.aubergine};">🎤 ${ev.artistName}</p>` : ""}
      ${ev.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${ev.eventWhen}</p>` : ""}
      ${ev.eventWhere ? `<p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${ev.eventWhere}</p>` : ""}
    </td></tr>
  </table>`;

  // Ticket-tier list (name + price; sold-out struck through).
  const tierRows = ev.tiers.map((t, i) => `<tr>
      <td style="padding:11px 16px;${i ? `border-top:1px solid ${C.ivory200};` : ""}font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${t.soldOut ? C.inkFaint : C.ink};${t.soldOut ? "text-decoration:line-through;" : ""}">${t.name}${t.soldOut ? " — sold out" : ""}</td>
      <td align="right" style="padding:11px 16px;${i ? `border-top:1px solid ${C.ivory200};` : ""}font-family:${FONT_HEAD};font-size:14px;font-weight:800;color:${t.soldOut ? C.inkFaint : C.peacock};white-space:nowrap;">${t.soldOut ? "—" : money(t.price)}</td>
    </tr>`).join("");
  const tierTable = ev.tiers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;overflow:hidden;">${tierRows}</table>`
    : "";

  // Urgency callout off the sale-close date.
  const urgencyBlock = ev.saleEndLabel && days != null
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;background:${urgent ? `${C.durga}0F` : `${C.marigold}14`};border:1px solid ${urgent ? `${C.durga}40` : `${C.marigold}40`};border-radius:14px;"><tr><td style="padding:14px 16px;text-align:center;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">${urgent ? "⏳" : "⏰"} Sales close <span style="color:${urgent ? C.durga : C.marigoldDark};">${ev.saleEndLabel}</span> — that's just <span style="color:${urgent ? C.durga : C.marigoldDark};">${days} day${days === 1 ? "" : "s"} away</span>.</p>
      </td></tr></table>`
    : "";

  const content = [
    eyebrow("On sale now"),
    h1("Tickets are LIVE 🎟️"),
    lead(`${first ? `Hi ${first}, t` : "T"}ickets for <strong>${ev.title}</strong> just went on sale${ev.fromPrice != null ? ` — starting at <strong>${money(ev.fromPrice)}</strong>` : ""}. The best nights sell out early, so grab your spot while you can.`),
    eventCard,
    ev.tiers.length ? sectionTitle("Ticket options") : "",
    tierTable,
    urgencyBlock,
    button(ev.url, "Get tickets →"),
    `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.inkMuted};">Round up your crew and lock in your tickets now — you don't want to be the one watching the reels from home. 💃🕺</p>`,
  ].filter(Boolean).join("");

  const footer = `<p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you're part of the Rameelo community.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({ preheader, contentHtml: content + footer });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `Tickets for ${ev.title} are LIVE${ev.fromPrice != null ? ` (from ${money(ev.fromPrice)})` : ""}.`,
    ev.artistName ? `Featuring ${ev.artistName}.` : "",
    ev.eventWhen ? `When: ${ev.eventWhen}` : "",
    ev.eventWhere ? `Where: ${ev.eventWhere}` : "",
    "",
    ev.tiers.length ? "TICKET OPTIONS" : "",
    ...ev.tiers.map(t => `  ${t.name}: ${t.soldOut ? "Sold out" : money(t.price)}`),
    "",
    ev.saleEndLabel && days != null ? `Sales close ${ev.saleEndLabel} — only ${days} day${days === 1 ? "" : "s"} away.` : "",
    "",
    `Get tickets: ${ev.url}`,
    "",
    `Unsubscribe from marketing emails: ${p.unsubscribeUrl}`,
    `— Rameelo (${EMAIL.site})`,
  ].filter(v => v !== "").join("\n");

  return { subject, html, text };
}
