"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type FlagReason = "spam" | "inappropriate" | "harassment" | "misinformation" | "other";
type PostStatus = "visible" | "hidden" | "removed";
type UserStatus = "active" | "warned" | "blocked";

type ModerationPost = {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  city: string;
  state: string;
  time: string;
  text: string;
  photoCount: number;
  gradient?: string;
  eventTag?: string;
  flags: { reason: FlagReason; by: string; time: string }[];
  status: PostStatus;
  reactions: number;
  comments: number;
};

type ModerationUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  city: string;
  state: string;
  joinedDate: string;
  postCount: number;
  flagCount: number;
  status: UserStatus;
  blockedAt?: string;
  blockedReason?: string;
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  spam:           "Spam",
  inappropriate:  "Inappropriate",
  harassment:     "Harassment",
  misinformation: "Misinformation",
  other:          "Other",
};

const FLAG_REASON_COLORS: Record<FlagReason, string> = {
  spam:           "bg-marigold/15 text-[#a06b00]",
  inappropriate:  "bg-durga/12 text-durga",
  harassment:     "bg-durga/20 text-durga font-bold",
  misinformation: "bg-aubergine/12 text-aubergine",
  other:          "bg-ivory-200 text-ink-muted",
};

const MOCK_POSTS: ModerationPost[] = [
  {
    id: "mp1", userId: "mu5",
    userName: "TikTok Promoter", userInitials: "TP", userColor: "#7C1F2C",
    city: "Unknown", state: "—", time: "1h ago",
    text: "🚨 BIG DISCOUNT on designer chaniya choli!! Buy now at www.fakestoresite.com use code GARBA50 for 50% off!! Limited time only!! 🚨🚨🚨",
    photoCount: 0,
    flags: [
      { reason: "spam", by: "Priya S.", time: "45m ago" },
      { reason: "spam", by: "Karan M.", time: "30m ago" },
      { reason: "spam", by: "Nisha P.", time: "20m ago" },
    ],
    status: "visible", reactions: 0, comments: 0,
  },
  {
    id: "mp2", userId: "mu6",
    userName: "Anonymous123", userInitials: "AN", userColor: "#999",
    city: "Dallas", state: "TX", time: "3h ago",
    text: "Why does this organizer always pick favorites in the competition? Everyone knows the judging is rigged. I've seen them give the trophy to their friends multiple times now.",
    photoCount: 0,
    flags: [
      { reason: "misinformation", by: "Raj V.", time: "2h ago" },
      { reason: "harassment", by: "Meera T.", time: "1h ago" },
    ],
    status: "visible", reactions: 3, comments: 7,
  },
  {
    id: "mp3", userId: "mu7",
    userName: "EventBot2026", userInitials: "EB", userColor: "#E8891A",
    city: "Houston", state: "TX", time: "5h ago",
    text: "COME TO OUR EVENT NOT RAMEELO'S — Our tickets are $10 cheaper and there&apos;s no platform fee!! Sign up at [link] — tell your friends!!",
    photoCount: 1,
    gradient: "linear-gradient(135deg,#F5A623,#E8891A)",
    flags: [
      { reason: "spam", by: "Divya R.", time: "4h ago" },
      { reason: "inappropriate", by: "Arjun K.", time: "3h ago" },
    ],
    status: "visible", reactions: 2, comments: 1,
  },
  {
    id: "mp4", userId: "mu8",
    userName: "GossipGarba", userInitials: "GG", userColor: "#6366F1",
    city: "Atlanta", state: "GA", time: "8h ago",
    text: "Heard from someone at the venue that the organizer pocketed money from last year's event and didn't pay the DJ. Just a warning before you buy tickets 😬",
    photoCount: 0,
    flags: [
      { reason: "misinformation", by: "Karan M.", time: "7h ago" },
      { reason: "harassment", by: "Priya S.", time: "6h ago" },
      { reason: "other", by: "Raj V.", time: "5h ago" },
    ],
    status: "visible", reactions: 12, comments: 18,
  },
];

const MOCK_ALL_POSTS: ModerationPost[] = [
  ...MOCK_POSTS,
  {
    id: "mp5", userId: "u1",
    userName: "Priya Sharma", userInitials: "PS", userColor: "#E8547A",
    city: "Houston", state: "TX", time: "2h ago",
    text: "Night 3 was absolutely magical ✨ The energy on that floor was unlike anything we've seen — 800+ dancers moving as one. Thank you Houston for showing up and showing OUT every single year 🙏🪈",
    photoCount: 3,
    gradient: "linear-gradient(135deg,#F5A623,#E8547A)",
    eventTag: "Navratri Night 2026 – Night 3",
    flags: [],
    status: "visible", reactions: 545, comments: 3,
  },
  {
    id: "mp6", userId: "u2",
    userName: "Karan Mehta", userInitials: "KM", userColor: "#0E8C7A",
    city: "Atlanta", state: "GA", time: "4h ago",
    text: "WE WON 🏆🏆🏆 Atlanta Dandiya Dhol took first place in the couple's raas category at the Southeast Championship!",
    photoCount: 2,
    gradient: "linear-gradient(135deg,#F5A623,#a06b00)",
    eventTag: "Garba Raas Championship – Southeast",
    flags: [],
    status: "visible", reactions: 586, comments: 2,
  },
];

const MOCK_USERS: ModerationUser[] = [
  {
    id: "mu5", name: "TikTok Promoter", initials: "TP", color: "#7C1F2C",
    email: "promo@fakespam.com", city: "—", state: "—",
    joinedDate: "2026-05-10", postCount: 47, flagCount: 23,
    status: "active",
  },
  {
    id: "mu6", name: "Anonymous123", initials: "AN", color: "#999",
    email: "anon123@gmail.com", city: "Dallas", state: "TX",
    joinedDate: "2026-04-28", postCount: 8, flagCount: 4,
    status: "warned",
  },
  {
    id: "mu9", name: "SpamAccount99", initials: "SA", color: "#DC2626",
    email: "spam99@tempmail.io", city: "—", state: "—",
    joinedDate: "2026-05-01", postCount: 112, flagCount: 89,
    status: "blocked",
    blockedAt: "2026-05-12",
    blockedReason: "Repeat spammer — mass-promoting external events and fake discount sites",
  },
  {
    id: "mu7", name: "EventBot2026", initials: "EB", color: "#E8891A",
    email: "bot2026@fakemail.com", city: "Houston", state: "TX",
    joinedDate: "2026-05-08", postCount: 31, flagCount: 11,
    status: "active",
  },
  {
    id: "mu8", name: "GossipGarba", initials: "GG", color: "#6366F1",
    email: "gossip.garba@gmail.com", city: "Atlanta", state: "GA",
    joinedDate: "2026-03-15", postCount: 22, flagCount: 6,
    status: "active",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

const STATUS_META: Record<PostStatus, { label: string; cls: string }> = {
  visible: { label: "Visible",  cls: "bg-peacock/12 text-peacock" },
  hidden:  { label: "Hidden",   cls: "bg-marigold/15 text-[#a06b00]" },
  removed: { label: "Removed",  cls: "bg-durga/12 text-durga" },
};

const USER_STATUS_META: Record<UserStatus, { label: string; cls: string; dot: string }> = {
  active:  { label: "Active",  cls: "bg-peacock/12 text-peacock",    dot: "bg-peacock"  },
  warned:  { label: "Warned",  cls: "bg-marigold/15 text-[#a06b00]", dot: "bg-marigold" },
  blocked: { label: "Blocked", cls: "bg-durga/12 text-durga",         dot: "bg-durga"    },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="font-display font-bold mt-1" style={{ fontSize: 28, letterSpacing: "-0.03em", color, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p className="font-ui text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function FlagBadge({ reason }: { reason: FlagReason }) {
  return (
    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${FLAG_REASON_COLORS[reason]}`}>
      {FLAG_REASON_LABELS[reason]}
    </span>
  );
}

function FlaggedPostCard({
  post,
  onHide,
  onRemove,
  onBlockUser,
  onDismiss,
}: {
  post: ModerationPost;
  onHide: (id: string) => void;
  onRemove: (id: string) => void;
  onBlockUser: (userId: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const urgency = post.flags.length >= 3 ? "high" : post.flags.length === 2 ? "medium" : "low";
  const urgencyBorder = urgency === "high" ? "border-durga/40" : urgency === "medium" ? "border-marigold/40" : "border-ivory-200";
  const urgencyBg = urgency === "high" ? "bg-durga/3" : urgency === "medium" ? "bg-marigold/3" : "";

  if (post.status !== "visible") return null;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${urgencyBorder}`}>
      {/* Urgency header */}
      <div className={`px-5 py-2.5 border-b ${urgencyBorder} ${urgencyBg} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${urgency === "high" ? "bg-durga animate-pulse" : urgency === "medium" ? "bg-marigold" : "bg-ivory-200"}`} />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {post.flags.length} flag{post.flags.length !== 1 ? "s" : ""} ·{" "}
            <span className={urgency === "high" ? "text-durga font-bold" : urgency === "medium" ? "text-[#a06b00]" : "text-ink-muted"}>
              {urgency === "high" ? "HIGH PRIORITY" : urgency === "medium" ? "REVIEW" : "LOW"}
            </span>
          </p>
          <div className="flex items-center gap-1">
            {post.flags.map((f, i) => <FlagBadge key={i} reason={f.reason} />)}
          </div>
        </div>
        <span className="font-mono text-[9px] text-ink-muted shrink-0">{post.time}</span>
      </div>

      <div className="p-5">
        {/* Post author */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar initials={post.userInitials} color={post.userColor} />
          <div className="flex-1 min-w-0">
            <p className="font-ui font-bold text-ink text-sm">{post.userName}</p>
            <p className="font-mono text-[10px] text-ink-muted">{post.city}, {post.state}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-ink-muted">{post.reactions} reactions</span>
            <span className="text-ink-muted/30">·</span>
            <span className="font-mono text-[9px] text-ink-muted">{post.comments} comments</span>
          </div>
        </div>

        {/* Post text */}
        <div className="bg-ivory rounded-xl px-4 py-3 mb-3">
          <p className="font-ui text-sm text-ink leading-relaxed">{post.text}</p>
          {post.photoCount > 0 && post.gradient && (
            <div
              className="mt-2 h-20 rounded-xl overflow-hidden relative"
              style={{ background: post.gradient }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-mono text-[10px] text-white/70">{post.photoCount} photo{post.photoCount !== 1 ? "s" : ""} attached</p>
              </div>
            </div>
          )}
        </div>

        {/* Who flagged it */}
        <button onClick={() => setExpanded(e => !e)} className="mb-3 flex items-center gap-1.5 font-mono text-[10px] text-ink-muted hover:text-ink transition-colors">
          <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Flagged by: {post.flags.map(f => f.by).join(", ")}
        </button>

        {expanded && (
          <div className="mb-3 space-y-1.5 pl-4 border-l-2 border-ivory-200">
            {post.flags.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <FlagBadge reason={f.reason} />
                <span className="font-mono text-[10px] text-ink-muted">by {f.by}</span>
                <span className="font-mono text-[10px] text-ink-muted/50">{f.time}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onDismiss(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-peacock/30 text-peacock font-ui font-semibold text-xs hover:bg-peacock hover:text-white transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Approve — looks fine
          </button>
          <button
            onClick={() => onHide(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-marigold/30 text-[#a06b00] font-ui font-semibold text-xs hover:bg-marigold/10 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Hide post
          </button>
          <button
            onClick={() => onRemove(post.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-durga/30 text-durga font-ui font-semibold text-xs hover:bg-durga/10 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove post
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onBlockUser(post.userId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-durga text-white font-ui font-bold text-xs hover:bg-durga/90 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Block {post.userName}
          </button>
        </div>
      </div>
    </div>
  );
}

function AllPostRow({
  post,
  onHide,
  onRestore,
  onRemove,
}: {
  post: ModerationPost;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const statusMeta = STATUS_META[post.status];
  return (
    <div className={`px-5 py-4 flex items-start gap-4 border-b border-ivory-200 last:border-0 hover:bg-ivory/40 transition-colors ${post.status !== "visible" ? "opacity-60" : ""}`}>
      <Avatar initials={post.userInitials} color={post.userColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-ui font-semibold text-ink text-sm">{post.userName}</p>
          <span className="font-mono text-[9px] text-ink-muted">{post.city}, {post.state}</span>
          <span className="font-mono text-[9px] text-ink-muted">{post.time}</span>
          {post.flags.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-durga/10 text-durga font-mono text-[9px] font-bold">
              ⚑ {post.flags.length}
            </span>
          )}
        </div>
        <p className="font-ui text-sm text-ink-muted truncate">{post.text}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
          {statusMeta.label}
        </span>
        {post.status === "visible" ? (
          <button onClick={() => onHide(post.id)} className="font-mono text-[9px] text-[#a06b00] hover:underline">Hide</button>
        ) : post.status === "hidden" ? (
          <button onClick={() => onRestore(post.id)} className="font-mono text-[9px] text-peacock hover:underline">Restore</button>
        ) : null}
        {post.status !== "removed" && (
          <button onClick={() => onRemove(post.id)} className="font-mono text-[9px] text-durga hover:underline">Remove</button>
        )}
      </div>
    </div>
  );
}

function BlockedUserRow({
  user,
  onUnblock,
  onWarn,
  onBlock,
}: {
  user: ModerationUser;
  onUnblock: (id: string) => void;
  onWarn: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  const meta = USER_STATUS_META[user.status];
  return (
    <div className="px-5 py-4 flex items-center gap-4 border-b border-ivory-200 last:border-0 hover:bg-ivory/30 transition-colors">
      <Avatar initials={user.initials} color={user.color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-ui font-semibold text-ink text-sm">{user.name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-widest ${meta.cls}`}>
            <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <p className="font-mono text-[10px] text-ink-muted mt-0.5">{user.email}</p>
        {user.blockedAt && user.blockedReason && (
          <p className="font-mono text-[9px] text-durga/70 mt-0.5 truncate">Blocked {fmtDate(user.blockedAt)}: {user.blockedReason}</p>
        )}
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="font-mono text-[10px] text-ink-muted">{user.postCount} posts · {user.flagCount} flags</p>
        <p className="font-mono text-[9px] text-ink-muted/50">Joined {fmtDate(user.joinedDate)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {user.status === "blocked" ? (
          <button
            onClick={() => onUnblock(user.id)}
            className="px-3 py-1.5 rounded-xl border border-peacock/30 text-peacock font-ui font-semibold text-xs hover:bg-peacock hover:text-white transition-all"
          >
            Unblock
          </button>
        ) : (
          <>
            {user.status !== "warned" && (
              <button
                onClick={() => onWarn(user.id)}
                className="px-3 py-1.5 rounded-xl border border-marigold/30 text-[#a06b00] font-ui font-semibold text-xs hover:bg-marigold/10 transition-all"
              >
                Warn
              </button>
            )}
            <button
              onClick={() => onBlock(user.id)}
              className="px-3 py-1.5 rounded-xl bg-durga text-white font-ui font-bold text-xs hover:bg-durga/90 transition-all"
            >
              Block
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminCommunityPage() {
  const [tab, setTab] = useState<"overview" | "flagged" | "all" | "users">("overview");
  const [posts, setPosts] = useState<ModerationPost[]>(MOCK_ALL_POSTS);
  const [users, setUsers] = useState<ModerationUser[]>(MOCK_USERS);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

  function toast(msg: string) {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  }

  function hidePost(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "hidden" as PostStatus } : p));
    toast("Post hidden from community feed");
  }
  function restorePost(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "visible" as PostStatus, flags: [] } : p));
    toast("Post restored and flags cleared");
  }
  function removePost(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "removed" as PostStatus } : p));
    toast("Post permanently removed");
  }
  function dismissFlags(id: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, flags: [] } : p));
    toast("Flags cleared — post approved");
  }
  function blockUser(userId: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "blocked" as UserStatus, blockedAt: new Date().toISOString().split("T")[0] } : u));
    setPosts(prev => prev.map(p => p.userId === userId ? { ...p, status: "hidden" as PostStatus } : p));
    toast("User blocked and posts hidden");
  }
  function warnUser(userId: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "warned" as UserStatus } : u));
    toast("Warning issued to user");
  }
  function unblockUser(userId: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "active" as UserStatus, blockedAt: undefined, blockedReason: undefined } : u));
    toast("User unblocked — can post again");
  }

  const flaggedPosts     = posts.filter(p => p.flags.length > 0 && p.status === "visible");
  const blockedUsers     = users.filter(u => u.status === "blocked");
  const warnedUsers      = users.filter(u => u.status === "warned");
  const totalFlags       = posts.reduce((s, p) => s + p.flags.length, 0);
  const highPriority     = flaggedPosts.filter(p => p.flags.length >= 3);

  const filteredUsers = userSearch
    ? users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const TABS = [
    { key: "overview" as const, label: "Overview",     badge: undefined },
    { key: "flagged"  as const, label: "Flagged",      badge: flaggedPosts.length > 0 ? flaggedPosts.length : undefined },
    { key: "all"      as const, label: "All Posts",    badge: undefined },
    { key: "users"    as const, label: "Users",        badge: blockedUsers.length > 0 ? blockedUsers.length : undefined },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Community Moderation</h1>
          <p className="font-ui text-ink-muted text-sm mt-0.5">
            {flaggedPosts.length} item{flaggedPosts.length !== 1 ? "s" : ""} need review · {blockedUsers.length} user{blockedUsers.length !== 1 ? "s" : ""} blocked
          </p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-ivory rounded-2xl p-1 border border-ivory-200 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2 rounded-xl font-ui font-semibold text-sm transition-all ${tab === t.key ? "bg-white text-ink shadow-sm border border-ivory-200" : "text-ink-muted hover:text-ink"}`}
            >
              {t.label}
              {t.badge != null && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-durga text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Posts today"    value={posts.length}               sub="across all status"      color="#2E1B30" />
            <StatTile label="Flagged items"  value={flaggedPosts.length}        sub="awaiting review"        color={flaggedPosts.length > 0 ? "#a06b00" : "#0E8C7A"} />
            <StatTile label="High priority"  value={highPriority.length}        sub="3+ flags each"          color={highPriority.length > 0 ? "#7C1F2C" : "#0E8C7A"} />
            <StatTile label="Blocked users"  value={blockedUsers.length}        sub={`${warnedUsers.length} warned`} color="#7C1F2C" />
          </div>

          {/* High priority queue */}
          {highPriority.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-durga animate-pulse" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">High Priority — Needs Immediate Action</p>
              </div>
              <div className="space-y-4">
                {highPriority.map(p => (
                  <FlaggedPostCard
                    key={p.id}
                    post={p}
                    onHide={hidePost}
                    onRemove={removePost}
                    onBlockUser={blockUser}
                    onDismiss={dismissFlags}
                  />
                ))}
              </div>
            </div>
          )}

          {highPriority.length === 0 && (
            <div className="bg-white rounded-2xl border border-peacock/20 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-peacock/10 flex items-center justify-center mx-auto mb-3 text-2xl">✅</div>
              <p className="font-display font-semibold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>All clear!</p>
              <p className="font-ui text-ink-muted text-sm mt-1">No high-priority flags at this time. Community looks healthy.</p>
            </div>
          )}

          {/* Activity timeline */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Recent Moderation Activity</p>
            </div>
            <div className="divide-y divide-ivory-200">
              {[
                { icon: "🚫", text: "SpamAccount99 blocked after 89 flags",               time: "May 12", color: "text-durga" },
                { icon: "🙈", text: "3 posts hidden from spam campaign",                  time: "May 12", color: "text-[#a06b00]" },
                { icon: "⚠️",  text: "Anonymous123 issued warning for harassment flags", time: "May 11", color: "text-[#a06b00]" },
                { icon: "✅", text: "4 flagged posts reviewed and approved",              time: "May 10", color: "text-peacock" },
                { icon: "🗑️", text: "Removed 2 posts violating community guidelines",     time: "May 9",  color: "text-durga" },
              ].map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <p className={`font-ui text-sm flex-1 ${item.color}`}>{item.text}</p>
                  <p className="font-mono text-[10px] text-ink-muted shrink-0">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Flagged ── */}
      {tab === "flagged" && (
        <div className="space-y-4">
          {flaggedPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ivory-200 p-16 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-display font-semibold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>Nothing to review</p>
              <p className="font-ui text-ink-muted text-sm mt-1">All flagged content has been handled. Come back later.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  {flaggedPosts.length} post{flaggedPosts.length !== 1 ? "s" : ""} flagged by community
                </p>
                <div className="flex-1 h-px bg-ivory-200" />
                <p className="font-mono text-[10px] text-ink-muted">sorted by flag count</p>
              </div>
              {[...flaggedPosts].sort((a, b) => b.flags.length - a.flags.length).map(p => (
                <FlaggedPostCard
                  key={p.id}
                  post={p}
                  onHide={hidePost}
                  onRemove={removePost}
                  onBlockUser={blockUser}
                  onDismiss={dismissFlags}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── All Posts ── */}
      {tab === "all" && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">All Community Posts</p>
            <p className="font-mono text-[10px] text-ink-muted">{posts.length} total</p>
          </div>
          <div>
            {posts.map(p => (
              <AllPostRow
                key={p.id}
                post={p}
                onHide={hidePost}
                onRestore={restorePost}
                onRemove={removePost}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40"
            />
          </div>

          {/* Status filter summary */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["active", "warned", "blocked"] as UserStatus[]).map(s => {
              const meta = USER_STATUS_META[s];
              const count = users.filter(u => u.status === s).length;
              return (
                <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest ${meta.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {count} {meta.label}
                </span>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              {filteredUsers.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-ui text-sm text-ink-muted">No users match your search.</p>
                </div>
              ) : (
                filteredUsers.map(u => (
                  <BlockedUserRow
                    key={u.id}
                    user={u}
                    onUnblock={unblockUser}
                    onWarn={warnUser}
                    onBlock={blockUser}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action toast */}
      {actionToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-aubergine text-white rounded-2xl shadow-2xl flex items-center gap-2.5">
          <svg className="w-4 h-4 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-ui font-semibold text-sm">{actionToast}</p>
        </div>
      )}
    </div>
  );
}
