"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { SEEDED_TICKETS, type PortalTicket, type IndividualTicket, type IndividualTicketStatus } from "@/lib/auth";

// ── QR Code ──────────────────────────────────────────────────────────────────
function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  const grid = 21;
  let seed = value.split("").reduce((a, c) => (a * 1664525 + c.charCodeAt(0)) & 0x7fffffff, 1013904223);
  function next() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const cells = Array.from({ length: grid }, (_, r) =>
    Array.from({ length: grid }, (__, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7)) {
        const lr = r < 7 ? r : r - (grid - 7);
        const lc = c < 7 ? c : c >= grid - 7 ? c - (grid - 7) : c;
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      }
      return next() > 0.42;
    })
  );
  const cellSize = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", imageRendering: "pixelated" }}>
      <rect width={size} height={size} fill="white" rx={3} />
      {cells.map((row, r) => row.map((on, c) => on ? (
        <rect key={`${r}-${c}`} x={c * cellSize + 0.5} y={r * cellSize + 0.5} width={cellSize - 1} height={cellSize - 1} fill="#2E1B30" rx={0.5} />
      ) : null))}
    </svg>
  );
}

// ── Apple Wallet SVG button ──────────────────────────────────────────────────
function AppleWalletButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-ui font-semibold text-sm hover:bg-zinc-800 active:scale-[0.98] transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z"/>
      </svg>
      Add to Wallet
    </button>
  );
}

// ── Send Ticket Modal ────────────────────────────────────────────────────────
const KNOWN_USERS: Record<string, { firstName: string; lastName: string; initials: string; color: string }> = {
  "rohan@example.com":  { firstName: "Rohan",  lastName: "Shah",   initials: "RS", color: "#0E8C7A" },
  "meera@example.com":  { firstName: "Meera",  lastName: "Desai",  initials: "MD", color: "#D4891B" },
  "kavya@example.com":  { firstName: "Kavya",  lastName: "Nair",   initials: "KN", color: "#5a1e7a" },
  "arjun@example.com":  { firstName: "Arjun",  lastName: "Bhatt",  initials: "AB", color: "#892240" },
};

function SendTicketModal({
  ticket,
  order,
  onClose,
  onSent,
}: {
  ticket: IndividualTicket;
  order: PortalTicket;
  onClose: () => void;
  onSent: (ticketId: string, name: string, email: string) => void;
}) {
  const [step, setStep] = useState<"email" | "details" | "confirm" | "done">("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [foundUser, setFoundUser] = useState<typeof KNOWN_USERS[string] | null>(null);
  const [isNew, setIsNew] = useState(false);

  function checkEmail() {
    const known = KNOWN_USERS[email.toLowerCase()];
    if (known) { setFoundUser(known); setFirstName(known.firstName); setLastName(known.lastName); }
    else { setFoundUser(null); setIsNew(true); }
    setStep("details");
  }

  function handleSend() {
    const name = `${firstName} ${lastName}`;
    onSent(ticket.ticketId, name, email);
    setStep("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between" style={{ backgroundColor: "#2E1B30" }}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-0.5">Sending Ticket</p>
            <p className="font-display font-bold text-white text-sm">{ticket.ticketId} · {order.eventTitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === "done" ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-peacock mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <p className="font-display font-bold text-ink text-xl mb-1">Ticket sent!</p>
                <p className="font-ui text-ink-muted text-sm">
                  <strong>{firstName} {lastName}</strong> needs to accept the ticket.
                  {isNew && " We sent them an invite to create a Rameelo account."}
                </p>
              </div>
              <div className="rounded-xl bg-marigold/10 border border-marigold/20 p-3">
                <p className="font-ui text-xs text-ink-muted">
                  The ticket stays in your order until <strong className="text-ink">{firstName}</strong> accepts. You can cancel the transfer anytime before then.
                </p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                Done
              </button>
            </div>
          ) : step === "email" ? (
            <>
              <div>
                <p className="font-display font-bold text-ink text-lg mb-1">Send to a friend</p>
                <p className="font-ui text-ink-muted text-sm">Enter their email. If they&rsquo;re on Rameelo, it auto-links. Otherwise we&rsquo;ll invite them.</p>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && email.includes("@") && checkEmail()}
                  placeholder="friend@example.com"
                  className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
                  autoFocus
                />
                <p className="font-mono text-[10px] text-ink-muted mt-1.5">Try: rohan@example.com or meera@example.com</p>
              </div>
              <button
                onClick={checkEmail}
                disabled={!email.includes("@")}
                className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all ${email.includes("@") ? "bg-marigold text-aubergine hover:bg-marigold-dark" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
              >
                Check →
              </button>
            </>
          ) : step === "details" ? (
            <>
              {foundUser ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-peacock/8 border border-peacock/20">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: foundUser.color }}>
                    {foundUser.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-ink">{foundUser.firstName} {foundUser.lastName}</p>
                      <span className="font-mono text-[9px] uppercase tracking-wide text-peacock bg-peacock/10 px-1.5 py-0.5 rounded-full">On Rameelo ✓</span>
                    </div>
                    <p className="font-ui text-xs text-ink-muted">{email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-marigold/8 border border-marigold/20">
                    <svg className="w-4 h-4 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="font-ui text-xs text-ink-muted">Not on Rameelo yet. Enter their name and we&rsquo;ll send an invite with the ticket.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block">First name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Priya" className="w-full rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 transition-all" />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block">Last name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Patel" className="w-full rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket being sent */}
              <div className="rounded-xl bg-ivory border border-ivory-200 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: order.artistColor }}>
                  🎟️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-xs font-semibold text-ink">{ticket.ticketId} · {order.ticketType}</p>
                  <p className="font-mono text-[10px] text-ink-muted truncate">{order.eventTitle}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep("email")} className="flex-none px-4 py-3 rounded-xl border border-ivory-200 text-ink-muted font-ui text-sm hover:text-ink transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={!firstName || !lastName}
                  className={`flex-1 py-3 rounded-2xl font-display font-bold text-sm transition-all ${firstName && lastName ? "bg-marigold text-aubergine hover:bg-marigold-dark" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
                >
                  Send Ticket →
                </button>
              </div>
              <p className="font-ui text-[11px] text-ink-muted text-center">
                Ticket stays with you until {firstName || "they"} accepts. You can cancel anytime before that.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Individual Ticket Card ───────────────────────────────────────────────────
function IndividualTicketCard({
  ticket,
  order,
  onSend,
  onWalletAdd,
}: {
  ticket: IndividualTicket;
  order: PortalTicket;
  onSend: (ticket: IndividualTicket) => void;
  onWalletAdd: (ticketId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [walletAdded, setWalletAdded] = useState(false);

  const statusConfig: Record<IndividualTicketStatus, { label: string; color: string; bg: string }> = {
    available:         { label: "In Your Wallet", color: "text-peacock", bg: "bg-peacock/10 border-peacock/20" },
    pending_transfer:  { label: "Pending Acceptance", color: "text-marigold-dark", bg: "bg-marigold/10 border-marigold/25" },
    transferred:       { label: "Transferred", color: "text-ink-muted", bg: "bg-ivory border-ivory-200" },
  };
  const s = statusConfig[ticket.status];

  function handleWallet() {
    setWalletAdded(true);
    onWalletAdd(ticket.ticketId);
    setTimeout(() => setWalletAdded(false), 3000);
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${expanded ? "border-marigold/30 shadow-md" : "border-ivory-200"} bg-white`}>
      {/* Collapsed row */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: order.artistColor }}>
          T{ticket.seat}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-ink text-sm">{ticket.ticketId}</p>
            <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-bold ${s.bg} ${s.color}`}>
              {s.label}
            </span>
          </div>
          {ticket.assignedTo && (
            <p className="font-ui text-xs text-ink-muted">→ {ticket.assignedTo} · {ticket.assignedEmail}</p>
          )}
        </div>
        <svg className={`w-4 h-4 text-ink-muted transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t-2 border-dashed border-ivory-200 mx-4" />
      )}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {/* QR code */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl border-2 border-marigold/20 bg-white shadow-sm">
                <QRCode value={ticket.ticketId} size={150} />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-ink text-sm">{ticket.ticketId}</p>
                <p className="font-mono text-[10px] text-ink-muted">Ticket {ticket.seat} of {order.qty}</p>
              </div>
              {ticket.status === "available" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-peacock/10 border border-peacock/20">
                  <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
                  <p className="font-mono text-[10px] text-peacock font-bold uppercase tracking-wide">Valid</p>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticket Details</p>
                {[
                  { label: "Event", value: order.eventTitle },
                  { label: "Date", value: `${order.date} · ${order.time}` },
                  { label: "Venue", value: `${order.venue}, ${order.city}` },
                  { label: "Type", value: order.ticketType },
                  { label: "Ticket ID", value: ticket.ticketId },
                ].map((row) => (
                  <div key={row.label} className="flex gap-2 py-1.5 border-b border-ivory-200 last:border-0">
                    <span className="font-ui text-xs text-ink-muted w-16 shrink-0">{row.label}</span>
                    <span className="font-ui text-xs font-semibold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {ticket.status === "available" && (
                  <>
                    <AppleWalletButton onAdd={handleWallet} />
                    {walletAdded && (
                      <p className="font-mono text-[10px] text-peacock flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                        Added to Apple Wallet
                      </p>
                    )}
                    <button
                      onClick={() => onSend(ticket)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 text-ink font-ui font-semibold text-sm hover:border-aubergine/30 hover:text-aubergine transition-all w-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                      Send to Friend
                    </button>
                  </>
                )}
                {ticket.status === "pending_transfer" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-marigold/8 border border-marigold/20">
                      <svg className="w-4 h-4 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p className="font-ui text-xs text-ink-muted">
                        Waiting for <strong className="text-ink">{ticket.assignedTo}</strong> to accept.
                      </p>
                    </div>
                    <button className="w-full py-2.5 rounded-xl border border-durga/20 text-durga font-ui font-semibold text-sm hover:bg-durga/5 transition-all">
                      Cancel Transfer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onSend }: { order: PortalTicket; onSend: (ticket: IndividualTicket, order: PortalTicket) => void }) {
  const isUpcoming = order.dateISO >= "2026-05-07";
  const [expanded, setExpanded] = useState(isUpcoming);
  const [tickets, setTickets] = useState(order.tickets);
  const [walletToasts, setWalletToasts] = useState<Set<string>>(new Set());

  const daysUntil = isUpcoming ? Math.ceil((new Date(order.dateISO).getTime() - Date.now()) / 86400000) : null;

  function handleTransfer(ticketId: string, name: string, email: string) {
    setTickets((prev) => prev.map((t) =>
      t.ticketId === ticketId
        ? { ...t, status: "pending_transfer" as const, assignedTo: name, assignedEmail: email }
        : t
    ));
  }

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${expanded ? "border-marigold/30 shadow-md" : "border-ivory-200 hover:border-marigold/20"} bg-white`}>
      {/* Order header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: order.artistColor }} />
          <div className="flex-1 px-5 py-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${isUpcoming ? "bg-peacock/10 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
                    {isUpcoming ? "Upcoming" : "Past"}
                  </span>
                  {order.groupId && (
                    <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-marigold/15 text-marigold-dark">
                      Group Order
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-ink leading-snug mb-0.5">{order.eventTitle}</h3>
                <p className="font-ui text-xs text-ink-muted">{order.artist}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span className="font-ui text-xs text-ink-muted">📅 {order.date} · {order.time}</span>
                  <span className="font-ui text-xs text-ink-muted">📍 {order.venue}, {order.city}</span>
                  <span className="font-ui text-xs text-ink-muted">🎟️ {order.qty} × {order.ticketType} · #{order.orderId}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 border-l border-ivory-200 pl-4 shrink-0">
                {daysUntil !== null ? (
                  <>
                    <p className="font-display font-bold text-aubergine text-2xl leading-none">{daysUntil}</p>
                    <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">days</p>
                  </>
                ) : (
                  <p className="font-mono text-[10px] text-ink-muted">Past</p>
                )}
                <svg className={`w-4 h-4 text-ink-muted mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Group Chat banner — always visible for group orders */}
      {order.groupId && (
        <div className="mx-5 mb-3 mt-0">
          <Link
            href={`/portal/group-chat/${order.groupId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-aubergine/20 hover:border-aubergine/40 transition-all"
            style={{ backgroundColor: "#2E1B300D" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#2E1B30" }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-aubergine text-sm">Group Chat</p>
              <p className="font-ui text-xs text-ink-muted">Chat with your group · 8 members</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-durga rounded-full animate-pulse" />
              <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </div>
          </Link>
        </div>
      )}

      {expanded && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-5" />
          <div className="px-5 py-4 space-y-3">
            {/* Quick actions row */}
            <div className="flex flex-wrap gap-2">
              <Link href={`/portal/events/${order.orderId}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-xs hover:bg-marigold-dark transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Event Details
              </Link>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-ivory-200 text-ink font-ui font-semibold text-xs hover:border-aubergine/30 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Add to Calendar
              </button>
            </div>

            {/* Hint */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/10">
              <svg className="w-3.5 h-3.5 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="font-ui text-xs text-ink-muted">
                Each ticket below has its own unique QR code. Tap to expand, add to Apple Wallet, or send to a friend.
              </p>
            </div>

            {/* Individual tickets */}
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <IndividualTicketCard
                  key={ticket.ticketId}
                  ticket={ticket}
                  order={order}
                  onSend={(t) => onSend(t, order)}
                  onWalletAdd={(id) => {
                    setWalletToasts((prev) => new Set(prev).add(id));
                  }}
                />
              ))}
            </div>

            {/* Transfer state update handled inside IndividualTicketCard */}
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [orders, setOrders] = useState<PortalTicket[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [sendState, setSendState] = useState<{ ticket: IndividualTicket; order: PortalTicket } | null>(null);

  useEffect(() => {
    setOrders(SEEDED_TICKETS);
  }, []);

  function handleSent(ticketId: string, name: string, email: string) {
    setOrders((prev) => prev.map((order) => ({
      ...order,
      tickets: order.tickets.map((t) =>
        t.ticketId === ticketId
          ? { ...t, status: "pending_transfer" as const, assignedTo: name, assignedEmail: email }
          : t
      ),
    })));
    setSendState(null);
  }

  const filtered = orders.filter((o) => {
    if (filter === "upcoming") return o.dateISO >= "2026-05-07";
    if (filter === "past") return o.dateISO < "2026-05-07";
    return true;
  });

  const totalTickets = orders.reduce((acc, o) => acc + o.qty, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {sendState && (
        <SendTicketModal
          ticket={sendState.ticket}
          order={sendState.order}
          onClose={() => setSendState(null)}
          onSent={handleSent}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">My Tickets</h1>
          <p className="font-ui text-ink-muted text-sm">{orders.length} orders · {totalTickets} individual tickets</p>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? "bg-aubergine text-white" : "bg-white border border-ivory-200 text-ink-muted hover:text-ink"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-display text-xl font-bold text-ink mb-2">No {filter} tickets</p>
          <a href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
            Browse events →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              onSend={(ticket, ord) => setSendState({ ticket, order: ord })}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl p-6 text-center border-2 border-dashed border-ivory-200">
        <p className="font-display font-bold text-ink text-lg mb-1">Find your next night</p>
        <p className="font-ui text-ink-muted text-sm mb-4">100+ events this Navratri season across the US.</p>
        <a href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
          Browse events →
        </a>
      </div>
    </div>
  );
}
