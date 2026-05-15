"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyOrders, type PortalOrderRow, type GroupMember } from "@/lib/group-orders";

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

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

// ── Group Members Panel ───────────────────────────────────────────────────────
function GroupMembersPanel({ members, groupId }: { members: GroupMember[]; groupId: string }) {
  const paid = members.filter(m => m.paid).length;
  return (
    <div className="mt-4 rounded-2xl border border-aubergine/15 bg-aubergine/4 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group · {groupId}</p>
        <span className="font-mono text-[10px] text-ink-muted">{paid}/{members.length} paid</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-peacock transition-all"
          style={{ width: `${members.length > 0 ? (paid / members.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="font-ui text-sm text-ink">
                {m.name}
                {m.isOrganizer && (
                  <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Organizer</span>
                )}
              </span>
            </div>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
              {m.paid && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`/group/${groupId}`}
        className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 transition-all"
      >
        View Group Page →
      </Link>
    </div>
  );
}

// ── Ticket Card (per seat) ────────────────────────────────────────────────────
function TicketCard({ orderId, seat, total, eventTitle, tierName }: {
  orderId: string; seat: number; total: number; eventTitle: string; tierName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const ticketId = `${orderId}-T${seat}`;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${expanded ? "border-marigold/30 shadow-md" : "border-ivory-200"} bg-white`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: "#2E1B30" }}>
          T{seat}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-ink text-sm">{ticketId}</p>
            <span className="font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-bold bg-peacock/10 border-peacock/20 text-peacock">
              In Your Wallet
            </span>
          </div>
          <p className="font-ui text-xs text-ink-muted">{tierName} · Ticket {seat} of {total}</p>
        </div>
        <svg className={`w-4 h-4 text-ink-muted transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-4" />
          <div className="px-4 pb-4 pt-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-2xl border-2 border-marigold/20 bg-white shadow-sm">
                  <QRCode value={ticketId} size={150} />
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-ink text-sm">{ticketId}</p>
                  <p className="font-mono text-[10px] text-ink-muted">Ticket {seat} of {total}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-peacock/10 border border-peacock/20">
                  <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
                  <p className="font-mono text-[10px] text-peacock font-bold uppercase tracking-wide">Valid</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticket Details</p>
                {[
                  { label: "Event", value: eventTitle },
                  { label: "Type", value: tierName },
                  { label: "Ticket ID", value: ticketId },
                ].map(row => (
                  <div key={row.label} className="flex gap-2 py-1.5 border-b border-ivory-200 last:border-0">
                    <span className="font-ui text-xs text-ink-muted w-16 shrink-0">{row.label}</span>
                    <span className="font-ui text-xs font-semibold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: PortalOrderRow }) {
  const dateISO = order.eventDate;
  const isUpcoming = dateISO >= new Date().toISOString().slice(0, 10);
  const [expanded, setExpanded] = useState(isUpcoming);

  const daysUntil = isUpcoming
    ? Math.ceil((new Date(dateISO + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;

  const artistInitials = order.artistName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colorIndex = (order.artistName.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const artistColor = AVATAR_COLORS[colorIndex];

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${expanded ? "border-marigold/30 shadow-md" : "border-ivory-200 hover:border-marigold/20"} bg-white`}>
      {/* Order header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: artistColor }} />
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
                {order.artistName && <p className="font-ui text-xs text-ink-muted">{order.artistName}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span className="font-ui text-xs text-ink-muted">📅 {fmtDate(order.eventDate)}</span>
                  {order.venue && <span className="font-ui text-xs text-ink-muted">📍 {order.venue}, {order.city}</span>}
                  <span className="font-ui text-xs text-ink-muted">🎟️ {order.qty} × {order.tierName}</span>
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

      {expanded && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-5" />
          <div className="px-5 py-4 space-y-3">
            {/* Quick info */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/10">
              <svg className="w-3.5 h-3.5 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="font-ui text-xs text-ink-muted">
                Each ticket has its own QR code. Tap to expand and show at entry.
              </p>
            </div>

            {/* Individual ticket QR cards */}
            <div className="space-y-2">
              {Array.from({ length: order.qty }).map((_, i) => (
                <TicketCard
                  key={i}
                  orderId={order.orderId}
                  seat={i + 1}
                  total={order.qty}
                  eventTitle={order.eventTitle}
                  tierName={order.tierName}
                />
              ))}
            </div>

            {/* Group members panel */}
            {order.groupId && order.groupMembers && order.groupMembers.length > 0 && (
              <GroupMembersPanel members={order.groupMembers} groupId={order.groupId} />
            )}

            {/* Price summary + receipt link */}
            <div className="flex items-center justify-between pt-2 border-t border-ivory-200">
              <div>
                <p className="font-mono text-[10px] text-ink-muted">
                  Total paid · #{order.orderId.slice(-6).toUpperCase()}
                </p>
                <Link
                  href={`/portal/tickets/${order.orderId}`}
                  className="font-mono text-[10px] text-aubergine hover:underline flex items-center gap-1 mt-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View receipt
                </Link>
              </div>
              <p className="font-display font-bold text-ink">${order.grandTotal.toLocaleString()}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [orders, setOrders] = useState<PortalOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      loadMyOrders(user.id).then(data => {
        setOrders(data);
        setLoading(false);
      });
    });
  }, []);

  const filtered = orders.filter(o => {
    if (filter === "upcoming") return o.eventDate >= today;
    if (filter === "past")     return o.eventDate < today;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">My Tickets</h1>
          <p className="font-ui text-ink-muted text-sm">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "past", "all"] as const).map(f => (
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

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-display text-xl font-bold text-ink mb-2">
            {orders.length === 0 ? "No tickets yet" : `No ${filter} tickets`}
          </p>
          <p className="font-ui text-ink-muted text-sm mb-6">
            {orders.length === 0
              ? "Your tickets will appear here after purchase."
              : "Adjust the filter to see other tickets."}
          </p>
          <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
            Browse events →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => <OrderCard key={order.orderId} order={order} />)}
        </div>
      )}

      <div className="rounded-2xl p-6 text-center border-2 border-dashed border-ivory-200">
        <p className="font-display font-bold text-ink text-lg mb-1">Find your next night</p>
        <p className="font-ui text-ink-muted text-sm mb-4">100+ events this Navratri season across the US.</p>
        <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
          Browse events →
        </Link>
      </div>
    </div>
  );
}
