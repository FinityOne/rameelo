"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../../../org-context";
import { eventAccessOrFilter } from "@/lib/organizer-access";

// ─── Types ──────────────────────────────────────────────────────────────────
type Row = {
  id: string;
  buyer_name: string;
  qty: number;
  created_at: string;
  order_type: string;
  ticket_tiers: { name: string } | null;
  combo_tickets: { name: string } | null;
};
type EventInfo = { title: string; start_date: string; start_time: string | null; venue_name: string | null; city: string | null; state: string | null };

// ─── Helpers ────────────────────────────────────────────────────────────────
function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }

// Split a checkout name into first / last for last-name sorting. Last whitespace
// token is the surname; everything before it is the given name(s).
function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "—" };
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
function fmtOrdered(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}
function fmtEventDate(d: string, t: string | null) {
  const date = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (!t) return date;
  const [h, m] = t.split(":").map(Number);
  return `${date} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function CheckinSheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orgs } = useOrg();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [rows, setRows] = useState<Array<Row & { first: string; last: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [evRes, ordRes] = await Promise.all([
      supabase.from("events").select("title, start_date, start_time, venue_name, city, state").eq("id", id).or(eventAccessOrFilter(user.id, orgs.map(o => o.id))).maybeSingle(),
      supabase.from("orders")
        .select("id, buyer_name, qty, created_at, order_type, ticket_tiers(name), combo_tickets(name)")
        .eq("event_id", id)
        .eq("is_test", false)
        .eq("status", "confirmed"),
    ]);

    if (!evRes.data) { router.replace("/organizer/events"); return; }
    setEvent(evRes.data as EventInfo);

    const list = ((ordRes.data ?? []) as unknown as Row[]).map(o => {
      const { first, last } = splitName(o.buyer_name);
      return { ...o, first, last };
    });
    // Sort by first name, then last name — so a person can scan alphabetically.
    list.sort((a, b) =>
      a.first.localeCompare(b.first, undefined, { sensitivity: "base" }) ||
      a.last.localeCompare(b.last, undefined, { sensitivity: "base" }),
    );
    setRows(list);
    setLoading(false);
  }, [id, router, orgs]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  const totalTickets = rows.reduce((s, r) => s + (r.qty || 0), 0);
  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      {/* Print rules: hide all app chrome and print only the sheet, portrait Letter. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #checkin-sheet, #checkin-sheet * { visibility: visible !important; }
          #checkin-sheet { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { size: letter portrait; margin: 0.5in; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <Link href={`/organizer/events/${id}/orders`} className="font-ui text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Orders
          </Link>
          <span className="text-ink-muted/40">/</span>
          <span className="font-ui text-ink-muted truncate">Check-in sheet</span>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print sheet
        </button>
      </div>

      <div className="no-print mb-4 rounded-xl bg-marigold/10 border border-marigold/25 px-4 py-3">
        <p className="font-ui text-xs text-ink leading-relaxed">
          <strong>Backup check-in sheet.</strong> Sorted by first name. Print this and tick people off by hand if the scanner or
          internet goes down at the door. Tickets reflect each order&rsquo;s quantity.
        </p>
      </div>

      {/* The printable sheet */}
      <div id="checkin-sheet" className="bg-white text-ink mx-auto" style={{ maxWidth: "8.5in" }}>
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          {/* Sheet header */}
          <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-3 mb-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted mb-1">Rameelo · Door check-in sheet</p>
              <h1 className="font-display font-bold text-2xl leading-tight" style={{ letterSpacing: "-0.02em" }}>{event?.title}</h1>
              <p className="font-ui text-sm text-ink-muted mt-0.5">
                {event && fmtEventDate(event.start_date, event.start_time)}
                {event && (event.venue_name || event.city) ? ` · ${[event.venue_name, event.city, event.state].filter(Boolean).join(", ")}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-black text-2xl leading-none" style={{ letterSpacing: "-0.03em" }}>{rows.length}</p>
              <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">orders</p>
              <p className="font-display font-black text-lg leading-none mt-1.5" style={{ letterSpacing: "-0.03em" }}>{totalTickets}</p>
              <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">tickets</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="font-ui text-sm text-ink-muted py-8 text-center">No confirmed orders for this event yet.</p>
          ) : (
            <table className="w-full border-collapse" style={{ fontSize: "10px" }}>
              <thead>
                <tr className="border-b-2 border-ink text-left align-bottom">
                  <th className="py-1.5 pr-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted" style={{ width: "22px" }}>#</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted">Last name</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted">First name</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted text-center" style={{ width: "42px" }}>Tix</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted" style={{ width: "92px" }}>Type</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted" style={{ width: "60px" }}>Ordered</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted" style={{ width: "96px" }}>Receipt</th>
                  <th className="py-1.5 px-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted text-center" style={{ width: "62px" }}>Checked in</th>
                  <th className="py-1.5 pl-1 font-mono text-[8px] uppercase tracking-wider text-ink-muted text-center" style={{ width: "34px" }}>ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const tier = r.ticket_tiers?.name ?? r.combo_tickets?.name ?? "—";
                  const isComp = r.order_type === "comp";
                  return (
                    <tr key={r.id} className="border-b border-ink/15 align-middle" style={{ pageBreakInside: "avoid" }}>
                      <td className="py-[5px] pr-1 font-mono text-ink-muted text-[9px]">{i + 1}</td>
                      <td className="py-[5px] px-1 font-ui uppercase">{r.last}</td>
                      <td className="py-[5px] px-1 font-ui font-bold">{r.first || "—"}</td>
                      <td className="py-[5px] px-1 text-center font-ui font-bold">{r.qty}</td>
                      <td className="py-[5px] px-1 font-ui text-ink-muted">{isComp ? "Comp" : tier}</td>
                      <td className="py-[5px] px-1 font-mono text-ink-muted text-[9px]">{fmtOrdered(r.created_at)}</td>
                      <td className="py-[5px] px-1 font-mono text-ink-muted text-[8px] tracking-tight">{receiptNum(r.id)}</td>
                      <td className="py-[5px] px-1 text-center">
                        <span className="inline-block border border-ink rounded-[2px]" style={{ width: "14px", height: "14px" }} />
                      </td>
                      <td className="py-[5px] pl-1 text-center">
                        <span className="inline-block border border-ink rounded-[2px]" style={{ width: "14px", height: "14px" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Sheet footer */}
          <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-ink/20">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">Generated {generatedAt}</p>
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">{rows.length} orders · {totalTickets} tickets · Checked in: ______ / {totalTickets}</p>
          </div>
        </div>
      </div>
    </>
  );
}
