"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { garbaEvents, artists } from "@/lib/events-data";
import {
  GROUP_TIERS,
  discountForTarget,
  generateGroupId,
  saveGroup,
  type GroupOrder,
} from "@/lib/group-orders";

const TARGET_OPTIONS = [
  { value: 5,  label: "5 people",  sub: "10% off unlocked" },
  { value: 8,  label: "8 people",  sub: "12% off unlocked" },
  { value: 10, label: "10 people", sub: "15% off — best deal" },
  { value: 15, label: "15+ people", sub: "15% off — max savings" },
];

function CreateGroupInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId") ?? "";

  const event = garbaEvents.find((e) => e.id === eventId);
  const artist = event ? artists.find((a) => a.slug === event.artistSlug) : null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [ticketType, setTicketType] = useState<"ga" | "vip">("ga");
  const [targetSize, setTargetSize] = useState(10);
  const [groupId, setGroupId] = useState("");
  const [copied, setCopied] = useState(false);

  const discount = discountForTarget(targetSize);
  const unitPrice = event ? (ticketType === "vip" && event.priceVIP ? event.priceVIP : event.price) : 0;
  const discountedPrice = Math.round(unitPrice * (1 - discount / 100));
  const totalSavings = (unitPrice - discountedPrice) * targetSize;
  const shareUrl = groupId ? `rameelo.com/group/${groupId}` : "";

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    const id = generateGroupId();
    setGroupId(id);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const group: GroupOrder = {
      groupId: id,
      eventId,
      organizerFirstName: firstName,
      organizerLastName: lastName,
      organizerPhone: phone,
      ticketType,
      targetSize,
      discountPct: discount,
      members: [
        {
          name: firstName,
          initial: firstName[0]?.toUpperCase() ?? "?",
          joinedAt: new Date().toISOString(),
          paid: false,
        },
      ],
      createdAt: new Date().toISOString(),
      deadline: deadline.toISOString(),
    };
    saveGroup(group);
    setStep(3);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/group/${groupId}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function goToMyTicket() {
    if (!event) return;
    const payload = {
      type: ticketType,
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

  const inputCls =
    "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  if (!event || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink mb-2">Event not found</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">← Browse events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-ivory-200">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
              <span className="font-display font-bold text-aubergine text-sm">R</span>
            </div>
            <span className="font-display font-bold text-aubergine">Rameelo</span>
          </Link>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                {s > 1 && <div className="w-5 h-px bg-ivory-200" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > s ? "bg-peacock text-white" : step === s ? "bg-aubergine text-white" : "bg-ivory-200 text-ink-muted"}`}>
                  {step > s ? "✓" : s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Event pill */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ivory-200 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: artist.color }}>
            {artist.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink text-sm truncate">{event.title}</p>
            <p className="font-mono text-[10px] text-ink-muted">{event.date} · {event.city}, {event.state}</p>
          </div>
          <Link href={`/events/${event.id}`} className="font-mono text-[10px] text-marigold-dark hover:text-marigold shrink-0">
            View →
          </Link>
        </div>

        {/* ── STEP 1: Organizer info ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Step 1 of 3 · Your info</p>
              <h1 className="font-display font-bold text-ink text-2xl mb-1">Start a Group Order</h1>
              <p className="font-ui text-ink-muted text-sm leading-relaxed">
                You&rsquo;re the organizer — you&rsquo;ll get a link to share with your crew. Everyone pays their own ticket and you all unlock the group discount together.
              </p>
            </div>

            {/* Group discount education */}
            <div className="rounded-2xl border border-aubergine/15 bg-aubergine/4 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold mb-3">How Group Discounts Work</p>
              <div className="space-y-2">
                {GROUP_TIERS.slice().reverse().map((tier) => (
                  <div key={tier.min} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-aubergine/10 flex items-center justify-center">
                        <span className="font-mono text-[10px] font-bold text-aubergine">{tier.min}+</span>
                      </div>
                      <span className="font-ui text-sm text-ink">{tier.label}</span>
                    </div>
                    <span className="font-display font-bold text-aubergine">{tier.discount}% off</span>
                  </div>
                ))}
              </div>
              <p className="font-ui text-xs text-ink-muted mt-3 pt-3 border-t border-aubergine/10">
                Everyone in your group pays their own ticket at the discounted rate — no one person foots the bill.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name</label>
                <input type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Patel" className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Phone number</label>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="4085551234"
                className={inputCls}
                required
              />
              <p className="font-mono text-[10px] text-ink-muted mt-1.5">So we can help you fill up your group — no spam</p>
            </div>

            <button
              type="submit"
              disabled={!firstName || !lastName || phone.length < 10}
              className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${firstName && lastName && phone.length >= 10 ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
            >
              Continue →
            </button>
          </form>
        )}

        {/* ── STEP 2: Ticket type + group size ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Step 2 of 3 · Your tickets</p>
              <h2 className="font-display font-bold text-ink text-2xl mb-1">Set up your group</h2>
              <p className="font-ui text-ink-muted text-sm">Choose ticket type and how many people you&rsquo;re planning to bring.</p>
            </div>

            {/* Ticket type */}
            <div>
              <label className={labelCls}>Ticket type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "ga" as const, label: "General Admission", price: event.price },
                  { key: "vip" as const, label: "VIP", price: event.priceVIP, disabled: !event.priceVIP },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    disabled={t.disabled}
                    onClick={() => !t.disabled && setTicketType(t.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${t.disabled ? "opacity-40 cursor-not-allowed border-ivory-200 bg-ivory" : ticketType === t.key ? "border-aubergine bg-aubergine/5" : "border-ivory-200 bg-white hover:border-aubergine/30"}`}
                  >
                    <p className={`font-display font-bold text-sm ${ticketType === t.key ? "text-aubergine" : "text-ink"}`}>{t.label}</p>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">${t.price ?? "N/A"} / person</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Group size target */}
            <div>
              <label className={labelCls}>How many people are you bringing?</label>
              <div className="space-y-2">
                {TARGET_OPTIONS.map((opt) => {
                  const disc = discountForTarget(opt.value);
                  const discPrice = Math.round(unitPrice * (1 - disc / 100));
                  const selected = targetSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetSize(opt.value)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selected ? "border-marigold bg-marigold/5" : "border-ivory-200 bg-white hover:border-marigold/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-marigold" : "border-ivory-200"}`}>
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-marigold" />}
                        </div>
                        <div className="text-left">
                          <p className={`font-display font-bold text-sm ${selected ? "text-ink" : "text-ink"}`}>{opt.label}</p>
                          <p className={`font-mono text-[10px] ${selected ? "text-marigold-dark" : "text-ink-muted"}`}>{opt.sub}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display font-bold text-sm ${selected ? "text-peacock" : "text-ink-muted"}`}>${discPrice}</p>
                        {disc > 0 && (
                          <p className="font-mono text-[10px] text-ink-muted line-through">${unitPrice}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Savings summary */}
            {discount > 0 && (
              <div className="rounded-xl bg-peacock/8 border border-peacock/20 p-4">
                <p className="font-display font-bold text-peacock text-base mb-1">
                  Your group saves ${totalSavings.toLocaleString()} total
                </p>
                <p className="font-ui text-xs text-ink-muted">
                  {targetSize} people × ${unitPrice} → ${discountedPrice} each ({discount}% off). Everyone pays their own ticket at this rate.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-12 h-14 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:border-aubergine/30 hover:text-aubergine transition-all"
              >
                ←
              </button>
              <button
                type="submit"
                className="flex-1 py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all"
              >
                Create My Group Link →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Share ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-peacock mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Group Created</p>
              <h2 className="font-display font-bold text-ink text-2xl mb-1">Your group link is ready!</h2>
              <p className="font-ui text-ink-muted text-sm">
                Share this with your crew. When {targetSize} people join, everyone pays <strong className="text-ink">${discountedPrice}</strong> per ticket ({discount}% off).
              </p>
            </div>

            {/* Link card */}
            <div className="rounded-2xl bg-white border-2 border-aubergine/20 p-5">
              <p className={labelCls}>Your shareable link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-ivory rounded-xl px-3 py-2.5 border border-ivory-200">
                  <p className="font-mono text-sm text-ink truncate">{shareUrl}</p>
                </div>
                <button
                  onClick={copyLink}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${copied ? "bg-peacock text-white" : "bg-aubergine text-white hover:bg-aubergine-light"}`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Share options */}
            <div>
              <p className={labelCls}>Share via</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "WhatsApp", icon: "💬", color: "#25D366" },
                  { label: "iMessage", icon: "📱", color: "#0A84FF" },
                  { label: "Instagram", icon: "📸", color: "#E1306C" },
                ].map((ch) => (
                  <button
                    key={ch.label}
                    onClick={copyLink}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-ivory-200 hover:border-aubergine/30 transition-all"
                  >
                    <span className="text-2xl">{ch.icon}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group progress preview */}
            <div className="rounded-2xl bg-aubergine/5 border border-aubergine/15 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group Progress</p>
                <p className="font-mono text-[10px] text-ink-muted">1 / {targetSize} joined</p>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-marigold" style={{ width: `${(1 / targetSize) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white text-xs font-bold">
                  {firstName[0]?.toUpperCase()}
                </div>
                <p className="font-ui text-sm text-ink-muted">
                  <strong className="text-ink">{firstName}</strong> (you) · Need {targetSize - 1} more to unlock {discount}% off
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <button
                onClick={goToMyTicket}
                className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all"
              >
                Secure My Ticket Now →
              </button>
              <Link
                href={`/group/${groupId}`}
                className="w-full py-3 rounded-2xl border border-aubergine/20 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all flex items-center justify-center"
              >
                Preview group link
              </Link>
            </div>

            <p className="text-center font-mono text-[10px] text-ink-muted">
              Group link expires in 7 days · Discount locks when {targetSize} people join
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateGroupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    }>
      <CreateGroupInner />
    </Suspense>
  );
}
