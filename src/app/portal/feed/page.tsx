"use client";

import { useState } from "react";
import Link from "next/link";
import { FEED_ITEMS, STORIES, type FeedItem } from "@/lib/feed-data";

const PHOTO_GRADIENTS = [
  "from-[#7C1F2C] to-[#2E1B30]",
  "from-[#0E8C7A] to-[#2E1B30]",
  "from-[#D4891B] to-[#7C1F2C]",
  "from-[#5a1e7a] to-[#2E1B30]",
  "from-[#892240] to-[#3D2543]",
];

function PhotoGrid({ count, gradient, eventId }: { count: number; gradient: string; eventId?: string }) {
  const patterns = ["🎶", "🥁", "💃", "🪔", "✨", "🎊", "🌙", "💛"];
  const grid = Math.min(count, 4);
  const sizes = grid === 1 ? ["col-span-2 row-span-2"] : grid === 2 ? ["col-span-1 row-span-2", "col-span-1 row-span-2"] : grid === 3 ? ["col-span-1 row-span-2", "col-span-1", "col-span-1"] : ["col-span-1", "col-span-1", "col-span-1", "col-span-1"];
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden h-48 mt-3">
      {Array.from({ length: grid }).map((_, i) => (
        <div key={i} className={`bg-gradient-to-br ${gradient} flex items-center justify-center relative ${sizes[i]}`}>
          <span className="text-3xl opacity-40">{patterns[(i * 3) % patterns.length]}</span>
          {i === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="font-display font-bold text-white text-xl">+{count - 3}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeedCard({ item, onLike }: { item: FeedItem; onLike: (id: string) => void }) {
  const timeColor = "text-ink-muted";

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden hover:border-marigold/20 transition-all">
      <div className="px-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 relative" style={{ backgroundColor: item.userColor }}>
            {item.userInitials}
            {item.type === "checkin" && (
              <span className="absolute -bottom-0.5 -right-0.5 text-xs">📍</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-ui font-bold text-ink text-sm">{item.user}</span>
              {item.type === "photo" && <span className="font-ui text-ink-muted text-sm">shared {item.photoCount} photos</span>}
              {item.type === "purchase" && <span className="font-ui text-ink-muted text-sm">just got {item.qty} ticket{(item.qty??0)>1?"s":""} to</span>}
              {item.type === "join" && <span className="font-ui text-ink-muted text-sm">just joined Rameelo 🎉</span>}
              {item.type === "group" && <span className="font-ui text-ink-muted text-sm">started a group order for {item.groupSize} to</span>}
              {item.type === "checkin" && <span className="font-ui text-ink-muted text-sm">checked in at</span>}
              {item.type === "milestone" && <span className="font-ui text-ink-muted text-sm">· Community update</span>}
            </div>
            {item.event && (
              <Link href={`/portal/events/${item.eventId}`} className="font-ui text-xs text-marigold-dark hover:text-marigold transition-colors font-semibold block truncate">
                {item.event}
              </Link>
            )}
            <p className={`font-mono text-[10px] ${timeColor} mt-0.5`}>{item.city} · {item.time}</p>
          </div>
          <button className="font-mono text-[10px] text-ink-muted hover:text-ink transition-colors px-2 py-1 rounded-lg hover:bg-ivory">
            ···
          </button>
        </div>

        {/* Milestone special card */}
        {item.type === "milestone" && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #7C1F2C 100%)" }}>
            <div className="px-5 py-4 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-display font-bold text-white text-lg">50,000 tickets sold this season!</p>
              <p className="font-ui text-white/60 text-sm mt-1">The Garba community showed up. Thank you for making Navratri 2026 unforgettable.</p>
            </div>
          </div>
        )}

        {/* Join special */}
        {item.type === "join" && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-peacock/8 border border-peacock/15">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: item.userColor }}>
              {item.userInitials}
            </div>
            <div>
              <p className="font-ui text-sm text-ink font-semibold">{item.user} is now on Rameelo</p>
              <p className="font-ui text-xs text-ink-muted">from {item.city} · Welcome to the community!</p>
            </div>
            <button className="ml-auto px-3 py-1.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-all shrink-0">
              Follow
            </button>
          </div>
        )}

        {/* Group order card */}
        {item.type === "group" && item.event && (
          <div className="mt-3 p-3 rounded-xl border border-aubergine/15 bg-aubergine/4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-ui text-xs font-semibold text-ink">{item.groupSize}-person group · discount unlocking</p>
                <p className="font-ui text-xs text-ink-muted truncate max-w-[200px]">{item.event}</p>
              </div>
              <div className="flex -space-x-1.5">
                {Array.from({length: Math.min(item.groupSize??3,4)}).map((_,i)=>(
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold" style={{backgroundColor:["#7C1F2C","#0E8C7A","#D4891B","#5a1e7a"][i%4]}}>
                    {["P","R","M","K"][i]}
                  </div>
                ))}
                {(item.groupSize??0) > 4 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-ivory-200 flex items-center justify-center text-ink-muted text-[9px] font-bold">+{(item.groupSize??0)-4}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Purchase card */}
        {item.type === "purchase" && item.event && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-ivory border border-ivory-200">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{backgroundColor: item.artistColor ?? "#2E1B30"}}>
              🎟️
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-xs font-semibold text-ink truncate">{item.event}</p>
              <p className="font-mono text-[10px] text-ink-muted">{item.qty} ticket{(item.qty??0)>1?"s":""} secured</p>
            </div>
            <Link href={`/portal/events/${item.eventId}`} className="font-mono text-[10px] text-marigold-dark hover:text-marigold shrink-0">
              View →
            </Link>
          </div>
        )}

        {/* Check-in */}
        {item.type === "checkin" && item.event && (
          <div className="mt-3 p-3 rounded-xl" style={{background:"linear-gradient(135deg,#2E1B30,#3D2543)"}}>
            <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-1">Live Check-In</p>
            <p className="font-display font-bold text-white text-sm">{item.event}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse"/>
              <p className="font-ui text-xs text-white/60">Garba in progress right now</p>
            </div>
          </div>
        )}

        {/* Photo grid */}
        {item.type === "photo" && item.photoCount && (
          <PhotoGrid
            count={item.photoCount}
            gradient={PHOTO_GRADIENTS[parseInt(item.id.replace(/\D/g,""))%PHOTO_GRADIENTS.length]}
            eventId={item.eventId}
          />
        )}

        {/* Caption */}
        {item.caption && (
          <p className="font-ui text-sm text-ink mt-3 leading-relaxed">{item.caption}</p>
        )}
      </div>

      {/* Engagement bar */}
      <div className="px-4 py-2.5 border-t border-ivory-200 flex items-center gap-4">
        <button
          onClick={() => onLike(item.id)}
          className={`flex items-center gap-1.5 font-ui text-sm transition-all hover:scale-110 active:scale-95 ${item.liked ? "text-durga" : "text-ink-muted hover:text-durga"}`}
        >
          <svg className="w-4 h-4" fill={item.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="font-mono text-[11px]">{item.likes + (item.liked ? 1 : 0)}</span>
        </button>
        <button className="flex items-center gap-1.5 font-ui text-sm text-ink-muted hover:text-ink transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-mono text-[11px]">{item.comments}</span>
        </button>
        <button className="flex items-center gap-1.5 font-ui text-sm text-ink-muted hover:text-ink transition-colors ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="font-mono text-[11px]">Share</span>
        </button>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [items, setItems] = useState(FEED_ITEMS);
  const [tab, setTab] = useState<"all" | "photos" | "events" | "community">("all");

  function handleLike(id: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, liked: !item.liked } : item));
  }

  const filtered = items.filter((item) => {
    if (tab === "photos") return item.type === "photo";
    if (tab === "events") return item.type === "purchase" || item.type === "checkin" || item.type === "group";
    if (tab === "community") return item.type === "join" || item.type === "milestone";
    return true;
  });

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">Community Feed</h1>
          <p className="font-ui text-ink-muted text-sm">What&rsquo;s happening in Garba nation 🇺🇸</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-sm hover:bg-marigold-dark transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Post
        </button>
      </div>

      {/* Stories row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {STORIES.map((story, i) => (
          <button key={i} className="flex flex-col items-center gap-1.5 shrink-0 group">
            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base border-2 ${story.isLive ? "border-durga" : "border-marigold/40"} group-hover:scale-105 transition-transform`} style={{backgroundColor: story.color}}>
              {story.isLive ? story.initials : story.initials}
              {story.isLive && (
                <span className="absolute -top-1 -right-1 bg-durga text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">
                  Live
                </span>
              )}
            </div>
            <p className="font-mono text-[9px] text-ink-muted uppercase tracking-wide text-center w-14 truncate">{story.name}</p>
          </button>
        ))}
      </div>

      {/* Live activity ticker */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/10">
        <div className="w-1.5 h-1.5 bg-durga rounded-full animate-pulse shrink-0" />
        <p className="font-ui text-xs text-ink-muted overflow-hidden whitespace-nowrap">
          <span className="font-semibold text-ink">3 people</span> just bought tickets to Edison Navratri in the last 10 minutes
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {(["all","photos","events","community"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? "bg-aubergine text-white" : "bg-white border border-ivory-200 text-ink-muted hover:text-ink"}`}
          >
            {t === "all" ? "All Activity" : t === "photos" ? "📸 Photos" : t === "events" ? "🎟️ Events" : "👥 Community"}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <FeedCard key={item.id} item={item} onLike={handleLike} />
        ))}
      </div>

      {/* Post your photos CTA */}
      <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-6 text-center">
        <p className="text-2xl mb-2">📸</p>
        <p className="font-display font-bold text-ink text-base mb-1">Share your Garba moments</p>
        <p className="font-ui text-ink-muted text-sm mb-4">Post photos from your events and connect with the community.</p>
        <button className="px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
          Upload Photos
        </button>
      </div>
    </div>
  );
}
