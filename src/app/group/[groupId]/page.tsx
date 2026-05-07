"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { garbaEvents, artists } from "@/lib/events-data";
import { loadGroup, addMemberToGroup, type GroupOrder } from "@/lib/group-orders";

const SEED_MEMBERS = [
  { name: "Rohan", initial: "R" },
  { name: "Meera", initial: "M" },
  { name: "Kavya", initial: "K" },
  { name: "Arjun", initial: "A" },
  { name: "Divya", initial: "D" },
];

export default function GroupLandingPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [mode, setMode] = useState<"view" | "join" | "payall">("view");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [payAllName, setPayAllName] = useState("");
  const [payAllEmail, setPayAllEmail] = useState("");

  useEffect(() => {
    const g = loadGroup(groupId);
    if (g) {
      setGroup(g);
    } else {
      // Seed a demo group from the first featured event
      const demoEvent = garbaEvents.find((e) => e.featured) ?? garbaEvents[0];
      const demo: GroupOrder = {
        groupId,
        eventId: demoEvent.id,
        organizerFirstName: "Priya",
        organizerLastName: "Patel",
        organizerPhone: "4085551234",
        ticketType: "ga",
        targetSize: 10,
        discountPct: 15,
        members: [
          { name: "Priya", initial: "P", joinedAt: new Date(Date.now() - 3600000 * 3).toISOString(), paid: false },
          { name: "Rohan", initial: "R", joinedAt: new Date(Date.now() - 3600000 * 2).toISOString(), paid: true },
          { name: "Meera", initial: "M", joinedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(), paid: true },
          { name: "Kavya", initial: "K", joinedAt: new Date(Date.now() - 3600000).toISOString(), paid: false },
        ],
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      };
      setGroup(demo);
    }
  }, [groupId]);

  const event = group ? garbaEvents.find((e) => e.id === group.eventId) : null;
  const artist = event ? artists.find((a) => a.slug === event.artistSlug) : null;

  if (!group || !event || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink mb-2">Group not found</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">Browse events</Link>
        </div>
      </div>
    );
  }

  const joined = group.members.length;
  const target = group.targetSize;
  const discount = group.discountPct;
  const pct = Math.min((joined / target) * 100, 100);
  const remaining = Math.max(target - joined, 0);
  const unlocked = joined >= target;
  const unitPrice = group.ticketType === "vip" && event.priceVIP ? event.priceVIP : event.price;
  const discountedPrice = Math.round(unitPrice * (1 - discount / 100));
  const payAllTotal = Math.round(discountedPrice * target * 1.049);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !event) return;
    const updated = addMemberToGroup(groupId, {
      name: firstName,
      initial: firstName[0]?.toUpperCase() ?? "?",
      joinedAt: new Date().toISOString(),
      paid: false,
    });
    if (updated) setGroup(updated);

    const payload = {
      type: group.ticketType,
      event1Id: event.id,
      qty: 1,
      unitPrice: discountedPrice,
      discount,
      grandTotal: discountedPrice + Math.round(discountedPrice * 0.049),
      groupId,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  function handlePayAll(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !event) return;
    const payload = {
      type: "group-all",
      event1Id: event.id,
      qty: target,
      unitPrice: discountedPrice,
      discount,
      grandTotal: payAllTotal,
      groupId,
      payerName: payAllName,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  const inputCls =
    "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Minimal header */}
      <div className="bg-white border-b border-ivory-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
              <span className="font-display font-bold text-aubergine text-xs">R</span>
            </div>
            <span className="font-display font-bold text-aubergine text-sm">Rameelo</span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Group Order · {groupId}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Invite context */}
        <div className="text-center pt-2">
          <div className="flex -space-x-2 justify-center mb-3">
            {group.members.slice(0, 5).map((m, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a"][i % 5], zIndex: 5 - i }}
              >
                {m.initial}
              </div>
            ))}
            {joined > 5 && (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-ivory-200 flex items-center justify-center text-ink-muted text-[10px] font-bold" style={{ zIndex: 0 }}>
                +{joined - 5}
              </div>
            )}
          </div>
          <p className="font-ui text-sm text-ink-muted">
            <strong className="text-ink">{group.organizerFirstName} {group.organizerLastName}</strong> invited you to a group order
          </p>
        </div>

        {/* Event card */}
        <div className="rounded-2xl overflow-hidden bg-white border border-ivory-200">
          <div
            className="h-28 relative flex items-end px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${artist.color}DD 0%, #2E1B30 100%)` }}
          >
            <div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                {event.category}
              </span>
              <h2 className="font-display font-bold text-white text-lg leading-snug mt-1">{event.title}</h2>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: artist.color }}>
                {artist.initials}
              </div>
              <span className="text-white text-xs font-medium">{artist.name}</span>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-4 text-xs text-ink-muted border-t border-ivory-200">
            <span className="flex items-center gap-1.5 font-ui">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {event.date} · {event.time}
            </span>
            <span className="flex items-center gap-1.5 font-ui">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              {event.venue}, {event.city}
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
            <div className={`text-center ${unlocked ? "" : ""}`}>
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
          {!unlocked && (
            <p className={`font-ui text-xs mt-2 ${unlocked ? "text-white/70" : "text-ink-muted"}`}>
              Each ticket: <span className="line-through">${unitPrice}</span> → <strong className="text-peacock">${discountedPrice}</strong> once {target} people join
            </p>
          )}
          {unlocked && (
            <p className="font-ui text-xs mt-2 text-white/80">
              Everyone pays <strong className="text-white">${discountedPrice}</strong> per ticket — {discount}% off the regular price
            </p>
          )}
        </div>

        {/* Who's in */}
        <div className="rounded-2xl bg-white border border-ivory-200 p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Who&rsquo;s In ({joined})</p>
          <div className="space-y-2.5">
            {group.members.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"][i % 7] }}
                  >
                    {m.initial}
                  </div>
                  <span className="font-ui text-sm text-ink">
                    {m.name}
                    {i === 0 && (
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
            {/* Empty slots */}
            {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-ivory-200 flex items-center justify-center">
                  <span className="text-ink-muted text-[10px]">+</span>
                </div>
                <span className="font-ui text-sm text-ink-muted">Waiting for friend…</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing options ── */}
        {mode === "view" && (
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted text-center">How do you want to join?</p>

            {/* Option A: Join & pay my own */}
            <button
              onClick={() => setMode("join")}
              className="w-full rounded-2xl border-2 border-marigold bg-marigold/5 p-5 text-left hover:bg-marigold/10 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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

            {/* Option B: Pay for everyone */}
            <button
              onClick={() => setMode("payall")}
              className="w-full rounded-2xl border border-ivory-200 bg-white p-5 text-left hover:border-aubergine/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-display font-bold text-ink text-base mb-1">Pay for the Whole Group</p>
                  <p className="font-ui text-sm text-ink-muted">
                    You cover everyone, they pay you back. Perfect if you&rsquo;re organizing.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-ink text-xl">${payAllTotal.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{target} tickets</p>
                </div>
              </div>
            </button>

            <p className="font-mono text-[10px] text-ink-muted text-center">
              Discount expires {new Date(group.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}

        {/* ── JOIN FORM ── */}
        {mode === "join" && (
          <form onSubmit={handleJoin} className="rounded-2xl bg-white border border-ivory-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setMode("view")} className="w-7 h-7 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink text-sm">←</button>
              <h3 className="font-display font-bold text-ink text-lg">Quick checkout</h3>
            </div>

            <div className="rounded-xl bg-ivory border border-ivory-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-ui text-sm font-semibold text-ink">1 × {group.ticketType.toUpperCase()} Ticket</p>
                <p className="font-mono text-[10px] text-ink-muted">{event.title}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-ink">${discountedPrice}</p>
                {discount > 0 && <p className="font-mono text-[10px] text-peacock">{discount}% group rate</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Your first name</label>
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Priya"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Email for tickets</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className={inputCls}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!firstName || !email.includes("@")}
              className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${firstName && email.includes("@") ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
            >
              Continue to Payment →
            </button>
            <p className="font-mono text-[10px] text-ink-muted text-center">Secure checkout · Instant e-ticket</p>
          </form>
        )}

        {/* ── PAY ALL FORM ── */}
        {mode === "payall" && (
          <form onSubmit={handlePayAll} className="rounded-2xl bg-white border border-ivory-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => setMode("view")} className="w-7 h-7 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink text-sm">←</button>
              <h3 className="font-display font-bold text-ink text-lg">Pay for everyone</h3>
            </div>

            <div className="rounded-xl bg-ivory border border-ivory-200 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-ui text-ink-muted">{target} tickets × ${discountedPrice}</span>
                <span className="font-ui text-ink">${(discountedPrice * target).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-ui text-peacock">Group discount ({discount}%)</span>
                <span className="font-ui text-peacock">included</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-ui text-ink-muted">Service fee</span>
                <span className="font-ui text-ink-muted">${Math.round(discountedPrice * target * 0.049).toLocaleString()}</span>
              </div>
              <div className="border-t border-ivory-200 pt-1.5 flex justify-between">
                <span className="font-display font-bold text-ink">Total</span>
                <span className="font-display font-bold text-ink text-lg">${payAllTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl bg-aubergine/5 border border-aubergine/10 p-3">
              <p className="font-ui text-xs text-ink-muted">
                You&rsquo;re covering <strong className="text-ink">{target} tickets</strong>. Share the group link so your friends can register — but you&rsquo;ve already got everyone&rsquo;s spot secured.
              </p>
            </div>

            <div>
              <label className={labelCls}>Your name</label>
              <input type="text" autoComplete="name" value={payAllName} onChange={(e) => setPayAllName(e.target.value)} placeholder="Priya Patel" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Email for receipts</label>
              <input type="email" autoComplete="email" value={payAllEmail} onChange={(e) => setPayAllEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
            </div>

            <button
              type="submit"
              disabled={!payAllName || !payAllEmail.includes("@")}
              className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${payAllName && payAllEmail.includes("@") ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
            >
              Pay ${payAllTotal.toLocaleString()} for Everyone →
            </button>
            <p className="font-mono text-[10px] text-ink-muted text-center">Secure checkout · Instant e-ticket for all</p>
          </form>
        )}
      </div>
    </div>
  );
}
