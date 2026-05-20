"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORM_FEE_PCT    = 0.03;
const CHARGEBACK_RESERVE  = 0.20;  // 20% held as chargeback buffer
const AVAILABLE_PCT       = 1 - CHARGEBACK_RESERVE; // 80% released
const RESERVE_HOLD_DAYS   = 30;    // reserve releases 30 days after event

// ── Types ──────────────────────────────────────────────────────────────────────

type PayoutSchedule = "weekly" | "monthly";
type PayoutStatus   = "paid" | "processing" | "scheduled" | "on_hold";

type PayoutRecord = {
  id: string;
  event_name: string;
  event_date: string;       // ISO date of event
  gross_revenue: number;    // total ticket sales
  platform_fee: number;     // 3%
  net_to_organizer: number; // gross × 0.97
  reserve: number;          // net × 0.20
  payout_amount: number;    // net × 0.80
  status: PayoutStatus;
  payout_date: string;
  stripe_payout_id?: string;
  tickets_sold: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcNet(gross: number) {
  const platform_fee     = Math.round(gross * PLATFORM_FEE_PCT * 100) / 100;
  const net_to_organizer = Math.round((gross - platform_fee) * 100) / 100;
  const reserve          = Math.round(net_to_organizer * CHARGEBACK_RESERVE * 100) / 100;
  const payout_amount    = Math.round(net_to_organizer * AVAILABLE_PCT * 100) / 100;
  return { platform_fee, net_to_organizer, reserve, payout_amount };
}

function nextPayoutDate(schedule: PayoutSchedule): Date {
  const now = new Date();
  if (schedule === "weekly") {
    const day = now.getDay();
    const daysUntilFriday = ((5 - day + 7) % 7) || 7;
    return new Date(now.getTime() + daysUntilFriday * 86_400_000);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function reserveReleaseDate(eventDate: string): Date {
  return new Date(new Date(eventDate).getTime() + RESERVE_HOLD_DAYS * 86_400_000);
}

function isReserveReleased(eventDate: string): boolean {
  return new Date() > reserveReleaseDate(eventDate);
}

// ── Mock test data (reflects 80/20 split) ─────────────────────────────────────

const MOCK_RECORDS: PayoutRecord[] = [
  {
    id: "po_001",
    event_name: "Navratri Night 2026 – Night 1",
    event_date: "2026-03-15",
    gross_revenue: 4525.00,
    ...calcNet(4525.00),
    status: "paid",
    payout_date: "2026-04-18",
    stripe_payout_id: "po_3PxKL2RGF9Y7kCzN0001",
    tickets_sold: 148,
  },
  {
    id: "po_002",
    event_name: "Garba Raas Championship – Qualifier",
    event_date: "2026-03-28",
    gross_revenue: 3930.00,
    ...calcNet(3930.00),
    status: "paid",
    payout_date: "2026-04-11",
    stripe_payout_id: "po_3PxKL2RGF9Y7kCzN0002",
    tickets_sold: 132,
  },
  {
    id: "po_003",
    event_name: "Holi Color Run 2026",
    event_date: "2026-04-14",
    gross_revenue: 2040.00,
    ...calcNet(2040.00),
    status: "paid",
    payout_date: "2026-03-29",
    stripe_payout_id: "po_3PxKL2RGF9Y7kCzN0005",
    tickets_sold: 67,
  },
  {
    id: "po_004",
    event_name: "Bhangra Blast – Spring Edition",
    event_date: "2026-05-10",
    gross_revenue: 2270.00,
    ...calcNet(2270.00),
    status: "processing",
    payout_date: "2026-05-17",
    tickets_sold: 76,
  },
  {
    id: "po_005",
    event_name: "Desi Night – Houston Takeover",
    event_date: "2026-05-18",
    gross_revenue: 5985.00,
    ...calcNet(5985.00),
    status: "scheduled",
    payout_date: "2026-05-24",
    tickets_sold: 195,
  },
];

// Balance calculator: from orders, split into cleared/in-transit/upcoming
function buildBalance(records: PayoutRecord[]) {
  const paid       = records.filter(r => r.status === "paid");
  const processing = records.filter(r => r.status === "processing");
  const scheduled  = records.filter(r => r.status === "scheduled");

  // For paid: reserves have already released (paid > 30 days ago)
  // For still-pending events: only count cleared events' reserves
  const totalPaidGross  = paid.reduce((s, r) => s + r.gross_revenue, 0);
  const { net_to_organizer: totalPaidNet, reserve: totalPaidReserve } = calcNet(totalPaidGross);

  // Cleared = paid payouts that are done, reserve already released
  const totalPaidOut = paid.reduce((s, r) => s + r.payout_amount, 0);

  // In-transit
  const inTransit = processing.reduce((s, r) => s + r.payout_amount, 0);
  const inTransitReserve = processing.reduce((s, r) => s + r.reserve, 0);

  // Upcoming (scheduled) — 80% of net available, 20% still held
  const upcomingAvailable = scheduled.reduce((s, r) => s + r.payout_amount, 0);
  const upcomingReserve   = scheduled.reduce((s, r) => s + r.reserve, 0);

  // Reserve held: from in-transit + upcoming (paid ones already released)
  const totalReserveHeld = inTransitReserve + upcomingReserve;

  // Find next reserve release (earliest event date + 30 days from in-transit/upcoming)
  const pendingEvents = [...processing, ...scheduled].sort((a, b) => a.event_date.localeCompare(b.event_date));
  const nextRelease = pendingEvents.length > 0 ? reserveReleaseDate(pendingEvents[0].event_date) : null;

  return {
    totalPaidOut,
    inTransit,
    upcomingAvailable,
    totalReserveHeld,
    nextRelease,
  };
}

// ── Status meta ────────────────────────────────────────────────────────────────

const STATUS_META: Record<PayoutStatus, { label: string; cls: string; dot: string }> = {
  paid:       { label: "Paid",       cls: "bg-peacock/12 text-peacock",    dot: "bg-peacock"      },
  processing: { label: "Processing", cls: "bg-marigold/15 text-[#a06b00]", dot: "bg-marigold"     },
  scheduled:  { label: "Scheduled",  cls: "bg-aubergine/10 text-aubergine",dot: "bg-aubergine/50" },
  on_hold:    { label: "On Hold",    cls: "bg-durga/12 text-durga",         dot: "bg-durga"        },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function BalanceCard({
  label, value, sub, subColor, accent, icon
}: { label: string; value: string; sub?: string; subColor?: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted leading-tight">{label}</p>
        <span className="shrink-0 text-ink-muted/30">{icon}</span>
      </div>
      <p className="font-display font-bold" style={{ fontSize: 26, letterSpacing: "-0.03em", color: accent, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p className="font-mono text-[9px] mt-1.5 leading-snug" style={{ color: subColor ?? "#999" }}>{sub}</p>}
    </div>
  );
}

function ScheduleSettings({ schedule, onChange }: {
  schedule: PayoutSchedule;
  onChange: (s: PayoutSchedule) => void;
}) {
  const next = nextPayoutDate(schedule);
  const daysUntil = Math.ceil((next.getTime() - Date.now()) / 86_400_000);
  const cutoffLabel = schedule === "weekly"
    ? "Sales from Mon–Thu included · Fri cutoff"
    : `Sales through ${next.toLocaleDateString("en-US", { month: "long" })} ${new Date(next.getTime() - 86_400_000).getDate()} included`;

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Payout schedule</p>
        <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
          When do you get paid?
        </p>
      </div>
      <div className="p-5 space-y-3">
        {(["weekly", "monthly"] as const).map(opt => {
          const active = schedule === opt;
          const nextDate = nextPayoutDate(opt);
          return (
            <label
              key={opt}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${active ? "border-peacock/30 bg-peacock/5" : "border-ivory-200 hover:border-aubergine/20"}`}
            >
              <input
                type="radio"
                name="schedule"
                value={opt}
                checked={active}
                onChange={() => onChange(opt)}
                className="mt-0.5 accent-peacock shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-ui font-semibold text-ink text-sm capitalize">{opt}</p>
                <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                  {opt === "weekly" ? "Every Friday · sales from prior Mon–Thu" : "1st of each month · prior month sales"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[10px] text-ink-muted">Next payout</p>
                <p className="font-ui font-semibold text-ink text-xs mt-0.5">
                  {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </label>
          );
        })}

        <div className="mt-1 px-3 py-2.5 rounded-xl bg-ivory border border-ivory-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-ui font-semibold text-ink text-sm">
                Next payout: {next.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="font-mono text-[10px] text-ink-muted mt-0.5">{cutoffLabel}</p>
            </div>
            <span className="font-mono text-[10px] font-bold text-peacock bg-peacock/10 px-2.5 py-1 rounded-full shrink-0 ml-3">
              {daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 bg-ivory border-t border-ivory-200 flex items-center justify-between gap-3">
        <p className="font-mono text-[9px] text-ink-muted/60">
          20% held {RESERVE_HOLD_DAYS} days post-event as chargeback reserve · released automatically
        </p>
        <button className="font-ui text-xs font-semibold text-peacock hover:text-peacock/80 transition-colors shrink-0">
          Save
        </button>
      </div>
    </div>
  );
}

function ReserveExplainer({ totalReserve, nextRelease }: { totalReserve: number; nextRelease: Date | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-marigold/8 border border-marigold/20 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#a06b00] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="font-ui font-semibold text-[#a06b00] text-sm">
              {fmtCurrency(totalReserve)} held as chargeback reserve
            </p>
            <p className="font-mono text-[10px] text-[#a06b00]/70 mt-0.5">
              20% of pending net earnings · protects against disputes
              {nextRelease && ` · next release ${fmtDateShort(nextRelease.toISOString())}`}
            </p>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="font-mono text-[10px] text-[#a06b00] underline shrink-0">
          {open ? "less" : "why?"}
        </button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-marigold/20 space-y-1.5">
          {[
            ["What is it?", "20% of your net payout is temporarily held to cover any chargebacks or disputes that arise after an event."],
            ["When is it released?", `Automatically released ${RESERVE_HOLD_DAYS} days after the event date, once the chargeback window has passed.`],
            ["Do I lose it?", "No — it's always yours. It's only used if a card dispute is filed. You receive it in your next regular payout cycle."],
          ].map(([q, a]) => (
            <div key={q as string}>
              <p className="font-ui text-xs font-semibold text-[#a06b00]">{q}</p>
              <p className="font-mono text-[10px] text-[#a06b00]/70 mt-0.5">{a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutRow({ record, onClick }: { record: PayoutRecord; onClick: () => void }) {
  const meta = STATUS_META[record.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-ivory transition-colors group border-b border-ivory-200 last:border-0"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${meta.cls}`}>
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-ui font-semibold text-ink text-sm truncate">{record.event_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-ink-muted">{fmtDateShort(record.payout_date)}</span>
          <span className="text-ink-muted/30">·</span>
          <span className="font-mono text-[10px] text-ink-muted">{record.tickets_sold} tickets</span>
          <span className="text-ink-muted/30">·</span>
          <span className="font-mono text-[10px] text-ink-muted/60">reserve {fmtCurrency(record.reserve)}</span>
        </div>
      </div>
      <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest shrink-0 ${meta.cls}`}>
        <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      <div className="text-right shrink-0">
        <p className={`font-display font-bold text-base ${record.status === "paid" ? "text-peacock" : "text-ink"}`} style={{ letterSpacing: "-0.02em" }}>
          {fmtCurrency(record.payout_amount)}
        </p>
        <p className="font-mono text-[9px] text-ink-muted">80% of net</p>
      </div>
      <svg className="w-4 h-4 text-ink-muted/30 group-hover:text-ink-muted transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function PayoutDetail({ record, onClose }: { record: PayoutRecord; onClose: () => void }) {
  const meta = STATUS_META[record.status];
  const releaseDate = reserveReleaseDate(record.event_date);
  const released = isReserveReleased(record.event_date);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Payout breakdown</p>
            <p className="font-display font-semibold text-ink text-sm mt-0.5 truncate max-w-[260px]" style={{ letterSpacing: "-0.015em" }}>
              {record.event_name}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          {[
            { label: "Gross ticket revenue",     value: fmtCurrency(record.gross_revenue),     color: "text-ink",        note: `${record.tickets_sold} tickets sold` },
            { label: "Platform fee (3%)",         value: `−${fmtCurrency(record.platform_fee)}`, color: "text-ink-muted",  note: "Rameelo service fee" },
            { label: "Net to you",                value: fmtCurrency(record.net_to_organizer),  color: "text-ink font-semibold", note: "After 3% fee", divider: true },
            { label: "Chargeback reserve (20%)",  value: `−${fmtCurrency(record.reserve)}`,      color: released ? "text-peacock" : "text-[#a06b00]", note: released ? "Released — included in next payout" : `Held until ${fmtDateShort(releaseDate.toISOString())}` },
            { label: "Paid out (80%)",            value: fmtCurrency(record.payout_amount),    color: "text-peacock font-bold", note: "Deposited to your bank", divider: true },
          ].map((row, i) => (
            <div key={row.label}>
              {row.divider && <div className="border-t border-ivory-200 pt-3 -mt-0" />}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-ui text-sm ${row.color.includes("bold") ? "font-semibold text-ink" : "text-ink-muted"}`}>{row.label}</p>
                  <p className="font-mono text-[9px] text-ink-muted/60 mt-0.5">{row.note}</p>
                </div>
                <p className={`font-display font-bold text-sm shrink-0 ${row.color}`} style={{ letterSpacing: "-0.02em" }}>
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 bg-ivory border-t border-ivory-200 space-y-2">
          {[
            { label: "Event date",      value: fmtDate(record.event_date) },
            { label: "Payout date",     value: fmtDate(record.payout_date) },
            { label: "Reserve release", value: released ? "Released" : fmtDate(releaseDate.toISOString()) },
            ...(record.stripe_payout_id ? [{ label: "Stripe ID", value: record.stripe_payout_id }] : []),
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">{row.label}</p>
              <p className="font-mono text-[10px] text-ink font-medium">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-3">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const [records] = useState<PayoutRecord[]>(MOCK_RECORDS);
  const [schedule, setSchedule] = useState<PayoutSchedule>("monthly");
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");
  const [selected, setSelected] = useState<PayoutRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate load; replace with real Supabase + Stripe Connect fetch
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const balance = buildBalance(records);
  const filtered = filter === "all" ? records : records.filter(r => r.status === filter);

  const FILTERS: { key: "all" | PayoutStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "processing", label: "Processing" },
    { key: "scheduled", label: "Scheduled" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Test mode banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-marigold/10 border border-marigold/20">
        <svg className="w-4 h-4 text-[#a06b00] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-mono text-[10px] text-[#a06b00]">
          Test mode · Data is simulated. Stripe Connect required for live payouts.
        </p>
      </div>

      {/* Balance overview (4-cell grid) */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">Your Balance</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BalanceCard
            label="Available now"
            value={fmtCurrency(balance.upcomingAvailable)}
            sub="Ready for next payout"
            accent="#0E8C7A"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
          <BalanceCard
            label="Reserve held"
            value={fmtCurrency(balance.totalReserveHeld)}
            sub={balance.nextRelease ? `Releases ${fmtDateShort(balance.nextRelease.toISOString())}` : "No holds"}
            subColor="#a06b00"
            accent="#a06b00"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          />
          <BalanceCard
            label="In transit"
            value={fmtCurrency(balance.inTransit)}
            sub="2–3 biz days to bank"
            accent="#2E1B30"
            icon={<svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <BalanceCard
            label="Total paid out"
            value={fmtCurrency(balance.totalPaidOut)}
            sub={`${records.filter(r => r.status === "paid").length} payouts complete`}
            accent="#2E1B30"
            icon={<svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          />
        </div>
      </div>

      {/* Reserve explainer */}
      <ReserveExplainer totalReserve={balance.totalReserveHeld} nextRelease={balance.nextRelease} />

      {/* Payout schedule + bank account row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Schedule */}
        <ScheduleSettings schedule={schedule} onChange={setSchedule} />

        {/* Bank account */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ivory-200">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Payout destination</p>
            <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
              Bank Account
            </p>
          </div>
          <div className="px-5 py-4 flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-ivory border border-ivory-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui font-semibold text-ink text-sm">Chase Business Checking</p>
              <p className="font-mono text-xs text-ink-muted mt-0.5">••••  ••••  ••••  7892</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-peacock/10 text-peacock font-mono text-[9px] font-bold uppercase tracking-widest shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-peacock" />
              Active
            </span>
          </div>
          <div className="px-5 py-3 bg-ivory border-t border-ivory-200">
            <Link
              href="/organizer/organization"
              className="font-ui text-xs font-semibold text-peacock hover:text-peacock/80 transition-colors"
            >
              Manage bank account in Organization settings →
            </Link>
          </div>
        </div>
      </div>

      {/* Payout history */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">History</p>
            <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
              Payout History
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f.key ? "bg-aubergine text-white" : "bg-ivory text-ink-muted hover:text-ink"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-ui text-sm text-ink-muted">No payouts match this filter.</p>
          </div>
        ) : (
          filtered.map(r => <PayoutRow key={r.id} record={r} onClick={() => setSelected(r)} />)
        )}

        <div className="px-5 py-3 bg-ivory border-t border-ivory-200">
          <p className="font-mono text-[10px] text-ink-muted/50 text-center">
            80% paid out per cycle · 20% held {RESERVE_HOLD_DAYS} days as chargeback reserve · 3% Rameelo fee deducted before split
          </p>
        </div>
      </div>

      {selected && <PayoutDetail record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
