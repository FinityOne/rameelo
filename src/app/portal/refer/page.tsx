"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";

const LEADERBOARD = [
  { name: "Rohan S.", city: "Chicago, IL", count: 18, initials: "RS", color: "#0E8C7A" },
  { name: "Kavya N.", city: "Houston, TX", count: 14, initials: "KN", color: "#D4891B" },
  { name: "Priya P.", city: "Edison, NJ", count: 11, initials: "PP", color: "#7C1F2C" },
  { name: "Neil J.", city: "New York, NY", count: 9, initials: "NJ", color: "#5a1e7a" },
  { name: "Meera D.", city: "Atlanta, GA", count: 7, initials: "MD", color: "#892240" },
];

const REWARDS = [
  { threshold: 3, reward: "Rameelo Sticker Pack", emoji: "✨", desc: "Premium vinyl stickers shipped to your door" },
  { threshold: 5, reward: "Free Rameelo T-Shirt", emoji: "👕", desc: "Your size shipped before the next event — claim at venue", highlight: true },
  { threshold: 10, reward: "VIP Upgrade", emoji: "🌟", desc: "Free VIP ticket upgrade at any Rameelo event this season" },
  { threshold: 20, reward: "Season Pass", emoji: "🏆", desc: "Free general admission to 3 events of your choice" },
];

export default function ReferPage() {
  const [user, setUser] = useState<{ firstName: string; avatarInitials: string; avatarColor: string; id: string } | null>(null);
  const [referralCount] = useState(3);
  const [copied, setCopied] = useState(false);
  const [hoveredReward, setHoveredReward] = useState<number | null>(null);

  useEffect(() => {
    const u = getUser();
    if (u) setUser(u);
  }, []);

  const referralCode = user ? `RAMEELO-${user.avatarInitials}${user.id.slice(-4).toUpperCase()}` : "RAMEELO-XXXX";
  const shareUrl = `rameelo.com/join?ref=${referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(`https://${shareUrl}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const nextReward = REWARDS.find((r) => r.threshold > referralCount);
  const neededForNext = nextReward ? nextReward.threshold - referralCount : 0;
  const currentReward = REWARDS.filter((r) => r.threshold <= referralCount).pop();

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#2E1B30" }}>
        <div className="relative px-6 pt-6 pb-5">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 30%, #F5A623 0%, transparent 50%)" }} />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold mb-2">Referral Program</p>
            <h1 className="font-display font-bold text-white text-3xl mb-2">
              Refer friends,<br />earn <span className="text-marigold">free gear.</span>
            </h1>
            <p className="font-ui text-white/60 text-sm max-w-xs">
              Invite your garba crew to Rameelo. For every friend who creates an account and buys tickets, you earn rewards.
            </p>
          </div>
        </div>

        {/* Shirt reward highlight */}
        <div className="border-t border-white/8 px-6 py-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/25 flex flex-col items-center justify-center shrink-0">
            <span className="text-3xl">👕</span>
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold mb-0.5">Current Goal · 5 referrals</p>
            <p className="font-display font-bold text-white text-lg">Free Rameelo Shirt</p>
            <p className="font-ui text-white/50 text-sm">Shipped before your next event · your size</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display font-bold text-marigold text-3xl">{referralCount}</p>
            <p className="font-mono text-[10px] text-white/40">of 5 done</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-5">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-marigold rounded-full transition-all duration-700"
              style={{ width: `${Math.min((referralCount / 5) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="font-mono text-[10px] text-white/40">{referralCount} referred</p>
            {neededForNext > 0 && <p className="font-mono text-[10px] text-marigold">{neededForNext} more to unlock shirt</p>}
          </div>
        </div>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl bg-white border border-ivory-200 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">Your unique referral link</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-ivory rounded-xl px-4 py-3 border border-ivory-200">
            <p className="font-mono text-sm text-ink truncate">{shareUrl}</p>
          </div>
          <button
            onClick={copyLink}
            className={`shrink-0 px-4 py-3 rounded-xl font-ui font-semibold text-sm transition-all ${copied ? "bg-peacock text-white" : "bg-aubergine text-white hover:bg-aubergine-light"}`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <p className="font-mono text-[10px] text-ink-muted">Your code:</p>
          <span className="font-mono text-xs font-bold text-aubergine bg-aubergine/8 px-2.5 py-1 rounded-lg tracking-wider">{referralCode}</span>
        </div>
      </div>

      {/* Share options */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Share your link</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "WhatsApp", icon: "💬", color: "#25D366", msg: "Hey! Join me on Rameelo for the best Garba events this Navratri. Use my link to sign up 👇" },
            { label: "iMessage", icon: "📱", color: "#0A84FF", msg: "Just found this amazing app for Garba events! Join using my link:" },
            { label: "Instagram", icon: "📸", color: "#E1306C", msg: "Story template ready — copy your link first" },
            { label: "Email", icon: "📧", color: "#2E1B30", msg: "Send via email" },
          ].map((ch) => (
            <button
              key={ch.label}
              onClick={copyLink}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-ivory-200 hover:border-aubergine/30 hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-white border border-ivory-200 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-4">How it works</p>
        <div className="space-y-4">
          {[
            { step: "1", title: "Share your link", desc: "Send your unique referral link to friends, family, or your WhatsApp group chat." },
            { step: "2", title: "They sign up & buy tickets", desc: "When they create a Rameelo account and purchase tickets using your link, it counts." },
            { step: "3", title: "You earn rewards", desc: "Rewards unlock automatically. We ship the shirt before your next event." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-aubergine flex items-center justify-center text-white font-bold text-sm shrink-0">{s.step}</div>
              <div>
                <p className="font-display font-bold text-ink text-sm mb-0.5">{s.title}</p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards ladder */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Reward Tiers</p>
        <div className="space-y-2">
          {REWARDS.map((reward) => {
            const unlocked = referralCount >= reward.threshold;
            const isNext = reward.threshold === nextReward?.threshold;
            return (
              <div
                key={reward.threshold}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${unlocked ? "border-peacock/30 bg-peacock/5" : isNext ? "border-marigold/30 bg-marigold/5" : "border-ivory-200 bg-white"} ${reward.highlight && isNext ? "ring-2 ring-marigold/30" : ""}`}
              >
                <span className="text-2xl">{reward.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className={`font-display font-bold text-sm ${unlocked ? "text-peacock" : "text-ink"}`}>{reward.reward}</p>
                    {reward.highlight && <span className="font-mono text-[9px] uppercase tracking-wide text-white bg-marigold px-1.5 py-0.5 rounded-full">Most Popular</span>}
                  </div>
                  <p className="font-ui text-xs text-ink-muted">{reward.desc}</p>
                </div>
                <div className={`text-center shrink-0 px-3 py-1.5 rounded-xl ${unlocked ? "bg-peacock text-white" : isNext ? "bg-marigold/15 text-marigold-dark" : "bg-ivory text-ink-muted"}`}>
                  {unlocked ? (
                    <p className="font-mono text-[10px] font-bold uppercase">Earned ✓</p>
                  ) : (
                    <>
                      <p className="font-display font-bold text-lg leading-none">{reward.threshold}</p>
                      <p className="font-mono text-[9px]">friends</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl bg-white border border-ivory-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Top Referrers This Month</p>
          <span className="font-mono text-[9px] text-marigold-dark bg-marigold/10 px-2 py-0.5 rounded-full">October 2026</span>
        </div>
        <div className="space-y-2.5">
          {LEADERBOARD.map((person, i) => (
            <div key={person.name} className="flex items-center gap-3">
              <span className="font-display font-bold text-ink-muted w-5 text-sm shrink-0">{i+1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: person.color }}>
                {person.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-ui font-semibold text-ink text-sm">{person.name}</p>
                <p className="font-mono text-[10px] text-ink-muted">{person.city}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden w-16">
                  <div className="h-full bg-marigold rounded-full" style={{ width: `${(person.count / LEADERBOARD[0].count) * 100}%` }} />
                </div>
                <span className="font-display font-bold text-ink text-sm w-6 text-right">{person.count}</span>
              </div>
            </div>
          ))}
          {user && (
            <>
              <div className="border-t border-ivory-200 pt-2.5 flex items-center gap-3">
                <span className="font-display font-bold text-marigold-dark w-5 text-sm shrink-0">—</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: user.avatarColor }}>
                  {user.avatarInitials}
                </div>
                <div className="flex-1">
                  <p className="font-ui font-semibold text-ink text-sm">You</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 bg-ivory-200 rounded-full overflow-hidden w-16">
                    <div className="h-full bg-marigold rounded-full" style={{ width: `${(referralCount / LEADERBOARD[0].count) * 100}%` }} />
                  </div>
                  <span className="font-display font-bold text-ink text-sm w-6 text-right">{referralCount}</span>
                </div>
              </div>
            </>
          )}
        </div>
        <p className="font-ui text-xs text-ink-muted mt-3 pt-3 border-t border-ivory-200 text-center">
          Top referrer at end of season wins a <strong className="text-ink">pair of free VIP tickets</strong> to any 2026 event.
        </p>
      </div>

      <p className="text-center font-mono text-[10px] text-ink-muted">
        Rewards are non-transferable and subject to availability. Shirt ships within 5–7 business days of unlocking.
      </p>
    </div>
  );
}
