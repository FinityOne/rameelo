"use client";

import { useState } from "react";

// Prominent "Follow Artist" CTA. Visual follow state is local for now (no
// follow backend yet); the button still gives satisfying feedback and can be
// wired to persistence later. `accent` is the artist's genre color.
export default function FollowButton({ accent }: { accent: string }) {
  const [following, setFollowing] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFollowing(f => !f)}
      aria-pressed={following}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-display font-bold text-sm transition-all active:scale-[0.99] ${
        following
          ? "bg-white text-ink border-2 border-ivory-200 hover:border-durga/30"
          : "text-white shadow-lg hover:opacity-95"
      }`}
      style={following ? undefined : { backgroundColor: accent }}
    >
      <svg className="w-4 h-4 shrink-0" fill={following ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" style={following ? { color: "#7C1F2C" } : undefined}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {following ? "Following" : "Follow Artist"}
    </button>
  );
}

// Share the artist page — native share sheet where available, clipboard fallback.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-display font-bold text-sm text-white border border-white/25 bg-white/10 hover:bg-white/20 transition-all active:scale-[0.99]"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
