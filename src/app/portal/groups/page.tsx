"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatGroup {
  id: string;
  slug: string | null;
  name: string;
  emoji: string;
  description: string | null;
  category: string | null;
  color1: string;
  color2: string;
  group_type: "private" | "interest";
  member_count: number;
  message_count: number;
  is_pinned: boolean;
  is_hot: boolean;
  sort_order: number;
  last_message_at: string | null;
  created_at: string;
  discount_pct: number;
}

interface Membership {
  group_id: string;
  role: string;
  last_read_at: string;
}

const GROUP_EMOJIS = ["🥁","🎉","🦚","🔥","🌙","⚡","🎭","🌺","🏆","🎯","💃","🌸"];
const ALL_CATEGORIES = ["All","Fashion","Hangout","Food","Dance","Beginner","Vibes","Marketplace","Community","Social","Family","Planning"];

const CATEGORY_STYLE: Record<string, { pill: string }> = {
  Fashion:     { pill: "bg-[#892240]/15 text-[#892240]" },
  Hangout:     { pill: "bg-[#2E1B30]/10 text-[#3D2543]" },
  Food:        { pill: "bg-[#D4891B]/15 text-[#D4891B]" },
  Dance:       { pill: "bg-[#F5A623]/15 text-[#B87A00]" },
  Beginner:    { pill: "bg-[#0E8C7A]/15 text-[#0E8C7A]" },
  Vibes:       { pill: "bg-[#5a1e7a]/15 text-[#5a1e7a]" },
  Marketplace: { pill: "bg-[#7C1F2C]/15 text-[#7C1F2C]" },
  Community:   { pill: "bg-[#1a4a5e]/15 text-[#1a4a5e]" },
  Social:      { pill: "bg-[#892240]/15 text-[#892240]" },
  Family:      { pill: "bg-[#3D2543]/10 text-[#3D2543]"  },
  Planning:    { pill: "bg-[#D4891B]/15 text-[#D4891B]" },
};

function fmt(d: string | null): string {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ─── Private Group Card ───────────────────────────────────────────────────────
function PrivateGroupCard({ group, onOpen, onInvite }: {
  group: ChatGroup;
  onOpen: (id: string) => void;
  onInvite: (g: ChatGroup) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 hover:border-aubergine/20 hover:shadow-md transition-all overflow-hidden">
      {group.is_hot && <div className="h-0.5 bg-gradient-to-r from-[#F5A623] via-[#D4891B] to-[#892240]" />}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-md" style={{ backgroundColor: "#2E1B30" }}>
            {group.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-ink text-base leading-tight">{group.name}</h3>
                  {group.is_hot && <span className="font-mono text-[9px] font-bold text-[#D4891B] bg-[#F5A623]/15 px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
                  {group.is_pinned && <span className="font-mono text-[9px] text-ink-muted/50">📌</span>}
                </div>
                <p className="font-mono text-[10px] text-ink-muted">{group.member_count} members</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-[10px] text-ink-muted">{fmt(group.last_message_at)}</span>
              </div>
            </div>
            {group.discount_pct > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-marigold/10 border border-marigold/20 rounded-full px-2.5 py-0.5">
                <span className="font-mono text-[9px] font-bold text-[#D4891B]">{group.discount_pct}% group discount available</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onOpen(group.id)} className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Open Chat
          </button>
          <button onClick={() => onInvite(group)} className="flex-1 py-2.5 rounded-xl border border-marigold/40 text-[#D4891B] font-ui font-semibold text-sm hover:bg-marigold/10 transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Invite to Event
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Interest Group Card ──────────────────────────────────────────────────────
function InterestGroupCard({ group, joined, joining, onJoin, onOpen }: {
  group: ChatGroup;
  joined: boolean;
  joining: boolean;
  onJoin: (g: ChatGroup) => void;
  onOpen: (id: string) => void;
}) {
  const [count, setCount] = useState(group.member_count);
  // Animate member count when joined
  useEffect(() => { setCount(group.member_count); }, [group.member_count]);

  const cat = CATEGORY_STYLE[group.category ?? ""] ?? { pill: "bg-marigold/10 text-[#D4891B]" };

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden hover:border-aubergine/20 hover:shadow-md transition-all flex flex-col group">
      <div className="h-20 relative flex items-end px-4 pb-3" style={{ background: `linear-gradient(135deg, ${group.color1}, ${group.color2})` }}>
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          {[40,80,120].map((r,i) => (
            <div key={i} className="absolute rounded-full border border-white" style={{ width:r*2, height:r*2, top:"50%", right:-r/2, transform:"translateY(-50%)" }} />
          ))}
        </div>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/30 shadow-lg">
            {group.emoji}
          </div>
          <span className="font-mono text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
            {group.category}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {group.is_hot && <span className="font-mono text-[9px] font-bold bg-[#F5A623]/90 text-aubergine px-2 py-0.5 rounded-full">🔥 HOT</span>}
          <span className="font-mono text-[9px] text-white font-bold bg-black/25 rounded-full px-2.5 py-1">{count.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-display font-bold text-ink text-base leading-tight">{group.name}</h3>
          <p className="font-ui text-xs text-ink-muted mt-1.5 leading-relaxed line-clamp-2">{group.description}</p>
        </div>
        <div className="mt-auto">
          {joined ? (
            <button onClick={() => onOpen(group.id)} className="w-full py-2.5 rounded-xl bg-peacock text-white font-ui font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              Open Chat
            </button>
          ) : (
            <button onClick={() => onJoin(group)} disabled={joining} className="w-full py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {joining ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>}
              {joining ? "Joining…" : "Join Community"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName]   = useState("");
  const [emoji, setEmoji] = useState("🥁");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: group } = await supabase
      .from("chat_groups")
      .insert({ name: name.trim(), emoji, group_type: "private", created_by: user.id })
      .select("id")
      .single();

    if (group) {
      await supabase.from("chat_group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });
      onCreated(group.id);
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-ivory-200">
          <h2 className="font-display font-bold text-ink text-lg">New Group</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-ivory flex items-center justify-center text-ink-muted hover:text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Group vibe</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_EMOJIS.map(em => (
                <button key={em} onClick={() => setEmoji(em)} className={`w-10 h-10 rounded-xl text-2xl transition-all ${emoji === em ? "bg-aubergine scale-110 shadow-md" : "bg-ivory hover:bg-ivory-200"}`}>{em}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Group name</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-aubergine flex items-center justify-center text-2xl shrink-0">{emoji}</div>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Chicago Navratri Crew"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                className="flex-1 rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
              />
            </div>
          </div>
          <p className="font-mono text-[9px] text-ink-muted">Invite friends by sharing the chat link after creating.</p>
        </div>
        <div className="px-6 pb-5">
          <button onClick={handleCreate} disabled={!name.trim() || saving} className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all ${name.trim() && !saving ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
            {saving ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const router = useRouter();
  const supabase = useRef(createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [myGroups, setMyGroups] = useState<ChatGroup[]>([]);
  const [interestGroups, setInterestGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState("All");
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  // ── Load data ───────────────────────────────────────────────
  const loadAll = useCallback(async (uid: string) => {
    const sb = supabase.current;

    const [{ data: mems }, { data: interest }, { data: priv }] = await Promise.all([
      sb.from("chat_group_members").select("group_id, role, last_read_at").eq("user_id", uid),
      sb.from("chat_groups").select("*").eq("group_type", "interest").eq("admin_hidden", false).eq("is_active", true).order("sort_order"),
      sb.from("chat_groups").select("*").eq("group_type", "private").eq("admin_hidden", false).eq("is_active", true),
    ]);

    const memberGroupIds = new Set((mems ?? []).map(m => m.group_id));

    setMemberships(mems ?? []);
    setInterestGroups(interest ?? []);

    // Private groups the user is a member of
    const userPrivate = (priv ?? []).filter(g => memberGroupIds.has(g.id));
    // Interest groups the user has joined (show in My Groups too)
    const userInterest = (interest ?? []).filter(g => memberGroupIds.has(g.id));
    setMyGroups([...userPrivate, ...userInterest].sort((a, b) => {
      const aTime = a.last_message_at ?? a.created_at;
      const bTime = b.last_message_at ?? b.created_at;
      return bTime > aTime ? 1 : -1;
    }));

    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadAll(user.id);
    });
  }, [loadAll]);

  // ── Realtime: member count & hot status ──────────────────────
  useEffect(() => {
    if (!userId) return;
    const sb = supabase.current;
    const channel = sb.channel("groups-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_groups" }, payload => {
        const updated = payload.new as ChatGroup;
        setInterestGroups(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
        setMyGroups(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_group_members" }, payload => {
        // Someone else joined an interest group — count already updated via trigger
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [userId]);

  // ── Join interest group ───────────────────────────────────────
  async function handleJoin(group: ChatGroup) {
    if (!userId) return;
    setJoiningId(group.id);
    const { error } = await supabase.current
      .from("chat_group_members")
      .insert({ group_id: group.id, user_id: userId, role: "member" });

    if (!error) {
      setMemberships(prev => [...prev, { group_id: group.id, role: "member", last_read_at: new Date().toISOString() }]);
      setMyGroups(prev => [...prev, { ...group, member_count: group.member_count + 1 }]);
      setInterestGroups(prev => prev.map(g => g.id === group.id ? { ...g, member_count: g.member_count + 1 } : g));
      showToast(`Joined "${group.name}" 🎉 Welcome to the community!`);
      setTimeout(() => router.push(`/portal/group-chat/${group.id}`), 800);
    }
    setJoiningId(null);
  }

  const joinedIds = new Set(memberships.map(m => m.group_id));
  const filteredInterest = activeCat === "All" ? interestGroups : interestGroups.filter(g => g.category === activeCat);
  const totalUnread = 0; // TODO: compute from last_read_at vs last_message_at

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-aubergine text-white px-5 py-3 rounded-2xl shadow-2xl font-ui text-sm font-medium max-w-sm text-center animate-fade-in">
          {toast}
        </div>
      )}
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={id => { showToast("Group created! 🎉"); router.push(`/portal/group-chat/${id}`); }} />}

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #2E1B30, #1a1230)" }}>
        <div className="relative px-6 py-7">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: "#F5A623" }}/>
            <div className="absolute bottom-0 left-0 w-32 h-32 opacity-8 blur-2xl rounded-full" style={{ backgroundColor: "#0E8C7A" }}/>
          </div>
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-white text-2xl">Groups & Communities</h1>
              <p className="font-ui text-white/50 text-sm mt-0.5">{myGroups.length} joined · {interestGroups.length} communities live</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-marigold text-aubergine font-ui font-bold text-sm hover:bg-[#E8A53D] transition-all shadow-lg shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              New Group
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "My Groups",   value: myGroups.length },
              { label: "Communities", value: joinedIds.size  },
              { label: "Live Now",    value: interestGroups.filter(g => g.is_hot).length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-2xl px-3 py-2.5 text-center border border-white/8">
                <p className="font-display font-bold text-white text-xl">{value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── My Groups ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-ink text-lg">My Groups</h2>
        <div className="bg-marigold/10 border border-marigold/20 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="font-ui text-xs text-ink-muted leading-relaxed">Use <strong className="text-ink">Invite to Event</strong> inside any group chat to send a ticket link — everyone buys together and unlocks the group discount automatically.</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-aubergine animate-spin"/></div>
        ) : myGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-ivory-200">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-display font-bold text-ink">No groups yet</p>
            <p className="font-ui text-sm text-ink-muted mt-1">Create a private group or join a community below</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 rounded-2xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">Create Group</button>
          </div>
        ) : (
          <div className="space-y-3">
            {myGroups.map(g => (
              g.group_type === "private"
                ? <PrivateGroupCard key={g.id} group={g} onOpen={id => router.push(`/portal/group-chat/${id}`)} onInvite={() => router.push(`/portal/group-chat/${g.id}`)} />
                : <InterestGroupCard key={g.id} group={g} joined={true} joining={false} onJoin={handleJoin} onOpen={id => router.push(`/portal/group-chat/${id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Explore Communities ────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-bold text-ink text-lg">Explore Communities</h2>
          <p className="font-ui text-sm text-ink-muted mt-0.5">Open to everyone — join the conversations that match your vibe</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)} className={`px-3.5 py-1.5 rounded-full font-ui font-semibold text-xs transition-all ${activeCat === cat ? "bg-aubergine text-white shadow-sm" : "bg-white border border-ivory-200 text-ink-muted hover:border-aubergine/30 hover:text-ink"}`}>
              {cat}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-aubergine animate-spin"/></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInterest.map(g => (
              <InterestGroupCard key={g.id} group={g} joined={joinedIds.has(g.id)} joining={joiningId === g.id} onJoin={handleJoin} onOpen={id => router.push(`/portal/group-chat/${id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
