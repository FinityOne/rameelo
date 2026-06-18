import { renderEmail, eyebrow, h1, lead, button, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// ── Event-driven marketing blasts ────────────────────────────────────────────
// A family of high-conversion, action-driven emails about a single event. They
// share the same structure (event-at-a-glance card → ticket tiers & prices →
// urgency callout → ONE CTA), and differ only in copy/tone per `variant`:
//   • tickets-live  — on-sale announcement
//   • selling-fast  — scarcity + FOMO
//   • final-call    — sales-closing deadline (max urgency)
//   • we-miss-you   — re-engagement / win-back for past attendees
// Each honors marketing opt-out via the unsubscribe footer (also a
// List-Unsubscribe header at send time).

export type BlastTier = { name: string; price: number; soldOut: boolean };

export type EventBlastVariant = "tickets-live" | "selling-fast" | "final-call" | "we-miss-you";

export type BlastEventData = {
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

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;

type VariantCopy = {
  eyebrow: string;
  h1: string;
  cta: string;
  subject: (ev: BlastEventData, first: string, days: number | null) => string;
  preheader: (ev: BlastEventData, days: number | null) => string;
  lead: (ev: BlastEventData, first: string) => string;
  closing: string;
};

const VARIANTS: Record<EventBlastVariant, VariantCopy> = {
  "tickets-live": {
    eyebrow: "On sale now",
    h1: "Tickets are LIVE 🎟️",
    cta: "Get tickets →",
    subject: (ev, _f, days) =>
      days != null && days <= 3 ? `⏳ Last chance — ${ev.title} tickets close in ${days} day${days === 1 ? "" : "s"}`
      : days != null && days <= 10 ? `🎟️ ${ev.title} tickets are selling fast — ${days} days left`
      : `🎟️ Tickets are LIVE: ${ev.title}`,
    preheader: (ev) =>
      ev.saleEndLabel ? `Tickets${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""} — sales close ${ev.saleEndLabel}. Grab yours before they're gone.`
      : `Tickets are on sale now${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""}. Get yours on Rameelo.`,
    lead: (ev, first) =>
      `${first ? `Hi ${first}, t` : "T"}ickets for <strong>${ev.title}</strong> just went on sale${ev.fromPrice != null ? ` — starting at <strong>${money(ev.fromPrice)}</strong>` : ""}. The best nights sell out early, so grab your spot while you can.`,
    closing: "Round up your crew and lock in your tickets now — you don't want to be the one watching the reels from home. 💃🕺",
  },
  "selling-fast": {
    eyebrow: "Selling fast",
    h1: "It's filling up 🔥",
    cta: "Grab your tickets →",
    subject: (ev, _f, days) =>
      days != null && days <= 7 ? `🔥 Going fast — only ${days} day${days === 1 ? "" : "s"} to get ${ev.title} tickets`
      : `🔥 ${ev.title} is selling fast — don't get left out`,
    preheader: (ev) => `${ev.title} tickets are moving fast${ev.fromPrice != null ? ` (from ${money(ev.fromPrice)})` : ""}. The best spots always go first.`,
    lead: (ev, first) =>
      `${first ? `Hi ${first}, w` : "W"}ord's out — tickets for <strong>${ev.title}</strong> are moving fast${ev.fromPrice != null ? ` (from <strong>${money(ev.fromPrice)}</strong>)` : ""}. The best seats and the lowest prices always go first, so don't wait and miss out.`,
    closing: "Lock in your spot before your favorite tier sells out — your future self will thank you. ✨",
  },
  "final-call": {
    eyebrow: "Final call",
    h1: "Almost gone ⏳",
    cta: "Get tickets before they're gone →",
    subject: (ev, _f, days) =>
      days != null && days <= 1 ? `🚨 Final hours — ${ev.title} tickets close ${days === 0 ? "today" : "tomorrow"}`
      : days != null && days <= 3 ? `⏳ Final call — ${ev.title} tickets close in ${days} days`
      : `⏳ Don't miss ${ev.title} — tickets are closing soon`,
    preheader: (ev) => `${ev.saleEndLabel ? `Sales close ${ev.saleEndLabel}` : "Sales closing soon"} — last chance to get ${ev.title} tickets.`,
    lead: (ev, first) =>
      `${first ? `Hi ${first}, this` : "This"} is your final call for <strong>${ev.title}</strong>. ${ev.saleEndLabel ? `Sales close <strong>${ev.saleEndLabel}</strong>` : "Sales are closing soon"} — once they're gone, they're gone. Don't miss the night everyone's going to be talking about.`,
    closing: "This is it — once sales close, that's the end. Don't watch this one sell out without you.",
  },
  "we-miss-you": {
    eyebrow: "You're invited back",
    h1: "We saved you a spot 💛",
    cta: "Come back & get tickets →",
    subject: (ev, first) => `${first ? `${first}, we` : "We"} saved you a spot at ${ev.title} 💛`,
    preheader: (ev) => `${ev.title} is back — we saved you a spot. Come dance with us again.`,
    lead: (ev, first) =>
      `${first ? `Hi ${first} — the` : "The"} dandiya sticks are coming back out. <strong>${ev.title}</strong> is happening, and a night like the ones you loved is waiting. Come dance with us again. 💃`,
    closing: "Grab your tickets and let's make new memories on the garba floor — we can't wait to see you there. 💛",
  },
};

export function eventBlastEmail(p: {
  variant: EventBlastVariant;
  recipientFirstName?: string | null;
  event: BlastEventData;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const v = VARIANTS[p.variant];
  const first = (p.recipientFirstName ?? "").trim().split(" ")[0];
  const ev = p.event;
  const days = ev.daysAway ?? null;
  const hot = p.variant === "final-call" || (days != null && days <= 3);

  const subject = v.subject(ev, first, days);
  const preheader = v.preheader(ev, days);

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

  // Ticket-tier list (name + price; sold-out struck through — doubles as proof).
  const tierRows = ev.tiers.map((t, i) => `<tr>
      <td style="padding:11px 16px;${i ? `border-top:1px solid ${C.ivory200};` : ""}font-family:${FONT_BODY};font-size:14px;font-weight:600;color:${t.soldOut ? C.inkFaint : C.ink};${t.soldOut ? "text-decoration:line-through;" : ""}">${t.name}${t.soldOut ? " — sold out" : ""}</td>
      <td align="right" style="padding:11px 16px;${i ? `border-top:1px solid ${C.ivory200};` : ""}font-family:${FONT_HEAD};font-size:14px;font-weight:800;color:${t.soldOut ? C.inkFaint : C.peacock};white-space:nowrap;">${t.soldOut ? "—" : money(t.price)}</td>
    </tr>`).join("");
  const tierTable = ev.tiers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;overflow:hidden;">${tierRows}</table>`
    : "";

  // Urgency callout off the sale-close date — red when hot, marigold otherwise.
  const urgencyBlock = ev.saleEndLabel && days != null
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;background:${hot ? `${C.durga}0F` : `${C.marigold}14`};border:1px solid ${hot ? `${C.durga}40` : `${C.marigold}40`};border-radius:14px;"><tr><td style="padding:14px 16px;text-align:center;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">${hot ? "⏳" : "⏰"} Sales close <span style="color:${hot ? C.durga : C.marigoldDark};">${ev.saleEndLabel}</span> — that's just <span style="color:${hot ? C.durga : C.marigoldDark};">${days} day${days === 1 ? "" : "s"} away</span>.</p>
      </td></tr></table>`
    : "";

  const content = [
    eyebrow(v.eyebrow),
    h1(v.h1),
    lead(v.lead(ev, first)),
    eventCard,
    ev.tiers.length ? sectionTitle("Ticket options") : "",
    tierTable,
    urgencyBlock,
    button(ev.url, v.cta),
    `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.inkMuted};">${v.closing}</p>`,
  ].filter(Boolean).join("");

  const footer = `<p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you're part of the Rameelo community.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({ preheader, contentHtml: content + footer });

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `${ev.title}${ev.fromPrice != null ? ` — tickets from ${money(ev.fromPrice)}` : ""}.`,
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
