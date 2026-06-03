"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";

// ── Types ───────────────────────────────────────────────────────────────────────

type QueueEvent = {
  id: string;
  title: string;
  category: string;
  artist: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  location_tba: boolean;
  selling_on_rameelo: boolean;
  cover_gradient: string;
  organizer: { first_name: string | null; last_name: string | null; email: string; phone: string | null } | null;
  organization: { name: string } | null;
  ticket_tiers: { price: number; quantity: number }[];
};

type Tab = "pending" | "rejected";
type Sort = "oldest" | "newest" | "soonest";

const CATEGORY_LABELS: Record<string, string> = {
  garba: "Garba", dandiya: "Dandiya", raas: "Raas", workshop: "Workshop", community: "Community", other: "Other",
};

// ── Helpers ──────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Relative "waiting" age + days since submission (for urgency)
function ageInfo(iso: string): { label: string; days: number } {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(ms / 86400000);
  let label: string;
  if (mins < 1) label = "just now";
  else if (mins < 60) label = `${mins}m ago`;
  else if (mins < 1440) label = `${Math.floor(mins / 60)}h ago`;
  else if (days < 7) label = `${days}d ago`;
  else if (days < 35) label = `${Math.floor(days / 7)}w ago`;
  else label = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, days };
}

type RejectModal = { id: string; title: string; note: string };

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const router = useRouter();
  const [events, setEvents]   = useState<QueueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("pending");
  const [sort, setSort]       = useState<Sort>("oldest");
  const [search, setSearch]   = useState("");
  const [acting, setActing]   = useState<string | null>(null);
  const [modal, setModal]     = useState<RejectModal | null>(null);
  const [justActed, setJustActed] = useState<{ title: string; kind: "approved" | "rejected" } | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select(`
        id, title, category, artist, city, state, start_date, status,
        created_at, reviewed_at, review_note, location_tba, selling_on_rameelo, cover_gradient,
        organizer:profiles!events_organizer_id_fkey (first_name, last_name, email, phone),
        organization:organizations (name),
        ticket_tiers (price, quantity)
      `)
      .in("status", ["pending_review", "rejected"])
      .order("created_at", { ascending: true });
    setEvents((data ?? []) as unknown as QueueEvent[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(ev: QueueEvent) {
    setActing(ev.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("events").update({
      status: "published",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      review_note: null,
    }).eq("id", ev.id);
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    setActing(null);
    setJustActed({ title: ev.title, kind: "approved" });
    setTimeout(() => setJustActed(null), 4000);
  }

  async function reject() {
    if (!modal || !modal.note.trim()) return;
    setActing(modal.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("events").update({
      status: "rejected",
      review_note: modal.note.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", modal.id);
    const title = modal.title;
    setModal(null);
    setActing(null);
    await load();
    setJustActed({ title, kind: "rejected" });
    setTimeout(() => setJustActed(null), 4000);
  }

  const pendingCount  = events.filter(e => e.status === "pending_review").length;
  const rejectedCount = events.filter(e => e.status === "rejected").length;

  const visible = useMemo(() => {
    const wanted = tab === "pending" ? "pending_review" : "rejected";
    let result = events.filter(e => e.status === wanted);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.city ?? "").toLowerCase().includes(q) ||
        (e.artist ?? "").toLowerCase().includes(q) ||
        [e.organizer?.first_name, e.organizer?.last_name].filter(Boolean).join(" ").toLowerCase().includes(q) ||
        (e.organizer?.email ?? "").toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      if (sort === "soonest") return a.start_date.localeCompare(b.start_date);
      const diff = a.created_at.localeCompare(b.created_at);
      return sort === "oldest" ? diff : -diff;
    });
    return result;
  }, [events, tab, search, sort]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Review Queue</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {loading ? "—" : pendingCount === 0
              ? "Nothing waiting — you're all caught up 🎉"
              : `${pendingCount} event${pendingCount !== 1 ? "s" : ""} awaiting your review`}
          </p>
        </div>
        <Link
          href="/admin/events"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted font-ui font-semibold text-sm hover:text-aubergine hover:border-aubergine/30 active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          All events
        </Link>
      </div>

      {/* Just-acted toast */}
      {justActed && (
        <div className={`rounded-2xl px-5 py-3.5 flex items-center gap-3 border ${justActed.kind === "approved" ? "bg-peacock/10 border-peacock/25" : "bg-durga/8 border-durga/20"}`}>
          <span className="text-lg">{justActed.kind === "approved" ? "✅" : "❌"}</span>
          <p className="font-ui text-sm text-ink">
            <span className="font-semibold">{justActed.title}</span>
            {justActed.kind === "approved" ? " is now published and live." : " was rejected — the organizer has been notified."}
          </p>
        </div>
      )}

      {/* Tabs + controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-ivory rounded-2xl p-1 border border-ivory-200">
          {([["pending", "Pending", pendingCount], ["rejected", "Rejected", rejectedCount]] as [Tab, string, number][]).map(([t, label, count]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-ui font-semibold text-sm transition-all whitespace-nowrap ${
                tab === t ? "bg-white text-ink shadow-sm border border-ivory-200" : "text-ink-muted hover:text-ink"
              }`}>
              {label}
              {count > 0 && (
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                  t === "pending" ? "bg-marigold text-aubergine" : "bg-durga/15 text-durga"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, organizer, city…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value as Sort)}
          className="px-3 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink-muted focus:outline-none focus:ring-2 focus:ring-aubergine/20 transition-all"
        >
          <option value="oldest">Longest waiting</option>
          <option value="newest">Newest first</option>
          <option value="soonest">Event date — soonest</option>
        </select>

        {!loading && (
          <span className="ml-auto font-mono text-[10px] text-ink-muted">
            {visible.length} shown
          </span>
        )}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
          <p className="text-3xl mb-3">{search ? "🔍" : tab === "pending" ? "🎉" : "✅"}</p>
          <p className="font-display font-bold text-ink/70 text-base mb-1">
            {search ? "No matches" : tab === "pending" ? "Queue is clear" : "No rejected events"}
          </p>
          <p className="font-ui text-ink-muted text-sm">
            {search ? "Try a different search." : tab === "pending"
              ? "Every submitted event has been reviewed. New submissions will land here."
              : "Events you reject with feedback will show here for follow-up."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(ev => {
            const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
            const isActing = acting === ev.id;
            const orgName  = [ev.organizer?.first_name, ev.organizer?.last_name].filter(Boolean).join(" ") || ev.organizer?.email || "Unknown organizer";
            const location = ev.location_tba ? "Location TBA" : [ev.city, ev.state].filter(Boolean).join(", ") || "—";
            const capacity = ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0);
            const prices   = ev.ticket_tiers.map(t => t.price);
            const minP = prices.length ? Math.min(...prices) : 0;
            const maxP = prices.length ? Math.max(...prices) : 0;
            const age  = ageInfo(ev.created_at);
            const stale = tab === "pending" && age.days >= 3;

            return (
              <div key={ev.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-sm ${stale ? "border-durga/30" : "border-ivory-200"}`}>
                <div className="flex flex-col sm:flex-row">
                  {/* Cover thumb */}
                  <button
                    onClick={() => router.push(`/admin/events/${ev.id}`)}
                    className="relative sm:w-28 h-20 sm:h-auto shrink-0 group"
                    style={{ background: gradient.css }}
                    aria-label="Open full review"
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <span className="absolute bottom-1.5 left-2 font-mono text-[8px] uppercase tracking-widest text-white/85">
                      {CATEGORY_LABELS[ev.category] ?? ev.category}
                    </span>
                  </button>

                  {/* Body */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Urgency / age */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${stale ? "bg-durga/12 text-durga" : "bg-marigold/20 text-[#a06b00]"}`}>
                            {tab === "pending" ? (stale ? `Waiting ${age.label}` : `Submitted ${age.label}`) : `Rejected ${ageInfo(ev.reviewed_at ?? ev.created_at).label}`}
                          </span>
                          {!ev.selling_on_rameelo && (
                            <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-ivory-200 text-ink-muted">👀 Interest only</span>
                          )}
                        </div>
                        <button onClick={() => router.push(`/admin/events/${ev.id}`)} className="text-left">
                          <p className="font-display font-bold text-ink text-base leading-tight truncate hover:text-aubergine transition-colors" style={{ letterSpacing: "-0.015em" }}>
                            {ev.title}
                          </p>
                        </button>
                        <p className="font-ui text-xs text-ink-muted mt-0.5 truncate">
                          {ev.artist ? `${ev.artist} · ` : ""}{ev.organization?.name ? `${ev.organization.name} · ` : ""}{location}
                        </p>
                      </div>
                    </div>

                    {/* Facts row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 font-mono text-[10px] text-ink-muted">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {fmtDate(ev.start_date)}
                      </span>
                      {ev.ticket_tiers.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                          {ev.ticket_tiers.length} tier{ev.ticket_tiers.length !== 1 ? "s" : ""} · {capacity.toLocaleString()} cap · ${minP}{maxP > minP ? `–$${maxP}` : ""}
                        </span>
                      )}
                      <span className="flex items-center gap-1 truncate">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {orgName}
                        {ev.organizer?.email && <span className="text-ink-muted/60">· {ev.organizer.email}</span>}
                      </span>
                    </div>

                    {/* Rejection feedback (rejected tab) */}
                    {tab === "rejected" && ev.review_note && (
                      <div className="mt-2.5 rounded-lg bg-durga/[0.05] border border-durga/15 px-3 py-2">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-durga/70 mb-0.5">Feedback sent</p>
                        <p className="font-ui text-xs text-ink/80 leading-snug line-clamp-2">{ev.review_note}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {tab === "pending" ? (
                        <>
                          <button
                            onClick={() => approve(ev)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-peacock text-white font-ui font-semibold text-xs hover:bg-peacock/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
                          >
                            {isActing
                              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                            Approve & publish
                          </button>
                          <button
                            onClick={() => setModal({ id: ev.id, title: ev.title, note: "" })}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-durga/30 text-durga font-ui font-semibold text-xs hover:bg-durga/5 active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => approve(ev)}
                          disabled={isActing}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-peacock/10 border border-peacock/25 text-peacock font-ui font-semibold text-xs hover:bg-peacock/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isActing
                            ? <div className="w-3.5 h-3.5 rounded-full border-2 border-peacock/30 border-t-peacock animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                          Approve anyway
                        </button>
                      )}
                      <Link
                        href={`/admin/events/${ev.id}`}
                        className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl font-ui font-semibold text-xs text-ink-muted hover:text-aubergine transition-colors"
                      >
                        Full review
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-durga/10 border border-durga/20 flex items-center justify-center text-xl shrink-0">❌</div>
              <div className="min-w-0">
                <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Reject event</p>
                <p className="font-ui text-xs text-ink-muted truncate">{modal.title}</p>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Reason / Feedback *</label>
              <textarea
                rows={4}
                autoFocus
                placeholder="e.g. Missing venue address, ticket pricing seems incorrect, cover photo resolution too low…"
                value={modal.note}
                onChange={e => setModal({ ...modal, note: e.target.value })}
                className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-durga/20 focus:border-durga/40 resize-none transition-all"
              />
              {!modal.note.trim() && (
                <p className="mt-1.5 font-mono text-[9px] text-durga/70">Feedback is required — it&apos;s sent to the organizer.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">
                Cancel
              </button>
              <button onClick={reject} disabled={!modal.note.trim() || acting === modal.id}
                className="flex-1 py-2.5 rounded-xl bg-durga text-white font-display font-bold text-sm hover:bg-durga/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {acting === modal.id ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Send rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
