// ── Chargeback evidence documents (client-side PDF generation) ────────────────
import { jsPDF } from "jspdf";
import QRLib from "qrcode";

export type EvidenceData = {
  receipt: string;
  generatedAt: string;
  customer: { name: string; email: string; phone: string | null; account: string; city: string | null; state: string | null; memberSince: string | null };
  order: { id: string; placedAt: string; status: string; qty: number; tierName: string; groupId: string | null };
  event: { title: string; date: string; time: string | null; venue: string | null; city: string | null; state: string | null };
  payment: { method: string; unitPrice: number; discount: number; rameeloFee: number; processingFee: number; total: number };
  ticket: { qrPayload: string; checkedIn: number; checkedInAt: string | null; firstViewedAt: string | null; lastViewedAt: string | null; walletGeneratedAt: string | null; walletDownloadedAt: string | null };
  login: { lastLoginAt: string | null; totalLogins: number | null; confirmationEmailAt: string | null };
  ip: { purchase: string | null; termsAccepted: string | null };
  terms: { version: string | null; acceptedAt: string | null; acceptedIp: string | null; text: string };
  transfers: { to: string; status: string; qty: number; sentAt: string; acceptedAt: string | null }[];
  timeline: { ts: string; label: string }[];
};

function money(n: number) { return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function ts(s: string | null) { return s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }

function pdfDoc(docTitle: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };

  // Brand header on page 1
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(46, 27, 48);
  doc.text("Rameelo", M, y); doc.setTextColor(245, 166, 35); doc.text(".", M + doc.getTextWidth("Rameelo"), y);
  doc.setTextColor(120); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("Chargeback evidence", W - M, y - 8, { align: "right" });
  doc.setTextColor(20); y += 22;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(docTitle, M, y); y += 6;
  doc.setDrawColor(245, 166, 35); doc.setLineWidth(2); doc.line(M, y, M + 60, y); doc.setLineWidth(0.5); y += 18;

  return {
    doc,
    heading(t: string) { y += 6; ensure(24); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(124, 31, 44); doc.text(t.toUpperCase(), M, y); doc.setTextColor(20); y += 5; doc.setDrawColor(225); doc.line(M, y, W - M, y); y += 13; },
    row(label: string, value: string) { doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); const lines = doc.splitTextToSize(value || "—", W - M - M - 150) as string[]; ensure(lines.length * 13); doc.setTextColor(110); doc.text(label, M, y); doc.setTextColor(25); doc.text(lines, M + 150, y); y += lines.length * 13 + 2; },
    bullet(t: string) { doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); const lines = doc.splitTextToSize(t, W - 2 * M - 16) as string[]; ensure(lines.length * 13); doc.setTextColor(25); doc.text("•", M, y); doc.text(lines, M + 16, y); y += lines.length * 13 + 2; },
    para(t: string, size = 8.5) { doc.setFont("helvetica", "normal"); doc.setFontSize(size); const lines = doc.splitTextToSize(t, W - 2 * M) as string[]; ensure(lines.length * (size + 3.5)); doc.setTextColor(70); doc.text(lines, M, y); y += lines.length * (size + 3.5) + 4; doc.setTextColor(20); },
    image(dataUrl: string, w: number, h: number) { ensure(h + 6); doc.addImage(dataUrl, "PNG", M, y, w, h); y += h + 8; },
    gap(n = 8) { y += n; },
    footer(d: EvidenceData) {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150);
        doc.text(`Rameelo · Order ${d.receipt} · Generated ${ts(d.generatedAt)}`, M, H - 24);
        doc.text(`Page ${i} of ${pages}`, W - M, H - 24, { align: "right" });
      }
      doc.setTextColor(20);
    },
    save(name: string) { doc.save(name); },
  };
}

function fileBase(d: EvidenceData) { return d.receipt.replace(/[^A-Za-z0-9-]/g, ""); }

// ── Full evidence package ──
export async function downloadEvidencePackage(d: EvidenceData) {
  const p = pdfDoc("Dispute Evidence Package");

  p.heading("Summary");
  p.para("This package documents the customer's purchase and engagement with the ticket(s) for the order below. It is intended to support the merchant's response to a payment dispute (chargeback).");
  p.row("Order number", d.receipt);
  p.row("Order status", d.order.status);
  p.row("Generated", ts(d.generatedAt));

  p.heading("Customer Information");
  p.row("Name", d.customer.name);
  p.row("Email", d.customer.email);
  p.row("Phone", d.customer.phone ?? "—");
  p.row("Account", d.customer.account);
  p.row("Location", [d.customer.city, d.customer.state].filter(Boolean).join(", ") || "—");
  p.row("Member since", ts(d.customer.memberSince));

  p.heading("Order Details");
  p.row("Placed at", ts(d.order.placedAt));
  p.row("Tickets", `${d.order.qty} × ${d.order.tierName}`);
  if (d.order.groupId) p.row("Group order", d.order.groupId);

  p.heading("Payment Confirmation");
  p.row("Method", d.payment.method.toUpperCase());
  p.row("Unit price", money(d.payment.unitPrice));
  if (d.payment.discount > 0) p.row("Discount", "-" + money(d.payment.discount));
  p.row("Rameelo fee", money(d.payment.rameeloFee));
  p.row("Card processing", money(d.payment.processingFee));
  p.row("Total charged", money(d.payment.total));

  p.heading("Event Details");
  p.row("Event", d.event.title);
  p.row("Date / time", [d.event.date, d.event.time].filter(Boolean).join(" · "));
  p.row("Venue", d.event.venue ?? "—");
  p.row("Location", [d.event.city, d.event.state].filter(Boolean).join(", ") || "—");

  p.heading("Ticket Information & QR Code");
  p.row("Quantity", String(d.order.qty));
  p.row("Tier", d.order.tierName);
  try {
    const qr = await QRLib.toDataURL(d.ticket.qrPayload, { width: 320, margin: 1, color: { dark: "#2E1B30", light: "#ffffff" } });
    p.image(qr, 120, 120);
    p.para(`Ticket QR payload: ${d.ticket.qrPayload}`, 7.5);
  } catch { /* QR optional */ }

  p.heading("Ticket Access History");
  p.row("First viewed", ts(d.ticket.firstViewedAt));
  p.row("Last viewed", ts(d.ticket.lastViewedAt));
  p.row("Apple Wallet generated", ts(d.ticket.walletGeneratedAt));
  p.row("Apple Wallet downloaded", ts(d.ticket.walletDownloadedAt));
  p.row("Confirmation email", ts(d.login.confirmationEmailAt));

  p.heading("Login History");
  p.row("Last login", ts(d.login.lastLoginAt));
  p.row("Total logins", d.login.totalLogins != null ? String(d.login.totalLogins) : "—");

  p.heading("Scan / Check-in History");
  if (d.ticket.checkedIn > 0) {
    p.bullet(`${d.ticket.checkedIn} of ${d.order.qty} ticket(s) checked in at the event.`);
    p.row("Last scanned", ts(d.ticket.checkedInAt));
  } else {
    p.bullet("No tickets from this order were scanned at the event.");
  }

  if (d.transfers.length) {
    p.heading("Ticket Transfers");
    d.transfers.forEach(t => p.bullet(`To ${t.to} — ${t.qty} ticket(s), ${t.status}. Sent ${ts(t.sentAt)}${t.acceptedAt ? `, accepted ${ts(t.acceptedAt)}` : ""}.`));
  }

  p.heading("Customer Activity Timeline");
  d.timeline.forEach(e => p.bullet(`${ts(e.ts)} — ${e.label}`));

  p.heading("IP Address Information");
  p.row("Purchase IP", d.ip.purchase ?? "Not captured");
  p.row("Terms-acceptance IP", d.ip.termsAccepted ?? "Not captured");

  p.heading("Terms & Conditions Accepted");
  p.row("Version", d.terms.version ?? "—");
  p.row("Accepted at", ts(d.terms.acceptedAt));
  p.row("Accepted from IP", d.terms.acceptedIp ?? "—");
  p.gap(4);
  p.para(d.terms.text, 8);

  p.footer(d);
  p.save(`${fileBase(d)}-evidence-package.pdf`);
}

// ── Individual documents ──
export function downloadScanHistory(d: EvidenceData) {
  const p = pdfDoc("Scan / Check-in History");
  p.heading("Order");
  p.row("Order number", d.receipt);
  p.row("Event", d.event.title);
  p.row("Tickets", `${d.order.qty} × ${d.order.tierName}`);
  p.heading("Check-in record");
  if (d.ticket.checkedIn > 0) {
    p.row("Checked in", `${d.ticket.checkedIn} of ${d.order.qty}`);
    p.row("Last scanned", ts(d.ticket.checkedInAt));
  } else {
    p.para("No tickets from this order were scanned at the event door.");
  }
  p.footer(d);
  p.save(`${fileBase(d)}-scan-history.pdf`);
}

export function downloadReceipt(d: EvidenceData) {
  const p = pdfDoc("Order Receipt");
  p.heading("Customer");
  p.row("Name", d.customer.name); p.row("Email", d.customer.email);
  p.heading("Event");
  p.row("Event", d.event.title); p.row("Date", [d.event.date, d.event.time].filter(Boolean).join(" · ")); p.row("Venue", d.event.venue ?? "—");
  p.heading("Order");
  p.row("Order number", d.receipt); p.row("Placed", ts(d.order.placedAt)); p.row("Tickets", `${d.order.qty} × ${d.order.tierName}`);
  p.heading("Payment");
  p.row("Method", d.payment.method.toUpperCase());
  p.row("Unit price", money(d.payment.unitPrice));
  if (d.payment.discount > 0) p.row("Discount", "-" + money(d.payment.discount));
  p.row("Rameelo fee", money(d.payment.rameeloFee));
  p.row("Card processing", money(d.payment.processingFee));
  p.row("Total charged", money(d.payment.total));
  p.footer(d);
  p.save(`${fileBase(d)}-receipt.pdf`);
}

export function downloadTimeline(d: EvidenceData) {
  const p = pdfDoc("Customer Activity Timeline");
  p.heading("Order");
  p.row("Order number", d.receipt); p.row("Customer", d.customer.name); p.row("Event", d.event.title);
  p.heading("Timeline");
  d.timeline.forEach(e => p.bullet(`${ts(e.ts)} — ${e.label}`));
  p.footer(d);
  p.save(`${fileBase(d)}-timeline.pdf`);
}

export function downloadTermsAcceptance(d: EvidenceData) {
  const p = pdfDoc("Terms Acceptance Record");
  p.heading("Acceptance");
  p.row("Order number", d.receipt);
  p.row("Customer", d.customer.name);
  p.row("Terms version", d.terms.version ?? "—");
  p.row("Accepted at", ts(d.terms.acceptedAt));
  p.row("Accepted from IP", d.terms.acceptedIp ?? "—");
  p.heading("Terms & Conditions text");
  p.para(d.terms.text, 9);
  p.footer(d);
  p.save(`${fileBase(d)}-terms-acceptance.pdf`);
}
