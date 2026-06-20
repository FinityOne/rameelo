"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "../create/types";
import EventSubnav from "./EventSubnav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  quantity_comped: number;
};

type EventData = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  doors_open_time: string | null;
  is_multi_day: boolean;
  venue_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string | null;
  status: string;
  selling_on_rameelo: boolean;
  review_note: string | null;
  cover_image_url: string | null;
  cover_gradient: string;
  capacity: number | null;
  ticket_tiers: Tier[];
};

type Order = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  qty: number;
  grand_total: number;
  status: string;
  order_type: string;
  created_at: string;
  ticket_tiers: { name: string } | null;
  combo_tickets: { name: string } | null;
};

type GroupOrder = {
  id: string;
  organizer_name: string;
  target_size: number;
  status: string;
  created_at: string;
  deadline: string;
  ticket_tiers: { name: string } | null;
  group_order_members: { id: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000);
}

// Date-only string (YYYY-MM-DD) without timezone drift
function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmt12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  garba: "Garba", dandiya: "Dandiya", raas: "Raas", workshop: "Workshop", community: "Community", other: "Other",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0">{value}</span>
    </div>
  );
}

// ─── Status configs ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; pillCls: string; bannerCls: string; icon: string; msg: string }> = {
  draft:          { label: "Draft",     pillCls: "bg-ivory-200 text-ink-muted",   bannerCls: "bg-ivory border-ivory-200",        icon: "📝", msg: "This event is a draft. Submit it for review when ready." },
  pending_review: { label: "In Review", pillCls: "bg-marigold/20 text-[#a06b00]", bannerCls: "bg-marigold/8 border-marigold/25",  icon: "🔍", msg: "Your event is under review. You can still edit — changes are visible to our team." },
  published:      { label: "Published", pillCls: "bg-peacock/15 text-peacock",     bannerCls: "bg-peacock/8 border-peacock/20",   icon: "✅", msg: "Your event is live." },
  rejected:       { label: "Rejected",  pillCls: "bg-durga/15 text-durga",         bannerCls: "bg-durga/6 border-durga/20",       icon: "❌", msg: "Your event was rejected. Fix the issues below and resubmit." },
  cancelled:      { label: "Cancelled", pillCls: "bg-ivory-200 text-ink-muted",   bannerCls: "bg-ivory border-ivory-200",        icon: "🚫", msg: "This event has been cancelled." },
};

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]" },
  refunded:  { label: "Refunded",  cls: "bg-durga/15 text-durga" },
  cancelled: { label: "Cancelled", cls: "bg-ivory-200 text-ink-muted" },
};

const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  open:      { label: "Open",      cls: "bg-peacock/15 text-peacock" },
  confirmed: { label: "Confirmed", cls: "bg-aubergine/15 text-aubergine" },
  closed:    { label: "Closed",    cls: "bg-ivory-200 text-ink-muted" },
  cancelled: { label: "Cancelled", cls: "bg-durga/15 text-durga" },
};

// ─── Radial ring ──────────────────────────────────────────────────────────────

function RadialRing({ pct, size = 48, stroke = 4.5, color = "#0E8C7A" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(1, pct / 100);
  const cx = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EBE6DB" strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold text-ink" style={{ fontSize: size * 0.22, letterSpacing: "-0.03em" }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ev, setEv]                   = useState<EventData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentGroups, setRecentGroups] = useState<GroupOrder[]>([]);
  const [orderCount, setOrderCount]   = useState(0);
  const [groupCount, setGroupCount]   = useState(0);
  const [comboStats, setComboStats]   = useState<{ tickets: number; revenue: number; orders: number }>({ tickets: 0, revenue: 0, orders: 0 });
  const [manualStats, setManualStats] = useState<{ tickets: number; revenue: number; orders: number }>({ tickets: 0, revenue: 0, orders: 0 });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [evRes, ordRes, grpRes, comboRes, manualRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, category, artist, description, start_date, end_date, start_time, end_time, doors_open_time, is_multi_day, venue_name, address_line1, address_line2, city, state, zip, status, selling_on_rameelo, review_note, cover_image_url, cover_gradient, capacity, ticket_tiers(id, name, price, quantity, quantity_sold, quantity_comped)")
          .eq("id", id)
          .eq("organizer_id", user.id)
          .single(),

        supabase
          .from("orders")
          .select("id, buyer_name, buyer_email, qty, grand_total, status, order_type, created_at, ticket_tiers(name), combo_tickets(name)", { count: "exact" })
          .eq("event_id", id)
          .eq("is_test", false)
          .neq("status", "pending")   // organizers only see paid orders, never pending ones
          .order("created_at", { ascending: false })
          .limit(5),

        supabase
          .from("group_orders")
          .select("id, organizer_name, target_size, status, created_at, deadline, ticket_tiers(name), group_order_members(id)", { count: "exact" })
          .eq("event_id", id)
          .order("created_at", { ascending: false })
          .limit(5),

        // Combo-ticket sales anchored to this event (org-spanning bundles bought here).
        supabase
          .from("orders")
          .select("qty, unit_price, discount_amount")
          .eq("event_id", id)
          .eq("order_type", "combo")
          .eq("is_test", false)
          .eq("status", "confirmed"),

        // Manual / offline orders anchored to this event (settled by the organizer).
        supabase
          .from("orders")
          .select("qty, grand_total")
          .eq("event_id", id)
          .eq("order_type", "manual")
          .eq("is_test", false)
          .eq("status", "confirmed"),
      ]);

      if (!evRes.data) { router.replace("/organizer/events"); return; }

      setEv(evRes.data as EventData);
      setRecentOrders((ordRes.data ?? []) as unknown as Order[]);
      setOrderCount(ordRes.count ?? 0);
      setRecentGroups((grpRes.data ?? []) as unknown as GroupOrder[]);
      setGroupCount(grpRes.count ?? 0);
      const comboRows = (comboRes.data ?? []) as { qty: number; unit_price: number; discount_amount: number | null }[];
      setComboStats({
        tickets: comboRows.reduce((s, o) => s + o.qty, 0),
        revenue: comboRows.reduce((s, o) => s + (o.qty * o.unit_price - (o.discount_amount ?? 0)), 0),
        orders: comboRows.length,
      });
      const manualRows = (manualRes.data ?? []) as { qty: number; grand_total: number | null }[];
      setManualStats({
        tickets: manualRows.reduce((s, o) => s + o.qty, 0),
        revenue: manualRows.reduce((s, o) => s + (Number(o.grand_total) || 0), 0),
        orders: manualRows.length,
      });
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!ev) return null;

  const tiers        = ev.ticket_tiers ?? [];
  // quantity_sold is PAID purchases only; comps are tracked separately in
  // quantity_comped and never consume for-sale inventory or count as revenue.
  const totalSold    = tiers.reduce((s, t) => s + t.quantity_sold, 0);
  const totalComped  = tiers.reduce((s, t) => s + (t.quantity_comped ?? 0), 0);
  const totalCap     = tiers.reduce((s, t) => s + t.quantity, 0);
  const grossRev     = tiers.reduce((s, t) => s + t.quantity_sold * t.price, 0);
  const maxRev       = tiers.reduce((s, t) => s + t.quantity * t.price, 0);
  const fillPct      = totalCap > 0 ? (totalSold / totalCap) * 100 : 0;
  const revPct       = maxRev > 0 ? (grossRev / maxRev) * 100 : 0;
  const days         = daysUntil(ev.start_date);
  const fillColor    = fillPct >= 80 ? "#7C1F2C" : fillPct >= 50 ? "#0E8C7A" : "#D4891B";
  const statusMeta   = STATUS_META[ev.status] ?? STATUS_META.draft;
  const gradient     = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];

  // Combo tickets are an org product sold here (anchored to this event); their revenue
  // counts toward this event's total but stays out of the tier sellout progress bar.
  const revenueTotal = grossRev + comboStats.revenue;
  const ticketsTotal = totalSold + comboStats.tickets;
  const soldSub = [
    `of ${totalCap.toLocaleString()} total`,
    totalComped > 0 ? `${totalComped} comp` : null,
    comboStats.tickets > 0 ? `${comboStats.tickets} combo` : null,
    manualStats.tickets > 0 ? `${manualStats.tickets} manual` : null,
  ].filter(Boolean).join(" · ");

  const revenueSub = manualStats.revenue > 0
    ? `+ ${fmtCurrency(manualStats.revenue)} manual / offline`
    : comboStats.revenue > 0 ? `incl. ${fmtCurrency(comboStats.revenue)} combo` : `of ${fmtCurrency(maxRev)} potential`;

  const kpis = [
    { label: "Revenue", value: fmtCurrency(revenueTotal), sub: revenueSub, color: "#0E8C7A", icon: "💰" },
    { label: "Tickets Sold", value: ticketsTotal.toLocaleString(), sub: soldSub, color: "#2E1B30", icon: "🎟️" },
    { label: "Fill Rate", value: `${Math.round(fillPct)}%`, sub: fillPct >= 80 ? "Almost sold out!" : fillPct >= 50 ? "Good momentum" : "Still growing", color: fillColor, icon: "📊" },
    { label: "Total Orders", value: orderCount.toLocaleString(), sub: totalComped > 0 ? "incl. comp tickets" : "individual orders", color: "#2E1B30", icon: "🧾" },
    { label: "Group Orders", value: groupCount.toLocaleString(), sub: "group links created", color: "#3D2543", icon: "👥" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/organizer/events"
              className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Events
            </Link>
            <span className="text-ink-muted/40 text-xs">/</span>
            <span className="font-ui text-xs text-ink truncate max-w-[220px]">{ev.title}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{ev.title}</h1>
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusMeta.pillCls}`}>
              {statusMeta.label}
            </span>
            {days > 0 && (
              <span className="font-mono text-[10px] text-ink-muted">
                {days}d away · {ev.city}, {ev.state}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/organizer/events/${id}/edit`}
            className="flex items-center gap-2 font-ui font-semibold text-sm px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink hover:border-aubergine/30 hover:text-aubergine transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit event
          </Link>
        </div>
      </div>

      {/* ── In-event sub-navigation ── */}
      <EventSubnav eventId={id} active="overview" />

      {/* ── Status banner (hide when published + no note) ── */}
      {(ev.status !== "published" || ev.review_note) && (
        <div className={`rounded-2xl border px-5 py-3.5 flex items-start gap-3 ${statusMeta.bannerCls}`}>
          <span className="text-lg shrink-0 mt-0.5">{statusMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-ui text-sm text-ink">{statusMeta.msg}</p>
            {ev.status === "rejected" && ev.review_note && (
              <div className="mt-2 pt-2 border-t border-durga/15">
                <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-1">Admin feedback</p>
                <p className="font-ui text-xs text-ink">{ev.review_note}</p>
              </div>
            )}
          </div>
          {ev.status === "draft" && (
            <Link href={`/organizer/events/${id}/edit`}
              className="shrink-0 font-ui font-semibold text-xs text-aubergine hover:underline">
              Go to edit →
            </Link>
          )}
        </div>
      )}

      {/* ── Overview: Event Information · Venue · Capacity · Visibility ── */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">Overview</p>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Event Information */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Event Information</p>
              <Link href={`/organizer/events/${id}/edit`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Edit</Link>
            </div>
            <div className="px-5 py-3">
              <Field label="Type" value={CATEGORY_LABELS[ev.category] ?? ev.category} />
              {ev.artist && <Field label="Artist" value={ev.artist} />}
              <Field label="Date" value={ev.is_multi_day && ev.end_date && ev.end_date !== ev.start_date ? `${fmtDay(ev.start_date)} – ${fmtDay(ev.end_date)}` : fmtDay(ev.start_date)} />
              <Field label="Time" value={[ev.doors_open_time && `Doors ${fmt12(ev.doors_open_time)}`, fmt12(ev.start_time) && `Start ${fmt12(ev.start_time)}`, ev.end_time && `Ends ${fmt12(ev.end_time)}`].filter(Boolean).join(" · ") || "Time TBA"} />
              {ev.description && <Field label="About" value={<span className="line-clamp-3 text-left">{ev.description}</span>} />}
            </div>
          </div>

          {/* Venue */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Venue</p>
              <Link href={`/organizer/events/${id}/edit`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Edit</Link>
            </div>
            <div className="px-5 py-3">
              <Field label="Venue" value={ev.venue_name || <span className="text-ink-muted">Not set</span>} />
              {[ev.address_line1, ev.address_line2].filter(Boolean).length > 0 && (
                <Field label="Address" value={[ev.address_line1, ev.address_line2].filter(Boolean).join(", ")} />
              )}
              <Field label="City" value={`${ev.city}, ${ev.state}${ev.zip ? ` ${ev.zip}` : ""}`} />
              {ev.venue_name && (
                <div className="pt-2">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([ev.venue_name, ev.address_line1, ev.city, ev.state].filter(Boolean).join(" "))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-aubergine hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Open in Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Capacity */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Capacity</p>
            </div>
            <div className="px-5 py-3">
              <Field label="Venue capacity" value={ev.capacity ? `${ev.capacity.toLocaleString()} attendees` : <span className="text-ink-muted">Not set</span>} />
              <Field label="Ticket inventory" value={`${totalCap.toLocaleString()} ticket${totalCap !== 1 ? "s" : ""}`} />
              <Field label="Sold" value={`${totalSold.toLocaleString()} (${Math.round(fillPct)}%)`} />
              <Field label="Remaining" value={`${Math.max(0, totalCap - totalSold).toLocaleString()}`} />
              {totalCap > 0 && (
                <div className="pt-2.5">
                  <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, fillPct)}%`, backgroundColor: fillColor, minWidth: totalSold > 0 ? 4 : 0 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visibility Status */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Visibility Status</p>
            </div>
            <div className="px-5 py-3">
              <Field label="Status" value={<span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusMeta.pillCls}`}>{statusMeta.label}</span>} />
              <Field label="Public listing" value={ev.status === "published" ? "Visible to everyone" : ev.status === "cancelled" ? "Removed from listing" : "Hidden from public"} />
              <Field label="Ticketing" value={ev.selling_on_rameelo ? "Selling on Rameelo" : "Interest collection only"} />
              {ev.status === "published" && (
                <div className="pt-2">
                  <a href={`/events/${id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-aubergine hover:underline">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    View public page
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(tile => (
          <div key={tile.label} className="bg-white rounded-2xl border border-ivory-200 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">{tile.icon}</span>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted leading-none">{tile.label}</p>
            </div>
            <p className="font-display font-bold" style={{ fontSize: "22px", color: tile.color, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {tile.value}
            </p>
            <p className="font-ui text-[11px] text-ink-muted/70 mt-1 leading-snug">{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Revenue progress bar ── */}
      {maxRev > 0 && (
        <div className="bg-white rounded-2xl border border-ivory-200 p-5">
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Revenue progress to sellout</p>
              <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {fmtCurrency(grossRev)} earned · {fmtCurrency(maxRev - grossRev)} still available
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em", fontSize: "18px" }}>{fmtCurrency(grossRev)}</p>
                <p className="font-mono text-[9px] text-ink-muted mt-0.5">Earned</p>
              </div>
              <div className="w-px h-8 bg-ivory-200" />
              <div className="text-center">
                <p className="font-display font-bold text-ink-muted" style={{ letterSpacing: "-0.02em", fontSize: "18px" }}>{fmtCurrency(maxRev - grossRev)}</p>
                <p className="font-mono text-[9px] text-ink-muted mt-0.5">Remaining</p>
              </div>
            </div>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, revPct)}%`,
                background: "linear-gradient(90deg, #0E8C7A, #2E1B30)",
                minWidth: grossRev > 0 ? 8 : 0,
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[9px] text-ink-muted">$0</span>
            <span className="font-mono text-[9px] font-bold" style={{ color: "#0E8C7A" }}>{Math.round(revPct)}% of potential revenue</span>
            <span className="font-mono text-[9px] text-ink-muted">{fmtCurrency(maxRev)}</span>
          </div>
        </div>
      )}

      {/* ── Orders + Groups ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between shrink-0">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Recent Orders</p>
              <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {orderCount} total order{orderCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href={`/organizer/events/${id}/orders`}
              className="font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-5 text-center">
              <span className="text-3xl mb-2">🧾</span>
              <p className="font-ui text-sm text-ink-muted">No orders yet. They&apos;ll appear here as tickets are purchased.</p>
            </div>
          ) : (
            <div className="divide-y divide-ivory-200">
              {recentOrders.map(order => {
                const s = ORDER_STATUS[order.status] ?? ORDER_STATUS.confirmed;
                const isComp = order.order_type === "comp";
                const isCombo = order.order_type === "combo";
                return (
                  <div key={order.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-ui text-sm font-semibold text-ink truncate">{order.buyer_name}</p>
                        {isComp ? (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 bg-aubergine/12 text-aubergine">Comp</span>
                        ) : order.order_type === "manual" ? (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 bg-marigold/15 text-marigold-dark">Manual</span>
                        ) : isCombo ? (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 bg-marigold/15 text-[#a06b00]">✨ Combo</span>
                        ) : (
                          <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-ink-muted truncate">
                        {order.ticket_tiers?.name ?? order.combo_tickets?.name ?? "—"} · {order.qty} ticket{order.qty !== 1 ? "s" : ""} · {timeAgo(order.created_at)}
                      </p>
                    </div>
                    {isComp ? (
                      <p className="font-display font-bold text-aubergine shrink-0" style={{ letterSpacing: "-0.02em" }}>Free</p>
                    ) : (
                      <p className="font-display font-bold text-peacock shrink-0" style={{ letterSpacing: "-0.02em" }}>
                        ${order.grand_total.toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {orderCount > 5 && (
            <div className="px-5 py-3 border-t border-ivory-200 bg-ivory">
              <Link href={`/organizer/events/${id}/orders`}
                className="font-ui text-xs text-ink-muted hover:text-aubergine transition-colors">
                +{orderCount - 5} more order{orderCount - 5 !== 1 ? "s" : ""} →
              </Link>
            </div>
          )}
        </div>

        {/* Group Orders */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between shrink-0">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Group Orders</p>
              <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                {groupCount} group link{groupCount !== 1 ? "s" : ""} created
              </p>
            </div>
            <Link
              href={`/organizer/events/${id}/groups`}
              className="font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>

          {recentGroups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-5 text-center">
              <span className="text-3xl mb-2">👥</span>
              <p className="font-ui text-sm text-ink-muted">No group orders yet. They appear when attendees create group links for this event.</p>
            </div>
          ) : (
            <div className="divide-y divide-ivory-200">
              {recentGroups.map(group => {
                const s = GROUP_STATUS[group.status] ?? GROUP_STATUS.open;
                const members = group.group_order_members?.length ?? 0;
                const groupFill = group.target_size > 0 ? Math.min(100, (members / group.target_size) * 100) : 0;
                return (
                  <div key={group.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-ui text-sm font-semibold text-ink truncate">{group.organizer_name}</p>
                          <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                        </div>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {group.ticket_tiers?.name ?? "—"} · Deadline {fmtDate(group.deadline)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-ink" style={{ letterSpacing: "-0.02em" }}>{members}/{group.target_size}</p>
                        <p className="font-mono text-[9px] text-ink-muted">members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${groupFill}%`, backgroundColor: groupFill >= 100 ? "#0E8C7A" : "#D4891B" }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-ink-muted shrink-0">{Math.round(groupFill)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {groupCount > 5 && (
            <div className="px-5 py-3 border-t border-ivory-200 bg-ivory">
              <Link href={`/organizer/events/${id}/groups`}
                className="font-ui text-xs text-ink-muted hover:text-aubergine transition-colors">
                +{groupCount - 5} more group{groupCount - 5 !== 1 ? "s" : ""} →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Ticket Tier Performance ── */}
      {tiers.length > 0 && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-ivory-200 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets</p>
              <p className="font-display font-semibold text-ink text-base mt-0.5" style={{ letterSpacing: "-0.015em" }}>
                Types · Pricing · Inventory · Sales
              </p>
            </div>
            <Link
              href={`/organizer/events/${id}/edit#tickets`}
              className="font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light flex items-center gap-1 transition-colors"
            >
              Manage tiers
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>

          <div className="divide-y divide-ivory-200">
            {[...tiers]
              .sort((a, b) => (b.quantity_sold * b.price) - (a.quantity_sold * a.price))
              .map((tier, i) => {
                const tf = tier.quantity > 0 ? (tier.quantity_sold / tier.quantity) * 100 : 0;
                const tc = tier.quantity_sold * tier.price; // PAID tickets only (comps are free + tracked separately)
                const comped = tier.quantity_comped ?? 0;
                const tcolor = tf >= 80 ? "#7C1F2C" : tf >= 50 ? "#0E8C7A" : "#D4891B";
                return (
                  <div key={tier.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: i === 0 ? "#F5C030" : "#EBE6DB", color: i === 0 ? "#2E1B30" : "#6B6B7B" }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-ui text-sm font-semibold text-ink truncate">{tier.name}</p>
                          <p className="font-mono text-[9px] text-ink-muted">
                            ${tier.price.toFixed(2)}/ticket · {tier.quantity_sold} sold{comped > 0 ? ` (${comped} comp)` : ""} of {tier.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-display font-bold text-peacock" style={{ letterSpacing: "-0.02em" }}>{fmtCurrency(tc)}</p>
                          <p className="font-mono text-[9px] text-ink-muted">{fmtCurrency(tier.quantity * tier.price)} potential</p>
                        </div>
                        <RadialRing pct={tf} size={44} stroke={4} color={tcolor} />
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#EBE6DB" }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${Math.min(100, tf)}%`, backgroundColor: tcolor, minWidth: tier.quantity_sold > 0 ? 4 : 0 }}
                      />
                    </div>
                    {tier.quantity - tier.quantity_sold > 0 && (
                      <p className="font-mono text-[9px] mt-1.5" style={{ color: tcolor }}>
                        {tier.quantity - tier.quantity_sold} seats remain · {fmtCurrency((tier.quantity - tier.quantity_sold) * tier.price)} unclaimed
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

    </div>
  );
}
