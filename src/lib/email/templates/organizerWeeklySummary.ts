import { renderEmail, eyebrow, h1, lead, sectionTitle, divider, button } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Weekly sales pulse for an organizer's team. A 50,000-ft view of the past week:
// revenue (face value only), tickets, orders, the day-by-day shape of the week,
// per-event sales, and how upcoming on-sale events are tracking. Clean and
// scannable — answers "how did we do, and what should I watch" at a glance.
export interface OrganizerWeeklyData {
  org_id: string;
  org_name: string;
  week_start: string; // YYYY-MM-DD (Pacific)
  week_end: string;   // YYYY-MM-DD inclusive
  orders: number;
  tickets: number;
  revenue: number;
  comp_tickets: number;
  prev_orders: number;
  prev_tickets: number;
  prev_revenue: number;
  by_day: { date: string; weekday: string; tickets: number; revenue: number }[];
  events: { title: string; city: string | null; state: string | null; orders: number; tickets: number; revenue: number }[];
  upcoming: { title: string; city: string | null; state: string | null; start_date: string; days_until: number; capacity: number | null; sold: number; revenue: number }[];
}

const money = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money0 = (n: number) => `$${Math.round(Number(n || 0)).toLocaleString("en-US")}`;
const place = (city: string | null, state: string | null) => [city, state].filter(Boolean).join(", ");

function prettyDay(day: string): string {
  return new Date(day + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
function prettyDayYear(day: string): string {
  return new Date(day + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Week-over-week delta as a short, color-coded phrase.
function wow(current: number, prev: number): { text: string; color: string } {
  if (prev <= 0) return current > 0 ? { text: "▲ new this week", color: C.peacock } : { text: "—", color: C.inkMuted };
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct > 0) return { text: `▲ ${pct}% vs last week`, color: C.peacock };
  if (pct < 0) return { text: `▼ ${Math.abs(pct)}% vs last week`, color: C.durga };
  return { text: "flat vs last week", color: C.inkMuted };
}

export function organizerWeeklySummaryEmail(d: OrganizerWeeklyData): { subject: string; html: string; text: string } {
  const range = `${prettyDay(d.week_start)} – ${prettyDayYear(d.week_end)}`;
  const quiet = d.orders === 0;
  const avgOrder = d.orders > 0 ? d.revenue / d.orders : 0;
  const rev = wow(d.revenue, d.prev_revenue);

  const subject = quiet
    ? `Your Rameelo week — ${d.org_name}: quiet week (${range})`
    : `📈 Your Rameelo week — ${d.org_name}: ${money0(d.revenue)} · ${d.tickets} tickets (${range})`;

  // ── KPI grid (2×2) ──
  const kpi = (label: string, value: string, sub: string | null, accent: string = C.ink) =>
    `<td width="50%" style="padding:14px 16px;border:1px solid ${C.ivory200};">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</p>
      <p style="margin:0;font-family:${FONT_HEAD};font-size:24px;font-weight:800;color:${accent};">${value}</p>
      ${sub ? `<p style="margin:4px 0 0;font-family:${FONT_BODY};font-size:11px;font-weight:600;color:${sub.startsWith("▲") || sub.includes("new") ? C.peacock : sub.startsWith("▼") ? C.durga : C.inkMuted};">${sub}</p>` : ""}
    </td>`;

  const kpiGrid = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-collapse:collapse;">
    <tr>${kpi("Revenue (face value)", money(d.revenue), rev.text, C.peacock)}${kpi("Tickets sold", String(d.tickets), `${d.orders} ${d.orders === 1 ? "order" : "orders"}`)}</tr>
    <tr>${kpi("Avg order", money(avgOrder), d.orders > 0 ? `${(d.tickets / d.orders).toFixed(1)} tickets/order` : null, C.ink)}${kpi("Comp tickets", String(d.comp_tickets), d.comp_tickets > 0 ? "issued free" : "none this week", C.marigoldDark)}</tr>
  </table>`;

  // ── Day-by-day bar chart (table-based, email-safe) ──
  const maxDayTickets = Math.max(1, ...d.by_day.map((x) => x.tickets));
  const bestDay = d.by_day.reduce((b, x) => (x.tickets > b.tickets ? x : b), d.by_day[0] ?? { tickets: 0, weekday: "" });
  const dayRows = d.by_day.map((x) => {
    const pct = Math.round((x.tickets / maxDayTickets) * 100);
    const isBest = x.tickets > 0 && x.tickets === bestDay.tickets;
    const barColor = isBest ? C.marigold : C.ivory200;
    const barInner = x.tickets > 0
      ? `<div style="height:14px;width:${Math.max(pct, 6)}%;background:${barColor};border-radius:7px;"></div>`
      : `<div style="height:14px;width:6%;background:${C.ivory200};border-radius:7px;opacity:0.5;"></div>`;
    return `<tr>
      <td width="44" style="padding:5px 0;font-family:${FONT_BODY};font-size:12px;font-weight:700;color:${isBest ? C.ink : C.inkMuted};">${x.weekday}</td>
      <td style="padding:5px 10px;">${barInner}</td>
      <td width="92" align="right" style="padding:5px 0;font-family:${FONT_BODY};font-size:12px;color:${C.ink};white-space:nowrap;">
        <strong>${x.tickets}</strong> <span style="color:${C.inkMuted};">· ${money0(x.revenue)}</span>
      </td>
    </tr>`;
  }).join("");
  const dayChart = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:12px;">
    <tr><td style="padding:14px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${dayRows}</table></td></tr></table>`;

  // ── Per-event sales this week ──
  let eventsBlock: string;
  if (d.events.length === 0) {
    eventsBlock = `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:14px;color:${C.inkMuted};">No ticket sales recorded this week.</p>`;
  } else {
    const rows = d.events.map((e, i) => `<tr style="background:${i % 2 ? C.ivory : C.white};">
      <td style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">
        <strong>${e.title}</strong>${place(e.city, e.state) ? `<br><span style="font-size:11px;color:${C.inkMuted};">${place(e.city, e.state)}</span>` : ""}
      </td>
      <td align="center" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">${e.orders}</td>
      <td align="center" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">${e.tickets}</td>
      <td align="right" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">${money(e.revenue)}</td>
    </tr>`).join("");
    eventsBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.ivory200};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
      <tr style="background:${C.aubergine};">
        <td style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Event</td>
        <td align="center" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Orders</td>
        <td align="center" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Tickets</td>
        <td align="right" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Revenue</td>
      </tr>${rows}</table>`;
  }

  // ── Upcoming events pulse (sell-through + countdown) ──
  let upcomingBlock = "";
  if (d.upcoming.length > 0) {
    const cards = d.upcoming.slice(0, 6).map((u) => {
      const hasCap = !!u.capacity && u.capacity > 0;
      const pct = hasCap ? Math.min(100, Math.round((u.sold / (u.capacity as number)) * 100)) : 0;
      const bar = hasCap
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
             <td style="background:${C.ivory200};border-radius:6px;height:8px;line-height:8px;font-size:0;">
               <div style="width:${Math.max(pct, 2)}%;height:8px;background:${C.peacock};border-radius:6px;"></div>
             </td></tr></table>
           <p style="margin:5px 0 0;font-family:${FONT_BODY};font-size:11px;color:${C.inkMuted};"><strong style="color:${C.ink};">${u.sold}</strong> of ${u.capacity} sold · ${pct}% · ${money0(u.revenue)}</p>`
        : `<p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:11px;color:${C.inkMuted};"><strong style="color:${C.ink};">${u.sold}</strong> sold to date · ${money0(u.revenue)}</p>`;
      const when = u.days_until <= 0 ? "Today" : u.days_until === 1 ? "Tomorrow" : `in ${u.days_until} days`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;background:${C.white};border:1px solid ${C.ivory200};border-radius:12px;">
        <tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${FONT_BODY};font-size:14px;font-weight:700;color:${C.ink};">${u.title}${place(u.city, u.state) ? ` <span style="font-size:11px;font-weight:400;color:${C.inkMuted};">· ${place(u.city, u.state)}</span>` : ""}</td>
            <td align="right" style="font-family:${FONT_BODY};font-size:11px;font-weight:700;color:${C.marigoldDark};white-space:nowrap;">${when}</td>
          </tr></table>
          ${bar}
        </td></tr></table>`;
    }).join("");
    upcomingBlock = sectionTitle("Upcoming events — how they're tracking") + cards;
  }

  const content = [
    eyebrow("Weekly sales summary"),
    h1(d.org_name),
    lead(quiet
      ? `Here's your week at a glance for <strong>${range}</strong>. It was a quiet one — no ticket sales this week. Your upcoming events and totals are below.`
      : `Here's your week at a glance for <strong>${range}</strong>. You brought in <strong>${money(d.revenue)}</strong> in ticket sales across <strong>${d.orders}</strong> ${d.orders === 1 ? "order" : "orders"} — ${rev.text}.`),
    kpiGrid,
    sectionTitle("Tickets sold by day"),
    dayChart,
    sectionTitle("Sales by event this week"),
    eventsBlock,
    upcomingBlock ? divider() : "",
    upcomingBlock,
    divider(),
    button(`${EMAIL.site}/organizer`, "Open your dashboard"),
  ].filter(Boolean).join("");

  const html = renderEmail({
    preheader: quiet
      ? `${d.org_name}: a quiet week (${range}).`
      : `${money0(d.revenue)} · ${d.tickets} tickets · ${d.orders} orders this week (${range}).`,
    contentHtml: content,
  });

  // ── Plain-text version ──
  const dayLines = d.by_day.map((x) => `  ${x.weekday}: ${x.tickets} tickets · ${money(x.revenue)}`).join("\n");
  const eventLines = d.events.length
    ? d.events.map((e) => `  • ${e.title}${place(e.city, e.state) ? ` (${place(e.city, e.state)})` : ""}: ${e.orders} orders, ${e.tickets} tickets, ${money(e.revenue)}`).join("\n")
    : "  No ticket sales recorded this week.";
  const upcomingLines = d.upcoming.length
    ? d.upcoming.slice(0, 6).map((u) => {
        const when = u.days_until <= 0 ? "today" : u.days_until === 1 ? "tomorrow" : `in ${u.days_until} days`;
        const cap = u.capacity && u.capacity > 0 ? ` (${u.sold}/${u.capacity} sold)` : ` (${u.sold} sold)`;
        return `  • ${u.title} — ${when}${cap}, ${money(u.revenue)} to date`;
      }).join("\n")
    : "";

  const text = [
    `YOUR RAMEELO WEEK — ${d.org_name}`,
    `${range} (Pacific time)`,
    "",
    `Revenue (face value): ${money(d.revenue)}  (${rev.text})`,
    `Tickets sold:         ${d.tickets}`,
    `Orders:               ${d.orders}`,
    `Avg order:            ${money(avgOrder)}`,
    d.comp_tickets > 0 ? `Comp tickets issued:  ${d.comp_tickets}` : "",
    "",
    "TICKETS SOLD BY DAY",
    dayLines,
    "",
    "SALES BY EVENT THIS WEEK",
    eventLines,
    upcomingLines ? "\nUPCOMING EVENTS\n" + upcomingLines : "",
    "",
    `Open your dashboard: ${EMAIL.site}/organizer`,
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
