"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ReactionKey = "garba" | "fire" | "love" | "clap" | "sparkle";

type Reaction = {
  key: ReactionKey;
  emoji: string;
  label: string;
  count: number;
  reacted: boolean;
};

type Comment = {
  id: string;
  name: string;
  initials: string;
  color: string;
  text: string;
  time: string;
};

type Photo = {
  id: string;
  gradient: string;
  label: string;
  pattern: "circles" | "diamonds" | "waves" | "dots";
};

type Post = {
  id: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  badge?: "organizer" | "champion" | "verified";
  city: string;
  state: string;
  time: string;
  text: string;
  photos: Photo[];
  reactions: Reaction[];
  comments: Comment[];
  eventTag?: string;
  tags: string[];
  pinned?: boolean;
  hidden?: boolean;
};

type Story = {
  id: string;
  name: string;
  initials: string;
  color: string;
  gradient: string;
  label: string;
  city: string;
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const STORIES: Story[] = [
  { id: "s1", name: "Priya S.",    initials: "PS", color: "#E8547A", gradient: "linear-gradient(135deg,#F5A623,#E8891A)", label: "🎉 Houston Navratri Night 3", city: "Houston" },
  { id: "s2", name: "Karan M.",    initials: "KM", color: "#0E8C7A", gradient: "linear-gradient(135deg,#7C1F2C,#B03040)", label: "🪈 Garba Finals · ATL",         city: "Atlanta" },
  { id: "s3", name: "Nisha P.",    initials: "NP", color: "#6C4F9E", gradient: "linear-gradient(135deg,#0E8C7A,#065E52)", label: "✨ NYC Desi Night Recap",       city: "New York" },
  { id: "s4", name: "Raj V.",      initials: "RV", color: "#E8891A", gradient: "linear-gradient(135deg,#2E1B30,#4A2E52)", label: "🔥 Dallas Raas Championship",   city: "Dallas" },
  { id: "s5", name: "Meera T.",    initials: "MT", color: "#E8547A", gradient: "linear-gradient(135deg,#E8547A,#C73B5E)", label: "💃 Chicago Couples Garba",      city: "Chicago" },
  { id: "s6", name: "Arjun K.",    initials: "AK", color: "#2E1B30", gradient: "linear-gradient(135deg,#6366F1,#4F46E5)", label: "🎊 Bay Area Bhangra Night",     city: "San Jose" },
  { id: "s7", name: "Divya R.",    initials: "DR", color: "#0E8C7A", gradient: "linear-gradient(135deg,#F97316,#DC2626)", label: "🌟 Boston Garba Meetup",        city: "Boston" },
];

const mkReactions = (counts: number[], reacted?: ReactionKey): Reaction[] => [
  { key: "garba",   emoji: "🪈", label: "Garba",   count: counts[0], reacted: reacted === "garba"   },
  { key: "fire",    emoji: "🔥", label: "Fire",    count: counts[1], reacted: reacted === "fire"    },
  { key: "love",    emoji: "❤️", label: "Love",    count: counts[2], reacted: reacted === "love"    },
  { key: "clap",    emoji: "👏", label: "Clap",    count: counts[3], reacted: reacted === "clap"    },
  { key: "sparkle", emoji: "✨", label: "Wow",     count: counts[4], reacted: reacted === "sparkle" },
];

const MOCK_POSTS: Post[] = [
  {
    id: "p1", userId: "u1",
    name: "Priya Sharma", initials: "PS", color: "#E8547A", badge: "organizer",
    city: "Houston", state: "TX", time: "2h ago",
    eventTag: "Navratri Night 2026 – Night 3",
    text: "Night 3 was absolutely magical ✨ The energy on that floor was unlike anything we've seen — 800+ dancers moving as one. Thank you Houston for showing up and showing OUT every single year 🙏🪈 See you for Night 4 tomorrow, doors open at 7pm!",
    photos: [
      { id: "ph1", gradient: "linear-gradient(135deg,#F5A623 0%,#E8547A 50%,#2E1B30 100%)", label: "Stage view · Night 3", pattern: "circles" },
      { id: "ph2", gradient: "linear-gradient(135deg,#2E1B30 0%,#4A2E52 50%,#7C1F2C 100%)", label: "Crowd energy 🔥",        pattern: "diamonds" },
      { id: "ph3", gradient: "linear-gradient(135deg,#0E8C7A 0%,#065E52 100%)",              label: "Circle of dancers",    pattern: "waves" },
    ],
    reactions: mkReactions([142, 89, 203, 67, 44], "love"),
    tags: ["#HoustonNavratri", "#GarbaWithRameelo", "#Night3"],
    comments: [
      { id: "c1", name: "Karan Mehta",  initials: "KM", color: "#0E8C7A", text: "Best night of the season no question!! See you tomorrow 🪈", time: "1h ago" },
      { id: "c2", name: "Nisha Patel",  initials: "NP", color: "#6C4F9E", text: "I cried when they played Jalte Diye 😭❤️", time: "45m ago" },
      { id: "c3", name: "Raj Vora",     initials: "RV", color: "#E8891A", text: "Already got my outfit ready for Night 4 🎊", time: "22m ago" },
    ],
    pinned: true,
  },
  {
    id: "p2", userId: "u2",
    name: "Karan Mehta", initials: "KM", color: "#0E8C7A", badge: "champion",
    city: "Atlanta", state: "GA", time: "4h ago",
    eventTag: "Garba Raas Championship – Southeast",
    text: "WE WON 🏆🏆🏆 Atlanta Dandiya Dhol took first place in the couple's raas category at the Southeast Championship! Two years of practice, countless late nights, and it finally paid off. Couldn't have done it without my incredible partner @DivyaR and our coach @SunilBhai 🙏",
    photos: [
      { id: "ph4", gradient: "linear-gradient(135deg,#F5A623 0%,#a06b00 100%)", label: "Champions 🏆", pattern: "circles" },
      { id: "ph5", gradient: "linear-gradient(135deg,#7C1F2C 0%,#E8547A 70%,#F5A623 100%)", label: "Raas finale pose", pattern: "dots" },
    ],
    reactions: mkReactions([98, 134, 87, 211, 56]),
    tags: ["#RaasChampions", "#AtlantaGarba", "#SEChampionship"],
    comments: [
      { id: "c4", name: "Priya Sharma", initials: "PS", color: "#E8547A", text: "YESSSS!! Congratulations 🎊 Knew you two would take it!!", time: "3h ago" },
      { id: "c5", name: "Meera Trivedi", initials: "MT", color: "#6C4F9E", text: "That final spin in the video was insane 😍", time: "2h ago" },
    ],
  },
  {
    id: "p3", userId: "u3",
    name: "Nisha Patel", initials: "NP", color: "#6C4F9E",
    city: "New York", state: "NY", time: "6h ago",
    text: "Quick question for the NYC garba fam 🪈 Anyone know a good place to get traditional chaniya choli tailored in the city? Planning for the Desi Night next month and want something custom. Budget around $300–500. DM me if you have recommendations! 🙏",
    photos: [],
    reactions: mkReactions([12, 3, 8, 24, 2]),
    tags: ["#NYCGarba", "#ChaniyaCholi", "#FashionHelp"],
    comments: [
      { id: "c6", name: "Arjun Kumar", initials: "AK", color: "#2E1B30", text: "Shalimar Boutique in Jackson Heights!! Ask for Lata aunty, she's the best 🙌", time: "5h ago" },
      { id: "c7", name: "Divya Rathi",  initials: "DR", color: "#0E8C7A", text: "Also check @GarbaWear on IG, they ship custom made in 3 weeks", time: "4h ago" },
      { id: "c8", name: "Priya Sharma", initials: "PS", color: "#E8547A", text: "Sent you a DM! I know someone in Queens 🥰", time: "3h ago" },
    ],
  },
  {
    id: "p4", userId: "u4",
    name: "Raj Vora", initials: "RV", color: "#E8891A", badge: "organizer",
    city: "Dallas", state: "TX", time: "8h ago",
    eventTag: "Desi Night – Houston Takeover",
    text: "🎟️ LAST CALL — only 40 tickets left for Houston Takeover this Saturday! We're bringing the entire Dallas crew down and we're ready to take over the floor 😂🔥 Come ready to dance, the DJ lineup is insane this year. Link in bio!",
    photos: [
      { id: "ph6", gradient: "linear-gradient(135deg,#2E1B30 0%,#7C1F2C 40%,#F5A623 100%)", label: "Houston Takeover flyer 🎟️", pattern: "diamonds" },
    ],
    reactions: mkReactions([77, 55, 23, 41, 19]),
    tags: ["#DallasGarba", "#HoustonTakeover", "#LastCall"],
    comments: [
      { id: "c9",  name: "Karan Mehta",  initials: "KM", color: "#0E8C7A", text: "Atlanta might pull up too 👀", time: "6h ago" },
      { id: "c10", name: "Nisha Patel",  initials: "NP", color: "#6C4F9E", text: "Just grabbed 4 tickets!! Road trip incoming 🚗", time: "5h ago" },
    ],
  },
  {
    id: "p5", userId: "u5",
    name: "Meera Trivedi", initials: "MT", color: "#6C4F9E",
    city: "Chicago", state: "IL", time: "Yesterday",
    text: "Couples Garba Night Chicago was a dream 💫 My husband said 'I'm not a dancer' in January. Look at him now 😂❤️ This community has genuinely changed our weekends. We've made friends from all over the US through Rameelo events and I could not be more grateful. See everyone at the Bhangra night next week!",
    photos: [
      { id: "ph7", gradient: "linear-gradient(135deg,#E8547A 0%,#C73B5E 50%,#2E1B30 100%)", label: "Couples Garba Night ❤️", pattern: "waves" },
      { id: "ph8", gradient: "linear-gradient(135deg,#6366F1 0%,#4F46E5 50%,#2E1B30 100%)", label: "Everyone on the floor!",  pattern: "circles" },
    ],
    reactions: mkReactions([64, 29, 178, 52, 33], "love"),
    tags: ["#ChicagoGarba", "#CouplesGarba", "#GarbaFamily"],
    comments: [
      { id: "c11", name: "Divya Rathi",   initials: "DR", color: "#0E8C7A", text: "This made my day 😭 Community is everything!", time: "18h ago" },
      { id: "c12", name: "Arjun Kumar",   initials: "AK", color: "#2E1B30", text: "Your husband's footwork in the video was CLEAN tho 😂🪈", time: "14h ago" },
    ],
  },
  {
    id: "p6", userId: "u6",
    name: "Arjun Kumar", initials: "AK", color: "#2E1B30",
    city: "San Jose", state: "CA", time: "2d ago",
    text: "Bay Area Bhangra Night in the books! 🎊 Shoutout to every single person who came out — we packed the venue 3× over what we expected. The energy when Mundian To Bach Ke dropped… I'll never forget it. Bay is officially on the Rameelo map. 🫶",
    photos: [
      { id: "ph9",  gradient: "linear-gradient(135deg,#F97316 0%,#DC2626 50%,#7C1F2C 100%)", label: "Bay Area goes off 🎊",     pattern: "circles" },
      { id: "ph10", gradient: "linear-gradient(135deg,#6366F1 0%,#2E1B30 100%)",              label: "Crowd at capacity 🙌",    pattern: "diamonds" },
      { id: "ph11", gradient: "linear-gradient(135deg,#F5A623 0%,#E8891A 50%,#E8547A 100%)", label: "DJ set midnight 🎧",       pattern: "dots" },
    ],
    reactions: mkReactions([109, 88, 71, 95, 62]),
    tags: ["#BayAreaGarba", "#BhanghaBlast", "#RameeloWest"],
    comments: [],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(t: string) { return t; }

const BADGE_META = {
  organizer: { label: "Organizer", cls: "bg-peacock/15 text-peacock" },
  champion:  { label: "Champion",  cls: "bg-marigold/20 text-[#a06b00]" },
  verified:  { label: "Verified",  cls: "bg-aubergine/15 text-aubergine" },
};

const PATTERNS: Record<Photo["pattern"], string> = {
  circles:  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.07) 20%, transparent 21%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.05) 30%, transparent 31%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 15%, transparent 16%)",
  diamonds: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)",
  waves:    "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 20px)",
  dots:     "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
};

// ── Components ─────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;
  const count = photos.length;

  const PhotoCell = ({ photo, className }: { photo: Photo; className?: string }) => (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ background: photo.gradient }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: PATTERNS[photo.pattern], backgroundSize: photo.pattern === "dots" ? "16px 16px" : "auto" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-ui text-white text-xs font-medium drop-shadow">{photo.label}</p>
      </div>
    </div>
  );

  if (count === 1) return (
    <PhotoCell photo={photos[0]} className="h-64 sm:h-80 w-full" />
  );
  if (count === 2) return (
    <div className="grid grid-cols-2 gap-1.5">
      <PhotoCell photo={photos[0]} className="h-56" />
      <PhotoCell photo={photos[1]} className="h-56" />
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <PhotoCell photo={photos[0]} className="row-span-2 h-56" />
      <PhotoCell photo={photos[1]} className="h-[107px]" />
      <div className="relative">
        <PhotoCell photo={photos[2]} className="h-[107px]" />
        {count > 3 && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <p className="font-display font-bold text-white text-xl" style={{ letterSpacing: "-0.02em" }}>+{count - 3}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReactionBar({ reactions, onReact }: { reactions: Reaction[]; onReact: (key: ReactionKey) => void }) {
  const totalReactions = reactions.reduce((s, r) => s + r.count, 0);
  const topReactions = reactions.filter(r => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Summary pill */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-1 text-ink-muted">
          <div className="flex -space-x-0.5">
            {topReactions.map(r => <span key={r.key} className="text-sm">{r.emoji}</span>)}
          </div>
          <span className="font-mono text-[10px]">{totalReactions.toLocaleString()}</span>
        </div>
      )}
      <div className="flex-1" />
      {/* React buttons */}
      <div className="flex items-center gap-1">
        {reactions.map(r => (
          <button
            key={r.key}
            onClick={() => onReact(r.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all ${
              r.reacted
                ? "bg-marigold/15 text-[#a06b00] font-bold scale-105"
                : "bg-ivory hover:bg-ivory-200 text-ink-muted hover:text-ink"
            }`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            {r.count > 0 && <span className="font-mono text-[10px]">{r.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommentSection({ comments, postId, onAddComment }: {
  comments: Comment[];
  postId: string;
  onAddComment: (postId: string, text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-ui text-xs text-ink-muted hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "Comment"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar initials={c.initials} color={c.color} size="sm" />
              <div className="flex-1 bg-ivory rounded-xl px-3 py-2.5 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-ui font-semibold text-ink text-xs">{c.name}</p>
                  <p className="font-mono text-[9px] text-ink-muted">{c.time}</p>
                </div>
                <p className="font-ui text-sm text-ink leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}

          {/* New comment input */}
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-ivory rounded-xl px-3 py-2 border border-ivory-200 focus-within:border-aubergine/30 focus-within:ring-2 focus-within:ring-aubergine/10 transition-all">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent font-ui text-sm text-ink placeholder-ink-muted/40 outline-none"
                onKeyDown={e => {
                  if (e.key === "Enter" && text.trim()) {
                    onAddComment(postId, text.trim());
                    setText("");
                  }
                }}
              />
              {text.trim() && (
                <button
                  onClick={() => { onAddComment(postId, text.trim()); setText(""); }}
                  className="w-6 h-6 rounded-full bg-aubergine flex items-center justify-center shrink-0"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onReact, onAddComment }: {
  post: Post;
  onReact: (postId: string, key: ReactionKey) => void;
  onAddComment: (postId: string, text: string) => void;
}) {
  const badge = post.badge ? BADGE_META[post.badge] : null;

  return (
    <article className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${post.pinned ? "border-marigold/40" : "border-ivory-200"}`}>
      {post.pinned && (
        <div className="px-4 py-2 bg-marigold/8 border-b border-marigold/20 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#a06b00]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          <p className="font-mono text-[10px] text-[#a06b00] font-bold uppercase tracking-widest">Pinned · Organizer Update</p>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar initials={post.initials} color={post.color} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-ui font-bold text-ink text-sm">{post.name}</p>
              {badge && (
                <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="w-3 h-3 text-ink-muted/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="font-mono text-[10px] text-ink-muted">{post.city}, {post.state}</p>
              <span className="text-ink-muted/30">·</span>
              <p className="font-mono text-[10px] text-ink-muted">{post.time}</p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-muted/40 hover:text-ink-muted hover:bg-ivory transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </button>
        </div>

        {/* Event tag */}
        {post.eventTag && (
          <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-aubergine/6 rounded-xl w-fit">
            <svg className="w-3 h-3 text-aubergine/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-ui text-xs text-aubergine font-medium truncate max-w-[280px]">{post.eventTag}</p>
          </div>
        )}

        {/* Text */}
        <p className="font-ui text-ink text-sm leading-relaxed mb-3">{post.text}</p>

        {/* Photos */}
        {post.photos.length > 0 && (
          <div className="mb-3">
            <PhotoGrid photos={post.photos} />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.map(tag => (
              <span key={tag} className="font-mono text-[10px] text-peacock hover:text-peacock/70 cursor-pointer transition-colors">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-ivory-200 my-3" />

        {/* Actions */}
        <div className="space-y-3">
          <ReactionBar
            reactions={post.reactions}
            onReact={key => onReact(post.id, key)}
          />
          <div className="border-t border-ivory-200 pt-3">
            <CommentSection
              comments={post.comments}
              postId={post.id}
              onAddComment={onAddComment}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function CreatePost({ onPost }: { onPost: (text: string) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <div
            className={`rounded-2xl border transition-all px-4 py-3 ${focused ? "border-aubergine/30 ring-2 ring-aubergine/10" : "border-ivory-200 bg-ivory cursor-pointer"}`}
            onClick={() => { setFocused(true); textareaRef.current?.focus(); }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => !text && setFocused(false)}
              placeholder="Share a garba moment, photo, or question with the community 🪈"
              rows={focused ? 3 : 1}
              className="w-full bg-transparent font-ui text-sm text-ink placeholder-ink-muted/50 outline-none resize-none leading-relaxed"
            />
          </div>

          {focused && (
            <div className="flex items-center gap-2 mt-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory border border-ivory-200 hover:border-aubergine/20 text-ink-muted hover:text-ink transition-all text-xs font-ui font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory border border-ivory-200 hover:border-aubergine/20 text-ink-muted hover:text-ink transition-all text-xs font-ui font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tag Event
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ivory border border-ivory-200 hover:border-aubergine/20 text-ink-muted hover:text-ink transition-all text-xs font-ui font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Location
              </button>
              <div className="flex-1" />
              <button
                disabled={!text.trim()}
                onClick={() => { onPost(text.trim()); setText(""); setFocused(false); }}
                className="px-4 py-1.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoriesRow({ stories }: { stories: Story[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Recent Moments</p>
        <button className="font-mono text-[10px] text-peacock hover:text-peacock/70 transition-colors">See all</button>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {/* Add story */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
          <div className="w-14 h-14 rounded-2xl bg-ivory border-2 border-dashed border-ivory-200 group-hover:border-marigold/40 transition-colors flex items-center justify-center">
            <svg className="w-5 h-5 text-ink-muted/40 group-hover:text-marigold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="font-mono text-[9px] text-ink-muted w-14 text-center leading-tight">Add moment</p>
        </div>

        {stories.map(story => (
          <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden relative ring-2 ring-offset-2 ring-marigold/60 group-hover:ring-marigold transition-all"
              style={{ background: story.gradient }}
            >
              <div className="absolute inset-0 flex items-end p-1.5">
                <p className="font-ui text-white text-[8px] leading-tight font-semibold drop-shadow line-clamp-2">{story.label}</p>
              </div>
            </div>
            <p className="font-mono text-[9px] text-ink-muted w-14 text-center leading-tight truncate">{story.city}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HotCities() {
  const cities = [
    { name: "Houston, TX",   events: 4, heat: 98, color: "#E8547A" },
    { name: "Atlanta, GA",   events: 3, heat: 84, color: "#F5A623" },
    { name: "Dallas, TX",    events: 2, heat: 71, color: "#0E8C7A" },
    { name: "New York, NY",  events: 3, heat: 67, color: "#6366F1" },
    { name: "Chicago, IL",   events: 2, heat: 58, color: "#E8547A" },
    { name: "San Jose, CA",  events: 1, heat: 44, color: "#F97316" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🗺️</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Hot Cities</p>
      </div>
      <div className="space-y-2.5">
        {cities.map((c, i) => (
          <div key={c.name} className="flex items-center gap-2.5 group cursor-pointer">
            <p className="font-mono text-[10px] text-ink-muted/40 w-3 text-right shrink-0">{i + 1}</p>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-ui text-xs font-semibold text-ink group-hover:text-aubergine transition-colors truncate">{c.name}</p>
                <p className="font-mono text-[9px] text-ink-muted shrink-0 ml-2">{c.events} events</p>
              </div>
              <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.heat}%`, backgroundColor: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingTags() {
  const tags = [
    { tag: "#HoustonNavratri", posts: 284 },
    { tag: "#GarbaWithRameelo", posts: 176 },
    { tag: "#RaasChampions", posts: 143 },
    { tag: "#GarbaLife", posts: 112 },
    { tag: "#NavratriVibes", posts: 98 },
    { tag: "#DesiNight", posts: 87 },
    { tag: "#ChaniyaCholi", posts: 61 },
    { tag: "#BhanghaBlast", posts: 54 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔥</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Trending</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <button
            key={t.tag}
            className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-ivory hover:bg-peacock/10 border border-ivory-200 hover:border-peacock/20 transition-all"
          >
            <span className="font-mono text-[10px] text-peacock group-hover:text-peacock font-medium">{t.tag}</span>
            <span className="font-mono text-[9px] text-ink-muted/50">{t.posts}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectCard() {
  const suggestions = [
    { name: "Divya Rathi",   initials: "DR", color: "#0E8C7A", city: "Boston, MA",   mutual: 4 },
    { name: "Sunil Bhatt",   initials: "SB", color: "#2E1B30", city: "Dallas, TX",   mutual: 7 },
    { name: "Kavya Menon",   initials: "KM", color: "#E8547A", city: "Chicago, IL",  mutual: 2 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🪈</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Connect with Dancers</p>
      </div>
      <div className="space-y-3">
        {suggestions.map(s => (
          <div key={s.name} className="flex items-center gap-2.5">
            <Avatar initials={s.initials} color={s.color} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-ui text-xs font-semibold text-ink truncate">{s.name}</p>
              <p className="font-mono text-[9px] text-ink-muted">{s.city} · {s.mutual} mutual</p>
            </div>
            <button className="px-2.5 py-1 rounded-lg border border-aubergine/30 text-aubergine font-ui font-semibold text-[10px] hover:bg-aubergine hover:text-white transition-all shrink-0">
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingEventsSidebar() {
  const events = [
    { name: "Navratri Night 4",   city: "Houston, TX",  date: "May 17", seats: 47 },
    { name: "Bhangra Blast",      city: "Houston, TX",  date: "May 22", seats: 120 },
    { name: "Desi Night – Dallas", city: "Dallas, TX",  date: "May 24", seats: 38 },
    { name: "Garba Chicago",      city: "Chicago, IL",  date: "May 29", seats: 200 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-ivory-200 flex items-center gap-2">
        <span className="text-base">📅</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Upcoming Events</p>
      </div>
      <div className="divide-y divide-ivory-200">
        {events.map(ev => (
          <div key={ev.name} className="px-4 py-3 hover:bg-ivory transition-colors cursor-pointer group">
            <p className="font-ui text-xs font-semibold text-ink group-hover:text-aubergine transition-colors truncate">{ev.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-mono text-[9px] text-ink-muted">{ev.city}</p>
              <span className="text-ink-muted/30">·</span>
              <p className="font-mono text-[9px] text-ink-muted">{ev.date}</p>
              <span className="text-ink-muted/30">·</span>
              <p className="font-mono text-[9px] text-peacock">{ev.seats} left</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-ivory-200">
        <button className="w-full text-center font-ui text-xs font-semibold text-aubergine hover:text-aubergine/70 transition-colors">
          Browse all events →
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [filter, setFilter] = useState<"all" | "nearby" | "events">("all");
  const [newPostToast, setNewPostToast] = useState(false);

  function handleReact(postId: string, key: ReactionKey) {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactions: p.reactions.map(r => {
          if (r.key !== key) return r;
          return { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted };
        }),
      };
    }));
  }

  function handleAddComment(postId: string, text: string) {
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      name: "You",
      initials: "YO",
      color: "#F5A623",
      text,
      time: "Just now",
    };
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
    ));
  }

  function handleNewPost(text: string) {
    const newPost: Post = {
      id: `p_${Date.now()}`,
      userId: "me",
      name: "You",
      initials: "YO",
      color: "#F5A623",
      city: "Your City", state: "XX",
      time: "Just now",
      text,
      photos: [],
      reactions: mkReactions([0, 0, 0, 0, 0]),
      tags: [],
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
    setNewPostToast(true);
    setTimeout(() => setNewPostToast(false), 3000);
  }

  const visiblePosts = posts.filter(p => !p.hidden);
  const pinnedPosts  = visiblePosts.filter(p => p.pinned);
  const regularPosts = visiblePosts.filter(p => !p.pinned);

  const FILTERS = [
    { key: "all",    label: "All Posts" },
    { key: "nearby", label: "Nearby" },
    { key: "events", label: "Event Tagged" },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #4A1830 40%, #2E1B30 100%)" }}>
        {/* Decorative circles — garba mandala feel */}
        <div className="absolute inset-0 overflow-hidden">
          {[120, 200, 280, 360].map((size, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/5"
              style={{
                width: size, height: size,
                top: "50%", left: "50%",
                transform: `translate(-50%, -50%)`,
              }}
            />
          ))}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-marigold/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-durga/10 blur-3xl" />
        </div>

        <div className="relative px-6 py-8 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">🪈</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Rameelo Community</span>
              </div>
              <h1 className="font-display font-bold text-white" style={{ fontSize: 28, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                Garba moments,<br />
                <span style={{ color: "#F5A623" }}>shared together.</span>
              </h1>
              <p className="font-ui text-white/50 text-sm mt-2 max-w-xs leading-relaxed">
                Photos, stories, and vibes from garba events across the USA. Connect with dancers in your city and beyond.
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              {[
                { v: "2.4K", l: "dancers" },
                { v: "38",   l: "cities" },
                { v: "120+", l: "posts today" },
              ].map(s => (
                <div key={s.l} className="text-right">
                  <p className="font-display font-bold text-white" style={{ fontSize: 20, letterSpacing: "-0.03em", color: "#F5A623" }}>{s.v}</p>
                  <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stories */}
      <StoriesRow stories={STORIES} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-ivory-200 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl font-ui font-semibold text-sm transition-all ${filter === f.key ? "bg-aubergine text-white shadow-sm" : "text-ink-muted hover:text-ink"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Feed column */}
        <div className="space-y-4 min-w-0">
          <CreatePost onPost={handleNewPost} />

          {pinnedPosts.map(p => (
            <PostCard key={p.id} post={p} onReact={handleReact} onAddComment={handleAddComment} />
          ))}

          {regularPosts.map(p => (
            <PostCard key={p.id} post={p} onReact={handleReact} onAddComment={handleAddComment} />
          ))}

          <div className="text-center py-6">
            <p className="font-mono text-[10px] text-ink-muted/50 uppercase tracking-widest">You&apos;re all caught up 🎉</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <UpcomingEventsSidebar />
          <HotCities />
          <ConnectCard />
          <TrendingTags />
        </div>
      </div>

      {/* Toast */}
      {newPostToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-aubergine text-white rounded-2xl shadow-2xl flex items-center gap-2.5 animate-pulse">
          <svg className="w-4 h-4 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-ui font-semibold text-sm">Posted to the community!</p>
        </div>
      )}
    </div>
  );
}
