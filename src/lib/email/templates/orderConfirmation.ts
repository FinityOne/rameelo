import { renderEmail, eyebrow, h1, lead, para, button, divider, sectionTitle } from "../layout";
import { EMAIL, C, FONT_BODY } from "../theme";
import { money } from "../../money";

// Order confirmation / receipt sent right after a successful purchase. Includes
// the event summary + directions link, pricing breakdown, total tickets, and CTAs
// to view tickets in the portal (account required) and buy more.
export function orderConfirmationEmail(p: {
  buyerName?: string | null;
  receiptNum: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  rameeloFee: number;
  processingFee: number;
  grandTotal: number;
  tierName: string;
  eventTitle: string;
  artistName?: string | null;
  eventWhen: string;
  eventWhere: string;
  directionsUrl: string;
  ticketsUrl: string;
  buyMoreUrl: string;
  // For combo tickets: the events the combo covers. When 2+, the buyer is told
  // they'll receive one unique QR code per event.
  comboEventNames?: string[];
}): { subject: string; html: string; text: string } {
  const name = (p.buyerName ?? "").trim().split(" ")[0] || "there";
  const artist = (p.artistName ?? "").trim();
  const ticketWord = p.qty === 1 ? "ticket" : "tickets";
  const subject = `You're in! ${p.qty} ${ticketWord} to ${p.eventTitle} 🎟️`;
  const comboNames = (p.comboEventNames ?? []).filter(Boolean);
  const isCombo = comboNames.length >= 2;

  // Combo callout — make it unmistakable that this one order yields a separate
  // QR per event, so a buyer knows to show the matching code at each door.
  const comboNote = isCombo ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#FCF3DF;border:1px solid #F0D69A;border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:14px;font-weight:700;color:#8A5A00;">✨ Combo ticket — ${comboNames.length} QR codes, one per event</p>
      <p style="margin:0;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};line-height:1.5;">You'll get a <strong>separate, unique QR code for each event</strong> (${comboNames.join(" · ")}). Open your tickets in the app and show the QR that matches the event you're attending — each door only scans its own code.</p>
    </td></tr></table>` : "";

  // Event summary panel with a directions link.
  const eventPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:${C.ivory};border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 ${artist ? 2 : 6}px;font-family:${FONT_BODY};font-size:16px;font-weight:700;color:${C.ink};">${p.eventTitle}</p>
      ${artist ? `<p style="margin:0 0 6px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">🎤 ${artist}</p>` : ""}
      ${p.eventWhen ? `<p style="margin:0 0 2px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📅 ${p.eventWhen}</p>` : ""}
      ${p.eventWhere ? `<p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;color:${C.inkMuted};">📍 ${p.eventWhere}</p>` : ""}
      <a href="${p.directionsUrl}" style="font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${C.durga};">Get directions →</a>
    </td></tr></table>`;

  // Pricing breakdown.
  const row = (label: string, value: string, opts?: { bold?: boolean; color?: string }) =>
    `<tr>
      <td style="padding:5px 0;font-family:${FONT_BODY};font-size:${opts?.bold ? 15 : 13}px;${opts?.bold ? "font-weight:700;" : ""}color:${opts?.color ?? C.inkMuted};">${label}</td>
      <td align="right" style="padding:5px 0;font-family:${FONT_BODY};font-size:${opts?.bold ? 15 : 13}px;${opts?.bold ? "font-weight:700;" : ""}color:${opts?.color ?? C.ink};">${value}</td>
    </tr>`;
  const subtotal = p.unitPrice * p.qty;
  const pricing = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#fff;border:1px solid ${C.ivory200};border-radius:14px;">
    <tr><td style="padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row(`${p.tierName || "Ticket"} · ${p.qty} ${ticketWord}`, `$${money(subtotal)}`)}
        ${p.discountAmount > 0 ? row(`Group discount${p.discountPct ? ` (${p.discountPct}%)` : ""}`, `−$${money(p.discountAmount)}`, { color: C.peacock }) : ""}
        ${p.rameeloFee > 0 ? row("Service fee", `$${money(p.rameeloFee)}`) : ""}
        ${p.processingFee > 0 ? row("Processing fee", `$${money(p.processingFee)}`) : ""}
        <tr><td colspan="2" style="border-top:1px solid ${C.ivory200};padding-top:2px;"></td></tr>
        ${row("Total paid", `$${money(p.grandTotal)}`, { bold: true, color: C.ink })}
      </table>
    </td></tr></table>`;

  const content = [
    eyebrow(`Order ${p.receiptNum}`),
    h1("Your order is confirmed 🎉"),
    lead(`Hi ${name}, you&rsquo;re all set with <strong>${p.qty} ${ticketWord}</strong>. Here&rsquo;s your receipt and everything you need for the night.`),
    eventPanel,
    comboNote,
    sectionTitle("Order summary"),
    pricing,
    button(p.ticketsUrl, "View my tickets"),
    para(`Your tickets and QR codes live in your Rameelo account &mdash; <strong>you&rsquo;ll need to sign in (or create a free account) with this email</strong> to access them.`),
    divider(),
    button(p.buyMoreUrl, "Buy more tickets", "secondary"),
    divider(),
    para("See you on the dance floor. <strong style=\"color:#241C26;\">Garbe ki raat, Rameelo ke saath!</strong> 💃"),
  ].join("");

  const html = renderEmail({
    preheader: `Order ${p.receiptNum} confirmed — ${p.qty} ${ticketWord} to ${p.eventTitle}.`,
    contentHtml: content,
  });

  const text = [
    `Hi ${name},`,
    "",
    `Your order ${p.receiptNum} is confirmed — ${p.qty} ${ticketWord} to ${p.eventTitle}.`,
    isCombo ? `Combo ticket: you'll get ${comboNames.length} unique QR codes, one per event (${comboNames.join(", ")}). Show the QR that matches each event at its door.` : "",
    artist ? `Artist: ${artist}` : "",
    p.eventWhen ? `When: ${p.eventWhen}` : "",
    p.eventWhere ? `Where: ${p.eventWhere}` : "",
    p.directionsUrl ? `Directions: ${p.directionsUrl}` : "",
    "",
    "Order summary:",
    `  ${p.tierName || "Ticket"} x${p.qty}: $${money(subtotal)}`,
    p.discountAmount > 0 ? `  Group discount: -$${money(p.discountAmount)}` : "",
    p.rameeloFee > 0 ? `  Service fee: $${money(p.rameeloFee)}` : "",
    p.processingFee > 0 ? `  Processing fee: $${money(p.processingFee)}` : "",
    `  Total paid: $${money(p.grandTotal)}`,
    "",
    `View your tickets (account required): ${p.ticketsUrl}`,
    `Buy more tickets: ${p.buyMoreUrl}`,
    "",
    `Questions? ${EMAIL.support}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
