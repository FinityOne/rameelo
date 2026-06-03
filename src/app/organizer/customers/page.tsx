"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawOrder = {
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  qty: number;
  grand_total: number;
  status: string;
  created_at: string;
};

type Customer = {
  email: string;
  name: string;
  phone: string | null;
  orders: number;   // total transactions (any status)
  tickets: number;  // confirmed tickets
  spend: number;    // confirmed lifetime spend
  lastOrder: string;
};

const REFUND_STATES = new Set(["refunded", "cancelled"]);

function money(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base[0]?.toUpperCase() || "?";
}

export default function CustomersPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spend" | "orders" | "recent" | "name">("spend");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const evQuery = supabase.from("events").select("id");
      const { data: evs } = await (activeOrg ? evQuery.eq("org_id", activeOrg.id) : evQuery.eq("organizer_id", user.id));
      const eventIds = (evs ?? []).map((e: { id: string }) => e.id);
      if (eventIds.length === 0) { setCustomers([]); setLoading(false); return; }

      const { data: rawOrders } = await supabase
        .from("orders")
        .select("buyer_name, buyer_email, buyer_phone, qty, grand_total, status, created_at")
        .in("event_id", eventIds)
        .eq("is_test", false)
        .order("created_at", { ascending: false });

      // Aggregate orders into customers keyed by lowercased email
      const map = new Map<string, Customer>();
      for (const o of (rawOrders ?? []) as RawOrder[]) {
        const key = (o.buyer_email || "").toLowerCase();
        if (!key) continue;
        const confirmed = !REFUND_STATES.has(o.status);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            email: o.buyer_email,
            name: o.buyer_name,
            phone: o.buyer_phone,
            orders: 1,
            tickets: confirmed ? o.qty : 0,
            spend: confirmed ? Number(o.grand_total) : 0,
            lastOrder: o.created_at,
          });
        } else {
          existing.orders += 1;
          if (confirmed) { existing.tickets += o.qty; existing.spend += Number(o.grand_total); }
          // orders are pre-sorted desc — keep the newest name/phone seen
          if (!existing.phone && o.buyer_phone) existing.phone = o.buyer_phone;
          if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
        }
      }
      setCustomers(Array.from(map.values()));
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "spend") return b.spend - a.spend;
      if (sortBy === "orders") return b.orders - a.orders;
      if (sortBy === "recent") return b.lastOrder.localeCompare(a.lastOrder);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [customers, search, sortBy]);

  const totalRevenue = customers.reduce((s, c) => s + c.spend, 0);
  const avgSpend = customers.length ? totalRevenue / customers.length : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Customers</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">
          {loading ? "Loading…" : `${customers.length} customer${customers.length !== 1 ? "s" : ""} who've bought tickets to your events`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No customers yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">
            Once attendees buy tickets, they&apos;ll appear here with their full purchase history.
          </p>
          <Link href="/organizer/events" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">
            View my events →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Customers", value: customers.length.toLocaleString() },
              { label: "Lifetime Revenue", value: `$${money(totalRevenue)}` },
              { label: "Avg. Spend", value: `$${money(avgSpend)}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 px-3 sm:px-4 py-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
                <p className="font-display font-bold text-ink text-lg sm:text-2xl mt-1" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search + sort */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-ivory-200 bg-ivory pl-9 pr-4 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
              />
            </div>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="h-10 rounded-xl border border-ivory-200 bg-white pl-3 pr-8 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 cursor-pointer appearance-none">
                <option value="spend">Top spenders</option>
                <option value="orders">Most orders</option>
                <option value="recent">Most recent</option>
                <option value="name">Name A–Z</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span className="font-mono text-[10px] text-ink-muted ml-auto">{filtered.length} shown</span>
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory">
                  <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Name</th>
                  <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Email</th>
                  <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">Phone</th>
                  <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Orders</th>
                  <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets</th>
                  <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-ink-muted">Lifetime Spend</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.email}
                    onClick={() => router.push(`/organizer/customers/${encodeURIComponent(c.email)}`)}
                    className="border-b border-ivory-200 last:border-0 hover:bg-ivory/60 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-xs shrink-0">{initials(c.name, c.email)}</div>
                        <p className="font-ui text-sm font-medium text-ink truncate max-w-[180px]">{c.name || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><p className="font-mono text-xs text-ink-muted truncate max-w-[220px]">{c.email}</p></td>
                    <td className="px-4 py-3"><p className="font-mono text-xs text-ink-muted whitespace-nowrap">{c.phone || "—"}</p></td>
                    <td className="px-4 py-3 text-center font-display font-bold text-ink text-sm">{c.orders}</td>
                    <td className="px-4 py-3 text-center font-display font-bold text-ink text-sm">{c.tickets}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-peacock text-sm">${money(c.spend)}</td>
                    <td className="px-4 py-3 text-right"><svg className="w-4 h-4 text-ink-muted inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-2.5">
            {filtered.map(c => (
              <Link key={c.email} href={`/organizer/customers/${encodeURIComponent(c.email)}`}
                className="block bg-white rounded-2xl border border-ivory-200 p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-sm shrink-0">{initials(c.name, c.email)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-ui text-sm font-semibold text-ink truncate">{c.name || "—"}</p>
                    <p className="font-mono text-[10px] text-ink-muted truncate">{c.email}</p>
                    {c.phone && <p className="font-mono text-[10px] text-ink-muted">{c.phone}</p>}
                  </div>
                  <p className="font-display font-bold text-peacock text-base shrink-0">${money(c.spend)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-ivory-200">
                  <div><p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Orders</p><p className="font-display font-bold text-ink text-sm">{c.orders}</p></div>
                  <div><p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets</p><p className="font-display font-bold text-ink text-sm">{c.tickets}</p></div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
