"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EventSubnav from "../EventSubnav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  name: string;
  email: string;
  is_organizer: boolean;
  paid: boolean;
};

type GroupOrder = {
  id: string;
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  target_size: number;
  discount_pct: number;
  status: string;
  created_at: string;
  ticket_tiers: { name: string; price: number } | null;
  group_order_members: Member[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  open:      { label: "Open",      cls: "bg-peacock/15 text-peacock" },
  confirmed: { label: "Confirmed", cls: "bg-aubergine/15 text-aubergine" },
  closed:    { label: "Closed",    cls: "bg-ivory-200 text-ink-muted" },
  cancelled: { label: "Cancelled", cls: "bg-durga/15 text-durga" },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventGroupsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [groups, setGroups]         = useState<GroupOrder[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [filter, setFilter]         = useState<string>("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [evRes, grpRes] = await Promise.all([
        supabase.from("events").select("title").eq("id", id).eq("organizer_id", user.id).single(),
        supabase.from("group_orders")
          .select("id, organizer_name, organizer_email, organizer_phone, target_size, discount_pct, status, created_at, ticket_tiers(name, price), group_order_members(id, name, email, is_organizer, paid)")
          .eq("event_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!evRes.data) { router.replace("/organizer/events"); return; }
      setEventTitle(evRes.data.title);
      setGroups((grpRes.data ?? []) as unknown as GroupOrder[]);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const filtered = filter === "all" ? groups : groups.filter(g => g.status === filter);
  const totalMembers = groups.reduce((s, g) => s + (g.group_order_members?.length ?? 0), 0);
  const paidMembers  = groups.reduce((s, g) => s + (g.group_order_members?.filter(m => m.paid).length ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Link href="/organizer/events"
            className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            My Events
          </Link>
          <span className="text-ink-muted/40 text-xs">/</span>
          <Link href={`/organizer/events/${id}`}
            className="font-ui text-xs text-ink-muted hover:text-ink transition-colors truncate max-w-[180px]">
            {eventTitle}
          </Link>
          <span className="text-ink-muted/40 text-xs">/</span>
          <span className="font-ui text-xs text-ink">Group Orders</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Group Orders</h1>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              {groups.length} group{groups.length !== 1 ? "s" : ""} · {totalMembers} members · {paidMembers} paid
            </p>
          </div>
          <Link href={`/organizer/events/${id}`}
            className="font-ui text-sm font-semibold text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </div>

      <EventSubnav eventId={id} active="groups" />

      {/* Summary tiles */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open",      count: groups.filter(g => g.status === "open").length,      cls: "text-peacock" },
            { label: "Confirmed", count: groups.filter(g => g.status === "confirmed").length, cls: "text-aubergine" },
            { label: "Closed",    count: groups.filter(g => g.status === "closed").length,    cls: "text-ink-muted" },
            { label: "Cancelled", count: groups.filter(g => g.status === "cancelled").length, cls: "text-durga" },
          ].map(tile => (
            <button
              key={tile.label}
              onClick={() => setFilter(filter === tile.label.toLowerCase() ? "all" : tile.label.toLowerCase())}
              className={`bg-white rounded-2xl border px-4 py-3.5 text-left transition-all ${
                filter === tile.label.toLowerCase() ? "border-aubergine shadow-sm" : "border-ivory-200 hover:border-aubergine/25"
              }`}
            >
              <p className={`font-display font-bold text-2xl ${tile.cls}`} style={{ letterSpacing: "-0.03em" }}>{tile.count}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{tile.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {groups.length > 0 && (
        <div className="flex items-center gap-1 bg-ivory-200 rounded-xl p-1 w-fit">
          {["all", "open", "confirmed", "closed", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-ui text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}>
              {f === "all" ? `All (${groups.length})` : f}
            </button>
          ))}
        </div>
      )}

      {/* Groups list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>
            {groups.length === 0 ? "No group orders yet" : `No ${filter} groups`}
          </p>
          <p className="font-ui text-sm text-ink-muted">
            {groups.length === 0
              ? "Group orders appear here when attendees create group links for this event."
              : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => {
            const s = GROUP_STATUS[group.status] ?? GROUP_STATUS.open;
            const members = group.group_order_members ?? [];
            const fillPct = group.target_size > 0 ? Math.min(100, (members.length / group.target_size) * 100) : 0;
            const paidCount = members.filter(m => m.paid).length;
            const isExpanded = expanded === group.id;
            const tierPrice = group.ticket_tiers?.price ?? 0;

            return (
              <div key={group.id} className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
                {/* Group header row */}
                <button
                  className="w-full px-5 py-4 flex items-start gap-4 hover:bg-ivory/50 transition-colors text-left"
                  onClick={() => setExpanded(isExpanded ? null : group.id)}
                >
                  {/* Progress ring */}
                  <div className="shrink-0 mt-0.5">
                    <div className="relative w-10 h-10">
                      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="20" cy="20" r="16" fill="none" stroke="#EBE6DB" strokeWidth="4" />
                        <circle cx="20" cy="20" r="16" fill="none"
                          stroke={fillPct >= 100 ? "#0E8C7A" : "#D4891B"}
                          strokeWidth="4"
                          strokeDasharray={`${(fillPct / 100) * 100.53} 100.53`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display font-bold text-ink text-[9px]">{Math.round(fillPct)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
                        {group.organizer_name}
                      </p>
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${s.cls}`}>
                        {s.label}
                      </span>
                      {group.discount_pct > 0 && (
                        <span className="font-mono text-[8px] text-peacock bg-peacock/10 px-1.5 py-0.5 rounded-full">
                          {group.discount_pct}% off
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted">
                      {group.ticket_tiers?.name ?? "—"} · {members.length} {members.length === 1 ? "member" : "members"}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.02em" }}>
                        {paidCount}/{members.length} paid
                      </p>
                      <p className="font-mono text-[9px] text-ink-muted">
                        ${(paidCount * tierPrice * (1 - group.discount_pct / 100)).toFixed(0)} collected
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-ink-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded: member list */}
                {isExpanded && (
                  <div className="border-t border-ivory-200">
                    {/* Organizer info */}
                    <div className="px-5 py-3 bg-ivory border-b border-ivory-200 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">Organizer Email</p>
                        <p className="font-ui text-xs text-ink">{group.organizer_email}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">Phone</p>
                        <p className="font-ui text-xs text-ink">{group.organizer_phone || "—"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-0.5">Created</p>
                        <p className="font-ui text-xs text-ink">{fmtDateTime(group.created_at)}</p>
                      </div>
                    </div>

                    {/* Members table */}
                    {members.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="font-ui text-sm text-ink-muted">No members have joined this group yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-ivory-200">
                        {members.map(member => (
                          <div key={member.id} className="px-5 py-3 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-aubergine/10 flex items-center justify-center shrink-0">
                              <span className="font-display font-bold text-aubergine text-[10px]">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-ui text-sm font-semibold text-ink">{member.name}</p>
                                {member.is_organizer && (
                                  <span className="font-mono text-[8px] text-marigold-dark bg-marigold/15 px-1.5 py-0.5 rounded-full">Organizer</span>
                                )}
                              </div>
                              <p className="font-mono text-[9px] text-ink-muted">{member.email}</p>
                            </div>
                            <div className="shrink-0">
                              {member.paid ? (
                                <span className="font-mono text-[9px] font-bold text-peacock bg-peacock/10 px-2 py-1 rounded-full">Paid</span>
                              ) : (
                                <span className="font-mono text-[9px] text-ink-muted bg-ivory px-2 py-1 rounded-full border border-ivory-200">Unpaid</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
