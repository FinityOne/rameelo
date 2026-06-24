import { renderEmail, eyebrow, h1, lead, sectionTitle, divider } from "../layout";
import { EMAIL, C, FONT_BODY, FONT_HEAD } from "../theme";

// Internal daily activity digest for platform admins: the prior day's users,
// orders, revenue, and an event-by-event sales breakdown — enough context to
// decide what to focus on. Plain and scannable, not fancy.
export interface DailySummaryData {
  day: string; // YYYY-MM-DD (Pacific)
  new_users: number;
  online_orders: number;
  online_tickets: number;
  ticket_revenue: number;
  platform_fees: number;
  total_collected: number;
  manual_orders: number;
  manual_tickets: number;
  manual_revenue: number;
  comp_tickets: number;
  events: { title: string; city: string | null; state: string | null; orders: number; tickets: number; revenue: number; has_manual: boolean }[];
}

const money = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function prettyDay(day: string): string {
  return new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function dailySummaryEmail(d: DailySummaryData): { subject: string; html: string; text: string } {
  const subject = `📊 Rameelo daily — ${prettyDay(d.day)}: ${money(d.ticket_revenue)} · ${d.online_orders} orders · ${d.new_users} new`;

  // KPI grid (2×2).
  const kpi = (label: string, value: string, accent: string = C.ink) =>
    `<td width="50%" style="padding:14px 16px;border:1px solid ${C.ivory200};">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.inkMuted};">${label}</p>
      <p style="margin:0;font-family:${FONT_HEAD};font-size:24px;font-weight:800;color:${accent};">${value}</p>
    </td>`;

  const kpiGrid = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-collapse:collapse;">
    <tr>${kpi("Ticket revenue", money(d.ticket_revenue), C.peacock)}${kpi("Online orders", String(d.online_orders))}</tr>
    <tr>${kpi("Tickets sold", String(d.online_tickets))}${kpi("New users", String(d.new_users), C.marigoldDark)}</tr>
  </table>`;

  // Secondary line (fees, collected, manual, comps).
  const secondary = [
    `Platform fees: <strong>${money(d.platform_fees)}</strong>`,
    `Total collected: <strong>${money(d.total_collected)}</strong>`,
    d.manual_orders > 0 ? `Offline/manual: <strong>${d.manual_orders}</strong> orders · ${money(d.manual_revenue)}` : null,
    d.comp_tickets > 0 ? `Comp tickets issued: <strong>${d.comp_tickets}</strong>` : null,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  const secondaryPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:12px;">
    <tr><td style="padding:12px 16px;font-family:${FONT_BODY};font-size:13px;line-height:1.7;color:${C.inkMuted};">${secondary}</td></tr></table>`;

  // Event-by-event table.
  let eventsBlock: string;
  if (d.events.length === 0) {
    eventsBlock = `<p style="margin:0;font-family:${FONT_BODY};font-size:14px;color:${C.inkMuted};">No event sales recorded for this day.</p>`;
  } else {
    const rows = d.events.map((e, i) => {
      const place = [e.city, e.state].filter(Boolean).join(", ");
      return `<tr style="background:${i % 2 ? C.ivory : C.white};">
        <td style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">
          <strong>${e.title}</strong>${e.has_manual ? ` <span style="font-size:10px;color:${C.marigoldDark};">+offline</span>` : ""}
          ${place ? `<br><span style="font-size:11px;color:${C.inkMuted};">${place}</span>` : ""}
        </td>
        <td align="center" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">${e.orders}</td>
        <td align="center" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;color:${C.ink};">${e.tickets}</td>
        <td align="right" style="padding:10px 12px;font-family:${FONT_BODY};font-size:13px;font-weight:700;color:${C.ink};">${money(e.revenue)}</td>
      </tr>`;
    }).join("");
    eventsBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.ivory200};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
      <tr style="background:${C.aubergine};">
        <td style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Event</td>
        <td align="center" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Orders</td>
        <td align="center" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Tickets</td>
        <td align="right" style="padding:9px 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#fff;">Revenue</td>
      </tr>
      ${rows}
    </table>`;
  }

  const quiet = d.online_orders === 0 && d.new_users === 0 && d.manual_orders === 0;

  const content = [
    eyebrow("Daily summary · Pacific time"),
    h1(prettyDay(d.day)),
    lead(quiet
      ? "A quiet day — no new orders or signups. Here's the full picture:"
      : `Here's what happened on the platform yesterday — <strong>${money(d.ticket_revenue)}</strong> in ticket sales across <strong>${d.online_orders}</strong> ${d.online_orders === 1 ? "order" : "orders"}.`),
    kpiGrid,
    secondaryPanel,
    sectionTitle("Event-by-event sales"),
    eventsBlock,
    divider(),
  ].join("");

  const html = renderEmail({
    preheader: `${money(d.ticket_revenue)} · ${d.online_orders} orders · ${d.online_tickets} tickets · ${d.new_users} new users`,
    contentHtml: content,
  });

  const eventLines = d.events.length
    ? d.events.map((e) => `  • ${e.title}${e.city ? ` (${[e.city, e.state].filter(Boolean).join(", ")})` : ""}: ${e.orders} orders, ${e.tickets} tickets, ${money(e.revenue)}${e.has_manual ? " (incl. offline)" : ""}`).join("\n")
    : "  No event sales recorded for this day.";

  const text = [
    `RAMEELO DAILY SUMMARY — ${prettyDay(d.day)} (Pacific)`,
    "",
    `New users:        ${d.new_users}`,
    `Online orders:    ${d.online_orders}`,
    `Tickets sold:     ${d.online_tickets}`,
    `Ticket revenue:   ${money(d.ticket_revenue)}`,
    `Platform fees:    ${money(d.platform_fees)}`,
    `Total collected:  ${money(d.total_collected)}`,
    d.manual_orders > 0 ? `Offline/manual:   ${d.manual_orders} orders · ${money(d.manual_revenue)}` : "",
    d.comp_tickets > 0 ? `Comp tickets:     ${d.comp_tickets}` : "",
    "",
    "EVENT-BY-EVENT SALES",
    eventLines,
    "",
    `— Rameelo admin (${EMAIL.site}/admin)`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
