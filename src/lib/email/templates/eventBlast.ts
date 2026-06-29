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
//
// Urgency is honest: we lead with the metro city, and instead of a misleading
// "tickets close in N days" (later tiers usually sell right up to the event),
// we surface the *specific tier whose sale window is ending soon* ("Early Bird
// ends Fri, Sep 25") and only claim an overall countdown when sales truly close
// in the near term. Each honors marketing opt-out via the unsubscribe footer.

export type BlastTier = { name: string; price: number; soldOut: boolean };

export type EventBlastVariant = "tickets-live" | "selling-fast" | "final-call" | "we-miss-you";

// A tier whose sale window ends before overall sales close — a genuine
// "this price is going away" hook.
export type TierDeadline = { name: string; label: string; days: number };

export type BlastEventData = {
  title: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  metroCity?: string | null;
  bannerUrl?: string | null;
  url: string;
  tiers: BlastTier[];                  // ACTIVE (available) tiers to list — sold-out
                                       // tiers are summarized in soldOutTierNames
  soldOutTierNames?: string[] | null;  // names of sold-out tiers, for a FOMO note
  fromPrice?: number | null;
  closeLabel?: string | null;       // date ALL ticket sales close (latest tier / event)
  closeDays?: number | null;        // whole days until that
  deadlineTier?: TierDeadline | null; // soonest tier ending before overall close
};

const money = (n: number) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;
const plural = (n: number) => (n === 1 ? "" : "s");

type VariantCopy = {
  eyebrow: string;
  h1: string;
  cta: string;
  subject: (ev: BlastEventData, first: string) => string;
  preheader: (ev: BlastEventData) => string;
  lead: (ev: BlastEventData, first: string) => string;
  closing: string;
};

// Soft metro helpers shared by the copy below.
const metroOf = (ev: BlastEventData) => (ev.metroCity ?? "").trim();
const inMetro = (ev: BlastEventData) => { const m = metroOf(ev); return m ? ` in ${m}` : ""; };
// A tier deadline is worth a subject mention only when it's genuinely near.
const soonDeadline = (ev: BlastEventData) => (ev.deadlineTier && ev.deadlineTier.days <= 12 ? ev.deadlineTier : null);

const VARIANTS: Record<EventBlastVariant, VariantCopy> = {
  "tickets-live": {
    eyebrow: "On sale now",
    h1: "Tickets are LIVE 🎟️",
    cta: "Get tickets →",
    subject: (ev) => {
      const dl = soonDeadline(ev), m = metroOf(ev);
      return dl ? `🎟️ ${ev.title}${inMetro(ev)} is on sale — ${dl.name} ends ${dl.label}`
        : `🎟️ Tickets are LIVE${m ? ` in ${m}` : ""}: ${ev.title}`;
    },
    preheader: (ev) => {
      const dl = soonDeadline(ev);
      return dl ? `${dl.name} pricing ends ${dl.label} — lock in the best deal now.`
        : `Tickets${ev.fromPrice != null ? ` from ${money(ev.fromPrice)}` : ""}${inMetro(ev)} are on sale now. Grab yours before they're gone.`;
    },
    lead: (ev, first) => {
      const dl = soonDeadline(ev);
      return `${first ? `Hi ${first}, t` : "T"}ickets for <strong>${ev.title}</strong>${inMetro(ev)} are on sale${ev.fromPrice != null ? ` — starting at <strong>${money(ev.fromPrice)}</strong>` : ""}.${dl ? ` Heads up: <strong>${dl.name}</strong> pricing ends <strong>${dl.label}</strong>, so lock in the best deal while you can.` : " The best nights sell out early, so grab your spot while you can."}`;
    },
    closing: "Round up your crew and lock in your tickets now — you don't want to be the one watching the reels from home. 💃🕺",
  },
  "selling-fast": {
    eyebrow: "Selling fast",
    h1: "It's filling up 🔥",
    cta: "Grab your tickets →",
    subject: (ev) => {
      const dl = soonDeadline(ev);
      return dl ? `🔥 Hurry — ${dl.name} for ${ev.title}${inMetro(ev)} is almost gone`
        : `🔥 ${ev.title}${inMetro(ev)} is selling fast`;
    },
    preheader: (ev) => {
      const dl = soonDeadline(ev);
      return dl ? `${dl.name} is nearly gone — ends ${dl.label}. Grab yours before it's gone.`
        : `${ev.title}${inMetro(ev)} tickets are moving fast. The best spots always go first.`;
    },
    lead: (ev, first) => {
      const dl = soonDeadline(ev);
      return `${first ? `Hi ${first}, w` : "W"}ord's out — <strong>${ev.title}</strong>${inMetro(ev)} is filling up${ev.fromPrice != null ? ` (tickets from <strong>${money(ev.fromPrice)}</strong>)` : ""}.${dl ? ` <strong>${dl.name}</strong> is nearly gone and ends <strong>${dl.label}</strong>.` : ""} The best seats and lowest prices always go first — don't wait and miss out.`;
    },
    closing: "Lock in your spot before your favorite tier sells out — your future self will thank you. ✨",
  },
  "final-call": {
    eyebrow: "Final call",
    h1: "Almost gone ⏳",
    cta: "Get tickets before they're gone →",
    subject: (ev) => {
      const dl = soonDeadline(ev);
      if (dl) return `⏳ Last call: ${dl.name} for ${ev.title}${inMetro(ev)} ends ${dl.label}`;
      if (ev.closeDays != null && ev.closeDays <= 7) return `🚨 Final days for ${ev.title}${inMetro(ev)} tickets`;
      return `⏳ Don't miss ${ev.title}${inMetro(ev)}`;
    },
    preheader: (ev) => {
      const dl = soonDeadline(ev);
      return dl ? `${dl.name} ends ${dl.label} — once it's gone, that price is gone.`
        : ev.closeLabel && ev.closeDays != null && ev.closeDays <= 14 ? `Sales close ${ev.closeLabel}. Don't miss your chance to be there.`
        : `Don't miss ${ev.title}${inMetro(ev)} — get your tickets while you still can.`;
    },
    lead: (ev, first) => {
      const dl = soonDeadline(ev);
      return `${first ? `Hi ${first}, this` : "This"} is your final call for <strong>${ev.title}</strong>${inMetro(ev)}.${dl ? ` <strong>${dl.name}</strong> ends <strong>${dl.label}</strong> — once it's gone, that price is gone.` : ev.closeLabel && ev.closeDays != null && ev.closeDays <= 14 ? ` Sales close <strong>${ev.closeLabel}</strong>.` : ""} Don't miss the night everyone's going to be talking about.`;
    },
    closing: "This is it — once sales close, that's the end. Don't watch this one sell out without you.",
  },
  "we-miss-you": {
    eyebrow: "You're invited back",
    h1: "We saved you a spot 💛",
    cta: "Come back & get tickets →",
    subject: (ev, first) => {
      const m = metroOf(ev);
      return `${first ? `${first}, the` : "The"} garba floor misses you${m ? ` — ${ev.title} is back in ${m}` : ` — ${ev.title} is back`} 💛`;
    },
    preheader: (ev) => `${ev.title} is back${inMetro(ev)}. We saved you a spot — come dance with us again.`,
    lead: (ev, first) =>
      `${first ? `Hi ${first} — the` : "The"} dandiya sticks are coming back out. <strong>${ev.title}</strong> is happening${inMetro(ev)}, and a night like the ones you loved is waiting. Come dance with us again. 💃`,
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

  const subject = v.subject(ev, first);
  const preheader = v.preheader(ev);

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
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${(ev.soldOutTierNames?.length && ev.tiers.some(t => !t.soldOut)) ? 8 : 14}px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;overflow:hidden;">${tierRows}</table>`
    : "";

  // FOMO proof: when earlier tiers have sold out but active ones remain, name the
  // sold-out tier(s) instead of listing their (no-longer-buyable) prices.
  const soldOutNames = (ev.soldOutTierNames ?? []).filter(Boolean);
  const hasActiveListed = ev.tiers.some(t => !t.soldOut);
  const soldOutLabel = soldOutNames.length === 1
    ? `${soldOutNames[0]} is sold out`
    : soldOutNames.length === 2
      ? `${soldOutNames[0]} & ${soldOutNames[1]} are sold out`
      : soldOutNames.length > 2
        ? `${soldOutNames.slice(0, -1).join(", ")} & ${soldOutNames[soldOutNames.length - 1]} are sold out`
        : "";
  const soldOutNote = soldOutNames.length && hasActiveListed
    ? `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:12.5px;font-weight:700;color:${C.durga};">🔥 ${soldOutLabel} — grab one of the tiers still available above before they're gone.</p>`
    : "";

  // Urgency callout — prefer the specific tier deadline (honest), else an overall
  // sales-close countdown only when it's genuinely near. Red when hot.
  const callout = (hot: boolean, inner: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;background:${hot ? `${C.durga}0F` : `${C.marigold}14`};border:1px solid ${hot ? `${C.durga}40` : `${C.marigold}40`};border-radius:14px;"><tr><td style="padding:14px 16px;text-align:center;">
      <p style="margin:0;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">${inner}</p>
    </td></tr></table>`;
  const hi = (hot: boolean, s: string) => `<span style="color:${hot ? C.durga : C.marigoldDark};">${s}</span>`;

  let urgencyBlock = "";
  const dl = ev.deadlineTier;
  if (dl) {
    const hot = p.variant === "final-call" || dl.days <= 3;
    urgencyBlock = callout(hot, `${hot ? "⏳" : "⏰"} ${hi(hot, dl.name)} ends ${hi(hot, dl.label)} — just ${hi(hot, `${dl.days} day${plural(dl.days)} left`)} at this price.`);
  } else if (ev.closeLabel && ev.closeDays != null && ev.closeDays <= 21) {
    const hot = p.variant === "final-call" || ev.closeDays <= 3;
    urgencyBlock = callout(hot, `${hot ? "⏳" : "⏰"} Sales close ${hi(hot, ev.closeLabel)} — that's ${hi(hot, `${ev.closeDays} day${plural(ev.closeDays)} away`)}.`);
  }

  const content = [
    eyebrow(v.eyebrow),
    h1(v.h1),
    lead(v.lead(ev, first)),
    eventCard,
    ev.tiers.length ? sectionTitle("Ticket options") : "",
    tierTable,
    soldOutNote,
    urgencyBlock,
    button(ev.url, v.cta),
    `<p style="margin:18px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${C.inkMuted};">${v.closing}</p>`,
  ].filter(Boolean).join("");

  const footer = `<p style="margin:22px 0 0;font-family:${FONT_BODY};font-size:11px;line-height:1.6;color:${C.inkFaint};text-align:center;">
    You're receiving this because you're part of the Rameelo community.
    <a href="${p.unsubscribeUrl}" style="color:${C.inkMuted};text-decoration:underline;">Unsubscribe from marketing emails</a>.
  </p>`;

  const html = renderEmail({ preheader, contentHtml: content + footer });

  const urgencyText = dl
    ? `${dl.name} ends ${dl.label} — only ${dl.days} day${plural(dl.days)} left at this price.`
    : ev.closeLabel && ev.closeDays != null && ev.closeDays <= 21
      ? `Sales close ${ev.closeLabel} — ${ev.closeDays} day${plural(ev.closeDays)} away.`
      : "";

  const text = [
    first ? `Hi ${first},` : "Hi there,",
    "",
    `${ev.title}${inMetro(ev)}${ev.fromPrice != null ? ` — tickets from ${money(ev.fromPrice)}` : ""}.`,
    ev.artistName ? `Featuring ${ev.artistName}.` : "",
    ev.eventWhen ? `When: ${ev.eventWhen}` : "",
    ev.eventWhere ? `Where: ${ev.eventWhere}` : "",
    "",
    ev.tiers.length ? "TICKET OPTIONS" : "",
    ...ev.tiers.map(t => `  ${t.name}: ${t.soldOut ? "Sold out" : money(t.price)}`),
    soldOutNames.length && hasActiveListed ? `(${soldOutLabel} — grab one of the tiers still available.)` : "",
    "",
    urgencyText,
    "",
    `Get tickets: ${ev.url}`,
    "",
    `Unsubscribe from marketing emails: ${p.unsubscribeUrl}`,
    `— Rameelo (${EMAIL.site})`,
  ].filter(s => s !== "").join("\n");

  return { subject, html, text };
}
