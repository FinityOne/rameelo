"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type FriendState = "none" | "pending_sent" | "pending_received" | "friends";
type TabKey = "discover" | "friends" | "requests";

interface UserRecord {
  id: string;
  displayName: string;
  realName: string;
  city: string;
  bio: string;
  emoji: string;
  color1: string;
  color2: string;
  xp: number;
  level: number;
  avatarUrl: string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PALETTE: [string, string][] = [
  ["#5a1e7a", "#8B2FC9"], ["#892240", "#D4891B"], ["#D4891B", "#F5A623"],
  ["#0E8C7A", "#1ab89e"], ["#1a4a5e", "#2a7a9e"], ["#3D2543", "#6B3A7A"],
  ["#7C1F2C", "#B82D40"], ["#2E1B30", "#4a2850"], ["#892240", "#C4384A"],
];
const EMOJIS = ["🦚","🐯","🦁","🦋","🦜","🐻","🦊","🦄","🔥","🦩","🐉","🦅","🌙","🎺","🌸","⚡","🎭","🌊","🎯","🌺","🏆","🌈","🎸","🥁"];
const LEVEL_NAMES = ["","Khelaiya Novice","Garba Enthusiast","Raas Dancer","Chaniya Champion","Dhol Rider","Navratri Star","Festival Legend","Garba Elder","Rameelo Icon","Garba God"];

function deriveColors(uid: string): [string, string] {
  const n = (uid.codePointAt(0) ?? 0) + (uid.codePointAt(uid.length - 1) ?? 0);
  return PALETTE[n % PALETTE.length];
}
function deriveEmoji(uid: string, stored?: string | null): string {
  if (stored && stored !== "👤") return stored;
  const n = (uid.codePointAt(2) ?? 0) + (uid.codePointAt(uid.length - 2) ?? 0);
  return EMOJIS[n % EMOJIS.length];
}
function toUserRecord(p: Record<string, unknown>): UserRecord {
  const [c1, c2] = deriveColors(p.id as string);
  const city = [p.city, p.state].filter(Boolean).join(", ");
  const realName = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return {
    id: p.id as string,
    displayName: (p.display_name as string) || (p.first_name as string) || realName || "Garba Fan",
    realName,
    city,
    bio: (p.bio as string) || "Garba lover on Rameelo 🥁",
    emoji: deriveEmoji(p.id as string, p.avatar_emoji as string | null),
    color1: c1,
    color2: c2,
    xp: (p.xp as number) || 0,
    level: (p.level as number) || 1,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function FriendAvatar({ emoji, color1, color2, avatarUrl, size = "md" }: {
  emoji: string; color1: string; color2: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const cls = {
    xs: "w-8 h-8 text-lg rounded-xl",
    sm: "w-10 h-10 text-xl rounded-xl",
    md: "w-14 h-14 text-3xl rounded-2xl",
    lg: "w-20 h-20 text-4xl rounded-3xl",
    xl: "w-28 h-28 text-5xl rounded-3xl",
  }[size];
  return (
    <div
      className={`${cls} flex items-center justify-center shadow-lg shrink-0 overflow-hidden`}
      style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        : emoji}
    </div>
  );
}

// ─── Discover Card ────────────────────────────────────────────────────────────
function DiscoverCard({ user, state, onAction }: {
  user: UserRecord; state: FriendState;
  onAction: (id: string, action: "add" | "cancel" | "remove") => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5 flex flex-col gap-4 hover:border-aubergine/20 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <FriendAvatar emoji={user.emoji} color1={user.color1} color2={user.color2} avatarUrl={user.avatarUrl} size="lg" />
        <div className="bg-marigold/10 border border-marigold/20 rounded-full px-2.5 py-1 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#D4891B] font-bold">
            Lv.{user.level}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <p className="font-display font-bold text-ink text-base leading-tight">{user.displayName}</p>
        <p className="font-ui text-xs text-ink-muted mt-0.5">{user.realName}{user.city ? ` · ${user.city}` : ""}</p>
        <p className="font-ui text-xs text-ink mt-2 leading-relaxed line-clamp-2">{user.bio}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-marigold text-xs">⚡</span>
          <span className="font-mono text-[10px] text-ink-muted">{user.xp.toLocaleString()} XP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-peacock text-xs">●</span>
          <span className="font-mono text-[10px] text-ink-muted">{LEVEL_NAMES[user.level]}</span>
        </div>
      </div>
      {state === "friends" ? (
        <button
          onClick={() => onAction(user.id, "remove")}
          className="w-full py-2.5 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-durga/30 hover:text-durga transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Friends
        </button>
      ) : state === "pending_sent" ? (
        <button
          onClick={() => onAction(user.id, "cancel")}
          className="w-full py-2.5 rounded-xl bg-ivory border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-durga/30 hover:text-durga transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Request Sent
        </button>
      ) : (
        <button
          onClick={() => onAction(user.id, "add")}
          className="w-full py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Friend
        </button>
      )}
    </div>
  );
}

// ─── Friend Row ───────────────────────────────────────────────────────────────
function FriendRow({ user, onRemove, onClick }: {
  user: UserRecord; onRemove: (id: string) => void; onClick: () => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-ivory-200 p-4 flex items-center gap-4 hover:border-aubergine/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      <FriendAvatar emoji={user.emoji} color1={user.color1} color2={user.color2} avatarUrl={user.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display font-bold text-ink text-sm">{user.displayName}</p>
          <span className="font-mono text-[9px] text-[#D4891B] bg-marigold/10 px-1.5 py-0.5 rounded-full">Lv.{user.level}</span>
        </div>
        <p className="font-ui text-xs text-ink-muted truncate">{user.realName}{user.city ? ` · ${user.city}` : ""}</p>
        <p className="font-ui text-xs text-ink mt-0.5 truncate opacity-70">{user.bio}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link
          href="/portal/groups"
          className="h-9 px-3 rounded-xl bg-peacock/10 text-peacock font-ui font-semibold text-xs hover:bg-peacock/20 transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          Chat
        </Link>
        <button
          onClick={() => onRemove(user.id)}
          className="h-9 px-3 rounded-xl border border-ivory-200 text-ink-muted font-ui text-xs hover:border-durga/30 hover:text-durga transition-all"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ user, direction, onAccept, onDecline, onCancel, onClick }: {
  user: UserRecord; direction: "incoming" | "outgoing";
  onAccept: (id: string) => void; onDecline: (id: string) => void;
  onCancel: (id: string) => void; onClick: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all cursor-pointer ${direction === "incoming" ? "border-marigold/30 hover:border-marigold/50" : "border-ivory-200 hover:border-aubergine/20"}`}
      onClick={onClick}
    >
      <FriendAvatar emoji={user.emoji} color1={user.color1} color2={user.color2} avatarUrl={user.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display font-bold text-ink text-sm">{user.displayName}</p>
          <span className="font-mono text-[9px] text-[#D4891B] bg-marigold/10 px-1.5 py-0.5 rounded-full">Lv.{user.level}</span>
        </div>
        <p className="font-ui text-xs text-ink-muted">{user.realName}{user.city ? ` · ${user.city}` : ""}</p>
        <p className="font-mono text-[10px] text-ink-muted/60 mt-0.5">
          {direction === "incoming" ? "Wants to join your garba crew 🎉" : "Request pending · they'll see this soon"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {direction === "incoming" ? (
          <>
            <button
              onClick={() => onAccept(user.id)}
              className="h-9 px-4 rounded-xl bg-peacock text-white font-ui font-semibold text-xs hover:opacity-90 transition-all"
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(user.id)}
              className="h-9 px-3 rounded-xl border border-ivory-200 text-ink-muted font-ui text-xs hover:border-durga/30 hover:text-durga transition-all"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            onClick={() => onCancel(user.id)}
            className="h-9 px-3 rounded-xl border border-ivory-200 text-ink-muted font-ui text-xs hover:border-durga/30 hover:text-durga transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ user, state, onClose, onAction }: {
  user: UserRecord; state: FriendState; onClose: () => void;
  onAction: (id: string, action: "add" | "cancel" | "remove") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${user.color1}, ${user.color2})` }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute -bottom-10 left-5">
            <FriendAvatar emoji={user.emoji} color1={user.color1} color2={user.color2} avatarUrl={user.avatarUrl} size="lg" />
          </div>
        </div>
        <div className="pt-14 px-5 pb-5 space-y-4">
          <div>
            <h2 className="font-display font-bold text-ink text-xl">{user.displayName}</h2>
            <p className="font-ui text-sm text-ink-muted">{user.realName}{user.city ? ` · ${user.city}` : ""}</p>
          </div>
          <p className="font-ui text-sm text-ink leading-relaxed bg-ivory rounded-xl px-4 py-3">{user.bio}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "XP", value: user.xp.toLocaleString() },
              { label: "Level", value: `Lv.${user.level}` },
              { label: "Rank", value: LEVEL_NAMES[user.level]?.split(" ")[0] ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-ivory rounded-xl py-3">
                <p className="font-display font-bold text-ink text-base leading-none">{value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {state === "friends" ? (
              <>
                <Link
                  href="/portal/groups"
                  className="flex-1 py-3 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm text-center hover:opacity-90 transition-all"
                >
                  Message
                </Link>
                <button
                  onClick={() => { onAction(user.id, "remove"); onClose(); }}
                  className="flex-1 py-3 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-durga/30 hover:text-durga transition-all"
                >
                  Remove Friend
                </button>
              </>
            ) : state === "pending_sent" ? (
              <button
                onClick={() => { onAction(user.id, "cancel"); onClose(); }}
                className="flex-1 py-3 rounded-xl bg-ivory border border-ivory-200 text-ink-muted font-ui font-semibold text-sm transition-all"
              >
                Cancel Request
              </button>
            ) : state === "pending_received" ? (
              <button
                onClick={() => { onAction(user.id, "add"); onClose(); }}
                className="flex-1 py-3 rounded-xl bg-peacock text-white font-ui font-semibold text-sm hover:opacity-90 transition-all"
              >
                Accept Request
              </button>
            ) : (
              <button
                onClick={() => { onAction(user.id, "add"); onClose(); }}
                className="flex-1 py-3 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Friend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FriendsPage() {
  const [myUid, setMyUid] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("discover");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [toast, setToast] = useState("");
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setMyUid(user.id);

      const [{ data: profiles }, { data: ships }] = await Promise.all([
        sb.from("profiles")
          .select("id, first_name, last_name, display_name, city, state, bio, avatar_emoji, avatar_url, xp, level")
          .neq("id", user.id)
          .order("xp", { ascending: false })
          .limit(80),
        sb.from("friendships")
          .select("id, requester_id, addressee_id, status")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      ]);

      setUsers((profiles ?? []).map(toUserRecord));
      setFriendships((ships ?? []) as FriendshipRow[]);
      setLoading(false);
    })();
  }, []);

  // ─── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!myUid) return;
    const sb = createClient();

    const channel = sb.channel(`friendships:${myUid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friendships" }, (payload) => {
        const row = payload.new as FriendshipRow;
        if (row.requester_id !== myUid && row.addressee_id !== myUid) return;
        setFriendships((prev) => [...prev.filter(f => f.id !== row.id), row]);
        if (row.addressee_id === myUid) showToast("New friend request! 🎉");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "friendships" }, (payload) => {
        const row = payload.new as FriendshipRow;
        if (row.requester_id !== myUid && row.addressee_id !== myUid) return;
        setFriendships((prev) => prev.map(f => f.id === row.id ? row : f));
        if (row.status === "accepted" && row.requester_id === myUid) showToast("Friend request accepted! 🥁");
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "friendships" }, (payload) => {
        const row = payload.old as { id: string };
        setFriendships((prev) => prev.filter(f => f.id !== row.id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); sb.removeChannel(channel); };
  }, [myUid]);

  // ─── Derive state for a user ────────────────────────────────────────────────
  function getState(userId: string): FriendState {
    const row = friendships.find(
      (f) => (f.requester_id === myUid && f.addressee_id === userId) ||
             (f.addressee_id === myUid && f.requester_id === userId)
    );
    if (!row) return "none";
    if (row.status === "accepted") return "friends";
    if (row.status === "pending") {
      return row.requester_id === myUid ? "pending_sent" : "pending_received";
    }
    return "none";
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  async function handleAction(userId: string, action: "add" | "cancel" | "remove" | "accept" | "decline") {
    if (!myUid || pendingActions.has(userId)) return;
    setPendingActions((s) => new Set(s).add(userId));
    const sb = createClient();
    const user = users.find(u => u.id === userId);

    try {
      if (action === "add") {
        const { data } = await sb.from("friendships")
          .insert({ requester_id: myUid, addressee_id: userId, status: "pending" })
          .select("id, requester_id, addressee_id, status")
          .single();
        if (data) setFriendships((prev) => [...prev, data as FriendshipRow]);
        showToast(`Request sent to ${user?.displayName} 🎉`);

      } else if (action === "cancel") {
        await sb.from("friendships")
          .delete()
          .eq("requester_id", myUid)
          .eq("addressee_id", userId);
        setFriendships((prev) => prev.filter(f => !(f.requester_id === myUid && f.addressee_id === userId)));
        showToast("Request cancelled");

      } else if (action === "accept") {
        const row = friendships.find(f => f.requester_id === userId && f.addressee_id === myUid);
        if (row) {
          const { data } = await sb.from("friendships")
            .update({ status: "accepted" })
            .eq("id", row.id)
            .select("id, requester_id, addressee_id, status")
            .single();
          if (data) setFriendships((prev) => prev.map(f => f.id === row.id ? data as FriendshipRow : f));
        }
        showToast(`You and ${user?.displayName} are now friends! 🥁`);

      } else if (action === "decline") {
        const row = friendships.find(f => f.requester_id === userId && f.addressee_id === myUid);
        if (row) {
          await sb.from("friendships").delete().eq("id", row.id);
          setFriendships((prev) => prev.filter(f => f.id !== row.id));
        }
        showToast("Request declined");

      } else if (action === "remove") {
        await sb.from("friendships")
          .delete()
          .or(`and(requester_id.eq.${myUid},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${myUid})`);
        setFriendships((prev) => prev.filter(
          f => !((f.requester_id === myUid && f.addressee_id === userId) ||
                 (f.requester_id === userId && f.addressee_id === myUid))
        ));
        showToast(`Removed ${user?.displayName}`);
      }
    } finally {
      setPendingActions((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  // ─── Derived lists ──────────────────────────────────────────────────────────
  const friends = useMemo(() => users.filter(u => getState(u.id) === "friends"), [users, friendships]);
  const incoming = useMemo(() => users.filter(u => getState(u.id) === "pending_received"), [users, friendships]);
  const outgoing = useMemo(() => users.filter(u => getState(u.id) === "pending_sent"), [users, friendships]);

  const discoverPool = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (getState(u.id) === "pending_received") return false;
      return !q || u.displayName.toLowerCase().includes(q) || u.realName.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
    });
  }, [users, friendships, search]);

  const filteredFriends = useMemo(() => {
    const q = search.toLowerCase();
    return friends.filter(u => !q || u.displayName.toLowerCase().includes(q) || u.realName.toLowerCase().includes(q));
  }, [friends, search]);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "discover", label: "Discover" },
    { key: "friends", label: "Friends", count: friends.length },
    { key: "requests", label: "Requests", count: incoming.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-aubergine text-white px-5 py-3 rounded-2xl shadow-2xl font-ui text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Profile modal */}
      {selectedUser && (
        <ProfileModal
          user={selectedUser}
          state={getState(selectedUser.id)}
          onClose={() => setSelectedUser(null)}
          onAction={(id, action) => handleAction(id, action)}
        />
      )}

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #2E1B30, #1a1230)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[120, 200, 280].map((r, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" style={{ width: r * 2, height: r * 2 }} />
          ))}
          <div className="absolute top-1/4 right-12 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: "#F5A623" }} />
        </div>
        <div className="relative px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-white text-2xl">Find Your Garba Crew</h1>
              <p className="font-ui text-white/50 text-sm mt-1">
                Connect with {users.length}+ khelaiya across the USA · invite them to events
              </p>
            </div>
            <div className="flex -space-x-3">
              {users.slice(0, 6).map((u) => (
                <div
                  key={u.id}
                  className="w-10 h-10 rounded-xl border-2 border-aubergine/50 flex items-center justify-center text-xl shadow-lg overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${u.color1}, ${u.color2})` }}
                >
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : u.emoji}
                </div>
              ))}
              {users.length > 6 && (
                <div className="w-10 h-10 rounded-xl border-2 border-aubergine/50 bg-white/10 flex items-center justify-center text-white/60 font-mono text-[10px] font-bold">
                  +{users.length - 6}
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 text-white placeholder-white/30 font-ui text-sm focus:outline-none focus:bg-white/15 transition-all border border-white/10 focus:border-white/20"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-ivory-200 w-fit">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-ui font-semibold text-sm transition-all ${
              tab === key ? "bg-aubergine text-white shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                tab === key ? "bg-white/20 text-white" : key === "requests" ? "bg-durga text-white" : "bg-marigold/20 text-[#D4891B]"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Discover */}
      {tab === "discover" && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">
            {discoverPool.length} khelaiya{search ? ` matching "${search}"` : " to discover"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverPool.map((user) => (
              <div key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer">
                <DiscoverCard
                  user={user}
                  state={getState(user.id)}
                  onAction={(id, action) => { handleAction(id, action); }}
                />
              </div>
            ))}
            {discoverPool.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-display font-bold text-ink">No results for "{search}"</p>
                <p className="font-ui text-sm text-ink-muted mt-1">Try a different name or city</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Friends */}
      {tab === "friends" && (
        <div className="space-y-3">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🦚</p>
              <p className="font-display font-bold text-ink text-lg">No friends yet</p>
              <p className="font-ui text-sm text-ink-muted mt-1">Head to Discover to find your garba crew!</p>
              <button onClick={() => setTab("discover")} className="mt-4 px-6 py-3 rounded-2xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">
                Discover Friends
              </button>
            </div>
          ) : (
            filteredFriends.map((user) => (
              <FriendRow
                key={user.id}
                user={user}
                onRemove={(id) => handleAction(id, "remove")}
                onClick={() => setSelectedUser(user)}
              />
            ))
          )}
        </div>
      )}

      {/* Requests */}
      {tab === "requests" && (
        <div className="space-y-6">
          {incoming.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
                Incoming — {incoming.length}
              </p>
              <div className="space-y-3">
                {incoming.map((user) => (
                  <RequestCard
                    key={user.id}
                    user={user}
                    direction="incoming"
                    onAccept={(id) => handleAction(id, "accept")}
                    onDecline={(id) => handleAction(id, "decline")}
                    onCancel={(id) => handleAction(id, "cancel")}
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
                Sent — {outgoing.length}
              </p>
              <div className="space-y-3">
                {outgoing.map((user) => (
                  <RequestCard
                    key={user.id}
                    user={user}
                    direction="outgoing"
                    onAccept={(id) => handleAction(id, "accept")}
                    onDecline={(id) => handleAction(id, "decline")}
                    onCancel={(id) => handleAction(id, "cancel")}
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">📭</p>
              <p className="font-display font-bold text-ink text-lg">All quiet here</p>
              <p className="font-ui text-sm text-ink-muted mt-1">No pending friend requests at the moment</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
