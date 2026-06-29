"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyGroupOrders, type MyGroupSummary } from "@/lib/group-orders";
import { GRADIENTS } from "@/app/organizer/events/create/types";

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function GroupCard({ g, myEmail }: { g: MyGroupSummary; myEmail: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const gradient = GRADIENTS.find(x => x.id === g.coverGradient) ?? GRADIENTS[0];

  function copyLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://www.rameelo.com"}/group/${g.groupId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-all ${open ? "border-aubergine/25 shadow-md" : "border-ivory-200"}`}>
      {/* Header row — toggle + quick copy-link icon */}
      <div className="flex items-stretch">
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left hover:bg-ivory/40 transition-colors">
          {/* cover swatch */}
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative" style={{ background: g.coverImageUrl ? undefined : gradient.css }}>
            {g.coverImageUrl && <img src={g.coverImageUrl} alt="" className="w-full h-full object-cover" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${g.paid ? "bg-peacock/10 text-peacock" : "bg-marigold/15 text-marigold-dark"}`}>
                {g.paid ? "Purchased" : "Forming"}
              </span>
              {g.isHost && <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Host</span>}
            </div>
            <p className="font-display font-bold text-ink text-sm mt-1 truncate">{g.name || g.eventTitle}</p>
            <p className="font-mono text-[10px] text-ink-muted truncate">
              {g.eventTitle !== (g.name || g.eventTitle) ? `${g.eventTitle} · ` : ""}{fmtDate(g.eventDate)}{g.city ? ` · ${g.city}, ${g.state}` : ""}
            </p>
          </div>

          <div className="text-right shrink-0 flex items-center gap-2">
            <div>
              <p className="font-display font-bold text-ink text-base leading-none">{g.myQty}</p>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">your tix</p>
            </div>
            <svg className={`w-4 h-4 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>

        {/* Quick copy group link */}
        <button
          onClick={copyLink}
          title="Copy group link"
          aria-label="Copy group link"
          className={`shrink-0 px-3.5 flex items-center justify-center border-l border-ivory-200 transition-colors ${copied ? "text-peacock bg-peacock/5" : "text-ink-muted hover:text-aubergine hover:bg-ivory/40"}`}
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          )}
        </button>
      </div>

      {open && (
        <>
          <div className="border-t border-dashed border-ivory-200 mx-4" />
          <div className="p-4 space-y-3">
            {/* Summary line */}
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                Who&rsquo;s in · {g.memberCount} {g.memberCount === 1 ? "person" : "people"}
              </p>
              <p className="font-mono text-[10px] text-ink-muted">{g.totalTickets} ticket{g.totalTickets !== 1 ? "s" : ""}{g.tierName ? ` · ${g.tierName}` : ""}</p>
            </div>

            {/* Members + ticket counts */}
            <div className="rounded-xl border border-ivory-200 divide-y divide-ivory-200 overflow-hidden">
              {g.members.map((m, i) => {
                const isMe = m.email.toLowerCase() === myEmail.toLowerCase();
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? "bg-aubergine/[0.03]" : ""}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                      {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-ui text-sm text-ink truncate">
                        {m.name}
                        {m.isOrganizer && <span className="ml-1.5 font-mono text-[8px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Host</span>}
                        {isMe && <span className="ml-1.5 font-mono text-[8px] uppercase tracking-wide text-aubergine">You</span>}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">{m.qty} tix</span>
                    {g.paid && (
                      <span className="w-4 h-4 rounded-full bg-peacock flex items-center justify-center shrink-0" title="Paid">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/group/${g.groupId}`} className="flex-1 py-2.5 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-sm text-center hover:bg-aubergine/5 transition-all">
                {g.paid ? "View group page" : "View group · see who's joined →"}
              </Link>
              {g.paid && (
                <Link href="/portal/tickets" className="flex-1 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm text-center hover:bg-marigold-dark transition-all">
                  View my tickets →
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function GroupOrdersPage() {
  const [groups, setGroups] = useState<MyGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEmail, setMyEmail] = useState("");

  useEffect(() => { document.title = "Group Orders | Rameelo"; }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setMyEmail(user.email ?? "");
      const data = await loadMyGroupOrders(user.id, user.email ?? "");
      setGroups(data);
      setLoading(false);
    });
  }, []);

  const purchased = groups.filter(g => g.paid);
  const forming = groups.filter(g => !g.paid);

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <div>
        <h1 className="font-display font-bold text-ink text-2xl">Group Orders</h1>
        <p className="font-ui text-sm text-ink-muted mt-0.5">Group ticket links you started or joined — track who&rsquo;s in and who got how many tickets.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-9 h-9 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-ivory-200">
          <div className="w-14 h-14 rounded-2xl bg-marigold/10 flex items-center justify-center mx-auto mb-3 text-2xl">👥</div>
          <p className="font-display font-bold text-ink">No group orders yet</p>
          <p className="font-ui text-sm text-ink-muted mt-1 mb-4">Start a group from any event to buy tickets together.</p>
          <Link href="/events" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {purchased.length > 0 && (
            <section className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold">Purchased · {purchased.length}</p>
              <div className="space-y-3">
                {purchased.map(g => <GroupCard key={g.groupId} g={g} myEmail={myEmail} />)}
              </div>
            </section>
          )}
          {forming.length > 0 && (
            <section className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold">Still forming · {forming.length}</p>
              <div className="space-y-3">
                {forming.map(g => <GroupCard key={g.groupId} g={g} myEmail={myEmail} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
