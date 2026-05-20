"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { loadGroupOrder, joinGroupOrder, type GroupOrder } from "@/lib/group-orders";
import { GRADIENTS } from "@/app/organizer/events/create/types";

function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

function MemberAvatar({ name, index, size = 9 }: { name: string; index: number; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length], fontSize: size * 1.4 + "px" }}
    >
      {initials}
    </div>
  );
}

export default function GroupLandingPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "join">("view");

  // Auth state
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  // Join form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      loadGroupOrder(groupId),
      supabase.auth.getUser(),
    ]).then(([groupData, { data: { user } }]) => {
      setGroup(groupData);
      setLoading(false);

      if (user) {
        setAuthedUserId(user.id);
        setAuthedEmail(user.email ?? null);
        // Auto-populate join form
        supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.first_name) setFirstName(profile.first_name);
            if (profile?.last_name)  setLastName(profile.last_name);
            if (profile?.email || user.email) setJoinEmail(profile?.email || user.email || "");
            if (profile?.phone) setPhoneDigits(profile.phone.replace(/\D/g, "").slice(0, 10));
          });
      }
    });
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  if (!group || !group.event || !group.tier) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink mb-2">Group not found</p>
          <p className="font-ui text-ink-muted text-sm mb-4">This link may have expired or been removed.</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">Browse events →</Link>
        </div>
      </div>
    );
  }

  const ev = group.event;
  const tier = group.tier;
  const joined = group.members.length;
  const target = group.targetSize;
  const discount = group.discountPct;
  const pct = Math.min((joined / target) * 100, 100);
  const remaining = Math.max(target - joined, 0);
  const unlocked = joined >= target;
  const unitPrice = tier.price;
  const discountedPrice = Math.round(unitPrice * (1 - discount / 100));
  const isExpired = group.status === "expired" || new Date(group.deadline) < new Date();

  const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError("");

    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await joinGroupOrder({
      groupId,
      userId: authedUserId,
      name: fullName,
      email: joinEmail,
      phone: phoneDigits,
    });

    if (error) {
      setJoining(false);
      setJoinError("Couldn't join the group. Please try again.");
      return;
    }

    // Build checkout payload
    const payload = {
      eventId: ev.id,
      tierId: tier.id,
      tierName: tier.name,
      eventTitle: ev.title,
      eventDate: fmtDate(ev.start_date),
      eventVenue: ev.venue_name,
      eventCity: ev.city,
      eventState: ev.state,
      artistName: ev.artists?.name ?? null,
      qty: 1,
      unitPrice: discountedPrice,
      discount,
      discountAmount: unitPrice - discountedPrice,
      serviceFee: Math.round(discountedPrice * 0.049),
      grandTotal: discountedPrice + Math.round(discountedPrice * 0.049),
      groupId,
      groupEmail: joinEmail,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Header */}
      <div className="bg-white border-b border-ivory-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Logo variant="red" height={22} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Group Order · {groupId}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Organizer invite context */}
        <div className="text-center pt-2">
          <div className="flex -space-x-2 justify-center mb-3">
            {group.members.slice(0, 5).map((m, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], zIndex: 5 - i }}
              >
                {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            ))}
            {joined > 5 && (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-ivory-200 flex items-center justify-center text-ink-muted text-[10px] font-bold" style={{ zIndex: 0 }}>
                +{joined - 5}
              </div>
            )}
          </div>
          <p className="font-ui text-sm text-ink-muted">
            <strong className="text-ink">{group.organizerName}</strong> invited you to a group order
          </p>
          {isExpired && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-durga/10 border border-durga/20">
              <span className="font-mono text-[10px] font-bold text-durga uppercase tracking-wide">Expired</span>
            </div>
          )}
        </div>

        {/* Event card */}
        <div className="rounded-2xl overflow-hidden bg-white border border-ivory-200">
          <div
            className="h-32 relative flex flex-col justify-end px-5 py-4"
            style={{ background: ev.cover_image_url ? undefined : gradient.css }}
          >
            {ev.cover_image_url && (
              <img src={ev.cover_image_url} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                {ev.category}
              </span>
              <h2 className="font-display font-bold text-white text-lg leading-snug mt-1">{ev.title}</h2>
            </div>
            {ev.artists && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                <span className="text-white text-xs font-semibold">{ev.artists.name}</span>
              </div>
            )}
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-4 text-xs text-ink-muted border-t border-ivory-200">
            <span className="flex items-center gap-1.5 font-ui">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {fmtDate(ev.start_date)}
            </span>
            <span className="flex items-center gap-1.5 font-ui">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              {ev.venue_name}, {ev.city}
            </span>
            <span className="flex items-center gap-1.5 font-ui">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              {tier.name}
            </span>
          </div>
        </div>

        {/* Group progress */}
        <div className={`rounded-2xl p-5 ${unlocked ? "bg-peacock text-white" : "bg-white border border-ivory-200"}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-widest font-bold mb-0.5 ${unlocked ? "text-white/70" : "text-marigold"}`}>
                {unlocked ? "Discount Unlocked!" : "Group Discount Progress"}
              </p>
              <p className={`font-display font-bold text-xl ${unlocked ? "text-white" : "text-ink"}`}>
                {unlocked ? `${discount}% off for everyone` : `${remaining} more to unlock ${discount}% off`}
              </p>
            </div>
            <div className="text-center">
              <p className={`font-display font-bold text-2xl ${unlocked ? "text-white" : "text-aubergine"}`}>
                {joined}<span className={`text-sm font-medium ${unlocked ? "text-white/60" : "text-ink-muted"}`}>/{target}</span>
              </p>
              <p className={`font-mono text-[9px] uppercase tracking-wide ${unlocked ? "text-white/60" : "text-ink-muted"}`}>people</p>
            </div>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${unlocked ? "bg-white/20" : "bg-ivory-200"}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${unlocked ? "bg-white" : "bg-marigold"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`font-ui text-xs mt-2 ${unlocked ? "text-white/80" : "text-ink-muted"}`}>
            {unlocked
              ? <>Everyone pays <strong className="text-white">${discountedPrice}</strong> per ticket — {discount}% off</>
              : <>Each ticket: <span className="line-through">${unitPrice}</span> → <strong className="text-peacock">${discountedPrice}</strong> once {target} people join</>
            }
          </p>
        </div>

        {/* Who's In */}
        <div className="rounded-2xl bg-white border border-ivory-200 p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Who&rsquo;s In ({joined})</p>
          <div className="space-y-2.5">
            {group.members.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MemberAvatar name={m.name} index={i} />
                  <span className="font-ui text-sm text-ink">
                    {m.name}
                    {m.isOrganizer && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Organizer</span>
                    )}
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
                  {m.paid && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-ivory-200 flex items-center justify-center">
                  <span className="text-ink-muted text-xs">+</span>
                </div>
                <span className="font-ui text-sm text-ink-muted">Waiting for friend…</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA / Join Form */}
        {!isExpired && mode === "view" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("join")}
              className="w-full rounded-2xl border-2 border-marigold bg-marigold/5 p-5 text-left hover:bg-marigold/10 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-display font-bold text-ink text-base">Join & Pay My Ticket</p>
                    <span className="font-mono text-[9px] uppercase tracking-wide text-white bg-marigold px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  <p className="font-ui text-sm text-ink-muted">
                    You pay for your own ticket. Everyone else pays theirs. Simple.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-ink text-xl">${discountedPrice}</p>
                  {discount > 0 && <p className="font-mono text-[10px] text-ink-muted line-through">${unitPrice}</p>}
                </div>
              </div>
            </button>

            <p className="font-mono text-[10px] text-ink-muted text-center">
              Offer expires {new Date(group.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}

        {isExpired && (
          <div className="rounded-2xl bg-ivory border border-ivory-200 p-5 text-center">
            <p className="font-display font-bold text-ink text-lg mb-1">This group link has expired</p>
            <p className="font-ui text-ink-muted text-sm mb-4">Group orders expire after 7 days. Browse events to find another.</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
              Browse Events →
            </Link>
          </div>
        )}

        {/* Join form */}
        {mode === "join" && (
          <form onSubmit={handleJoin} className="rounded-2xl bg-white border border-ivory-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setMode("view")} className="w-7 h-7 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink text-sm">←</button>
              <h3 className="font-display font-bold text-ink text-lg">Secure your spot</h3>
            </div>

            {authedUserId && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-peacock/8 border border-peacock/20">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-xs text-peacock font-semibold">Signed in — info pre-filled below</p>
              </div>
            )}

            <div className="rounded-xl bg-ivory border border-ivory-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-ui text-sm font-semibold text-ink">1 × {tier.name}</p>
                <p className="font-mono text-[10px] text-ink-muted">{ev.title}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-ink">${discountedPrice}</p>
                {discount > 0 && <p className="font-mono text-[10px] text-peacock">{discount}% group rate</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name *</label>
                <input type="text" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Last name *</label>
                <input type="text" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" autoComplete="email" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
              <p className="font-mono text-[10px] text-ink-muted mt-1.5">Tickets sent here · no spam</p>
            </div>

            <div>
              <label className={labelCls}>Phone number *</label>
              <div className="flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-l-xl border border-r-0 border-ivory-200 bg-ivory shrink-0">
                  <span className="text-base leading-none">🇺🇸</span>
                  <span className="font-ui text-sm text-ink-muted font-medium">+1</span>
                </div>
                <input
                  type="tel"
                  autoComplete="tel-national"
                  value={formatPhone(phoneDigits)}
                  onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="(555) 867-5309"
                  maxLength={14}
                  className="flex-1 rounded-r-xl rounded-l-none border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
                  required
                />
              </div>
            </div>

            {joinError && (
              <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                <p className="font-ui text-sm text-durga">{joinError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={joining || !firstName || !lastName || !joinEmail.includes("@") || phoneDigits.length < 10}
              className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${!joining && firstName && lastName && joinEmail.includes("@") && phoneDigits.length === 10 ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
            >
              {joining ? "Joining…" : "Continue to Payment →"}
            </button>
            <p className="font-mono text-[10px] text-ink-muted text-center">Secure checkout · Instant e-ticket</p>
          </form>
        )}
      </div>
    </div>
  );
}
