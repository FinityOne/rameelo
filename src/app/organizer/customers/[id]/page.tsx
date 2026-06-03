"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  user_id: string | null;
  qty: number;
  grand_total: number;
  status: string;
  created_at: string;
  events: { id: string; title: string; start_date: string } | null;
  ticket_tiers: { name: string } | null;
};

const REFUND_STATES = new Set(["refunded", "cancelled"]);
const STATUS_PILL: Record<string, string> = {
  confirmed: "bg-peacock/10 text-peacock",
  pending:   "bg-marigold/20 text-[#a06b00]",
  refunded:  "bg-durga/15 text-durga",
  cancelled: "bg-ivory-200 text-ink-muted",
};

function money(n: number) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtEventDay(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function initials(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base[0]?.toUpperCase() || "?";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className="font-ui text-sm text-ink text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeOrg } = useOrg();
  const email = decodeURIComponent(id);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase.from("events").select("id");
      const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
      const eventIds = (evs ?? []).map((e: { id: string }) => e.id);
      if (eventIds.length === 0) { router.replace("/organizer/customers"); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, user_id, qty, grand_total, status, created_at, event_id, events (id, title, start_date), ticket_tiers (name)")
        .in("event_id", eventIds)
        .eq("is_test", false)
        .ilike("buyer_email", email)
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as OrderRow[];
      if (rows.length === 0) { router.replace("/organizer/customers"); return; }
      setOrders(rows);
      setLoading(false);
    }
    load();
  }, [id, email, activeOrg, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  const name  = orders[0].buyer_name || email;
  const phone = orders.find(o => o.buyer_phone)?.buyer_phone ?? null;
  const isMember = orders.some(o => o.user_id);
  const confirmed = orders.filter(o => !REFUND_STATES.has(o.status));
  const tickets = confirmed.reduce((s, o) => s + o.qty, 0);
  const spend   = confirmed.reduce((s, o) => s + Number(o.grand_total), 0);
  const firstSeen = orders.reduce((min, o) => o.created_at < min ? o.created_at : min, orders[0].created_at);
  const eventsCount = new Set(orders.map(o => o.events?.id).filter(Boolean)).size;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 text-xs">
        <Link href="/organizer/customers" className="font-ui text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Customers
        </Link>
        <span className="text-ink-muted/40">/</span>
        <span className="font-ui text-ink-muted truncate">{name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-aubergine flex items-center justify-center text-white font-display font-bold text-lg shrink-0">{initials(name, email)}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{name}</h1>
              {isMember && <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-peacock/15 text-peacock">Member</span>}
            </div>
            <p className="font-mono text-xs text-ink-muted truncate">{email}</p>
            <p className="font-mono text-[10px] text-ink-muted/70 mt-0.5">Customer since {fmtDate(firstSeen)} · {eventsCount} event{eventsCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Orders", value: orders.length.toLocaleString() },
          { label: "Tickets Purchased", value: tickets.toLocaleString() },
          { label: "Lifetime Spend", value: `$${money(spend)}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-3 sm:px-4 py-3.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
            <p className="font-display font-bold text-ink text-lg sm:text-2xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Customer Information */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3 bg-ivory border-b border-ivory-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Customer Information</p>
        </div>
        <div className="px-5 py-4">
          <Field label="Name" value={name} />
          <Field label="Email" value={<a href={`mailto:${email}`} className="text-aubergine hover:underline">{email}</a>} />
          <Field label="Phone" value={phone ? <a href={`tel:${phone}`} className="text-aubergine hover:underline">{phone}</a> : "—"} />
          <Field label="Account" value={isMember ? "Rameelo member" : "Guest checkout"} />
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Order History</p>
          <span className="font-mono text-[10px] text-ink-muted">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-ivory-200">
          {orders.map(o => (
            <Link key={o.id} href={`/organizer/tickets/${o.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-ivory/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="font-mono text-xs font-bold text-aubergine">{receiptNum(o.id)}</p>
                  <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${STATUS_PILL[o.status] ?? "bg-ivory-200 text-ink-muted"}`}>{o.status}</span>
                </div>
                <p className="font-ui text-sm text-ink truncate">{o.events?.title ?? "Event"}</p>
                <p className="font-mono text-[10px] text-ink-muted">
                  {o.ticket_tiers?.name ?? "—"} · {o.qty} ticket{o.qty !== 1 ? "s" : ""}
                  {o.events?.start_date ? ` · ${fmtEventDay(o.events.start_date)}` : ""} · ordered {fmtDate(o.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-ink text-sm">${money(o.grand_total)}</p>
              </div>
              <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
