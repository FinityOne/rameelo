"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import {
  GROUP_TIERS,
  discountForTarget,
  generateGroupId,
  createGroupOrder,
} from "@/lib/group-orders";


function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type EventSummary = {
  id: string;
  title: string;
  start_date: string;
  city: string;
  state: string;
  ticket_tiers: { id: string; name: string; price: number; quantity: number; quantity_sold: number; is_visible: boolean; sort_order: number; sale_start_date: string | null; sale_end_date: string | null; group_discount_mode: string | null }[];
  artists: { name: string; profile_image_url: string | null } | null;
};

function AvatarCircle({ name, imgUrl, size = 10 }: { name: string; imgUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs shrink-0`} style={{ backgroundColor: "#2E1B30" }}>
      {imgUrl ? <img src={imgUrl} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

function CreateGroupInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId") ?? "";

  const [event, setEvent]    = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  const [step, setStep]             = useState<1 | 2 | 3>(1);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [targetSize, setTargetSize] = useState(10);
  const [hostQty, setHostQty]       = useState(1);
  const [hostNotes, setHostNotes]   = useState("");
  const [groupId, setGroupId]       = useState("");
  const [copied, setCopied]         = useState(false);

  // Load event + check auth session
  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase
        .from("events")
        .select(`
          id, title, start_date, city, state,
          artists:artists!events_artist_id_fkey (name, profile_image_url),
          ticket_tiers (id, name, price, quantity, quantity_sold, is_visible, sort_order, sale_start_date, sale_end_date, group_discount_mode)
        `)
        .eq("id", eventId)
        .eq("status", "published")
        .single(),
      supabase.auth.getUser(),
    ]).then(([{ data: evData }, { data: { user } }]) => {
      if (evData) {
        const ev = evData as unknown as EventSummary;
        const now = new Date();
        ev.ticket_tiers = ev.ticket_tiers
          .filter(t => {
            if (!t.is_visible) return false;
            if (t.quantity_sold >= t.quantity) return false;
            if (t.sale_start_date && new Date(t.sale_start_date + "T00:00:00") > now) return false;
            if (t.sale_end_date && new Date(t.sale_end_date + "T23:59:59") < now) return false;
            return true;
          })
          .sort((a, b) => a.sort_order - b.sort_order || a.price - b.price);
        setEvent(ev);
        if (ev.ticket_tiers.length > 0) setSelectedTierId(ev.ticket_tiers[0].id);
      }

      if (user) {
        setAuthedUserId(user.id);
        // Auto-populate from profile
        supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.first_name) setFirstName(profile.first_name);
            if (profile?.last_name)  setLastName(profile.last_name);
            if (profile?.email || user.email) setEmail(profile?.email || user.email || "");
            if (profile?.phone) setPhoneDigits(profile.phone.replace(/\D/g, "").slice(0, 10));
          });
      }

      setLoading(false);
    });
  }, [eventId]);

  const selectedTier = event?.ticket_tiers.find(t => t.id === selectedTierId) ?? null;
  const tierHasDiscount = !!selectedTier?.group_discount_mode;
  const discount = tierHasDiscount ? discountForTarget(targetSize) : 0;
  const unitPrice = selectedTier?.price ?? 0;
  const discountedPrice = tierHasDiscount ? Math.round(unitPrice * (1 - discount / 100)) : unitPrice;
  const totalSavings = (unitPrice - discountedPrice) * targetSize;
  const shareUrl = groupId ? `${typeof window !== "undefined" ? window.location.origin : "https://rameelo.com"}/group/${groupId}` : "";

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    const id = generateGroupId();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const { error } = await createGroupOrder({
      groupId: id,
      eventId,
      tierId: selectedTierId!,
      organizerName: `${firstName} ${lastName}`,
      organizerEmail: email,
      organizerPhone: phoneDigits,
      organizerUserId: authedUserId,
      targetSize,
      discountPct: discount,
      deadline: deadline.toISOString(),
      hostQty,
      hostNotes: hostNotes || undefined,
    });
    // Save email so host can edit their own member record
    localStorage.setItem(`rameelo_group_member_${id}`, email);

    setSaving(false);
    if (error) {
      setSaveError("Couldn't create your group. Try again.");
      return;
    }

    setGroupId(id);
    setStep(3);
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function goToMyTicket() {
    if (!event || !selectedTier) return;
    const payload = {
      eventId: event.id,
      tierId: selectedTier.id,
      tierName: selectedTier.name,
      eventTitle: event.title,
      eventDate: fmtDate(event.start_date),
      eventVenue: event.city,
      eventCity: event.city,
      eventState: event.state,
      artistName: event.artists?.name ?? null,
      qty: hostQty,
      unitPrice: discountedPrice,
      discount,
      discountAmount: unitPrice - discountedPrice,
      serviceFee: Math.round(discountedPrice * 0.049),
      grandTotal: discountedPrice + Math.round(discountedPrice * 0.049),
      groupId,
      groupEmail: email,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  const shareVia = (channel: string) => {
    const text = tierHasDiscount && discount > 0
      ? `Join my group for ${event?.title ?? "this event"} and save ${discount}% on tickets! 🎉`
      : `Join my group for ${event?.title ?? "this event"}! We're coordinating tickets together 🎉`;
    const url = shareUrl;
    if (channel === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`);
    else if (channel === "sms") window.open(`sms:?body=${encodeURIComponent(text + "\n" + url)}`);
    else copyLink();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  if (!event) {
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
          <Logo variant="red" height={24} />
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(s => (
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

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Event pill */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ivory-200 mb-6">
          {event.artists && <AvatarCircle name={event.artists.name} imgUrl={event.artists.profile_image_url} />}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-ink text-sm truncate">{event.title}</p>
            <p className="font-mono text-[10px] text-ink-muted">{fmtDate(event.start_date)} · {event.city}, {event.state}</p>
          </div>
          <Link href={`/events/${event.id}`} className="font-mono text-[10px] text-marigold-dark hover:text-marigold shrink-0">View →</Link>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <form onSubmit={e => { e.preventDefault(); setStep(2); }} className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Step 1 of 3 · Your info</p>
              <h1 className="font-display font-bold text-ink text-2xl mb-1">Start a Group Order</h1>
              <p className="font-ui text-ink-muted text-sm leading-relaxed">
                {tierHasDiscount
                  ? "You're the host — share your link with your crew. Everyone pays their own ticket and you all unlock the group discount together."
                  : "You're the host — share your link with your crew. Everyone buys their own ticket and you can all coordinate in one place."}
              </p>
            </div>

            {authedUserId && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-peacock/8 border border-peacock/20">
                <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-sm text-peacock font-semibold">Signed in — your info is pre-filled</p>
              </div>
            )}

            {tierHasDiscount && (
              <div className="rounded-2xl border border-aubergine/15 bg-aubergine/4 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold mb-3">How Group Discounts Work</p>
                <div className="space-y-2">
                  {GROUP_TIERS.slice().reverse().map(tier => (
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
                  Everyone pays their own ticket at the discounted rate — no one person foots the bill.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First name</label>
                <input type="text" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <input type="text" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Patel" className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email address *</label>
              <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
              <p className="font-mono text-[10px] text-ink-muted mt-1.5">Group members will see this is your order</p>
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
              <p className="font-mono text-[10px] text-ink-muted mt-1.5">So we can help you fill up your group — no spam</p>
            </div>

            <button
              type="submit"
              disabled={!firstName || !lastName || !email.includes("@") || phoneDigits.length < 10}
              className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${firstName && lastName && email.includes("@") && phoneDigits.length === 10 ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
            >
              Continue →
            </button>
          </form>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Step 2 of 3 · Your tickets</p>
              <h2 className="font-display font-bold text-ink text-2xl mb-1">Set up your group</h2>
              <p className="font-ui text-ink-muted text-sm">
                {tierHasDiscount
                  ? "Choose ticket type and how many people you're bringing."
                  : "Choose your ticket type and set a target group size."}
              </p>
            </div>

            {event.ticket_tiers.length > 0 && (
              <div>
                <label className={labelCls}>Ticket type</label>
                <div className="space-y-2">
                  {event.ticket_tiers.map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedTierId === tier.id ? "border-aubergine bg-aubergine/5" : "border-ivory-200 bg-white hover:border-aubergine/30"}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-display font-bold text-sm ${selectedTierId === tier.id ? "text-aubergine" : "text-ink"}`}>{tier.name}</p>
                        <p className="font-mono text-xs text-ink-muted">${tier.price} / person</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>How many tickets for you?</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setHostQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl text-ink hover:border-aubergine hover:text-aubergine transition-all">−</button>
                <span className="font-display font-bold text-3xl text-ink w-10 text-center">{hostQty}</span>
                <button type="button" onClick={() => setHostQty(q => Math.min(20, q + 1))}
                  className="w-11 h-11 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl text-ink hover:border-aubergine hover:text-aubergine transition-all">+</button>
              </div>
              <p className="font-ui text-xs text-ink-muted mt-1.5">Just your own tickets — group members set theirs when they join.</p>
            </div>

            <div>
              <label className={labelCls}>Notes for your group <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
              <textarea
                rows={2}
                value={hostNotes}
                onChange={e => setHostNotes(e.target.value)}
                placeholder="e.g. I'm bringing my parents too 🎉"
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className={labelCls}>How many people are you aiming to bring?</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setTargetSize(s => Math.max(2, s - 1))}
                  className="w-12 h-12 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl text-ink hover:border-aubergine hover:text-aubergine transition-all"
                >−</button>
                <span className="font-display font-bold text-4xl text-ink w-16 text-center" style={{ letterSpacing: "-0.03em" }}>
                  {targetSize}
                </span>
                <button
                  type="button"
                  onClick={() => setTargetSize(s => Math.min(100, s + 1))}
                  className="w-12 h-12 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl text-ink hover:border-aubergine hover:text-aubergine transition-all"
                >+</button>
              </div>
              <p className="font-ui text-xs text-ink-muted mt-3 leading-relaxed">
                This is just a target — your group can end up larger or smaller, and that&apos;s totally fine. It gives the event organizer a sense of demand
                {tierHasDiscount ? " and may unlock private discounts for bigger groups." : "."}
              </p>
            </div>

            {tierHasDiscount && discount > 0 && (
              <div className="rounded-xl bg-peacock/8 border border-peacock/20 p-4">
                <p className="font-display font-bold text-peacock text-base mb-1">
                  Your group saves ${totalSavings.toLocaleString()} total
                </p>
                <p className="font-ui text-xs text-ink-muted">
                  {targetSize} people × ${unitPrice} → ${discountedPrice} each ({discount}% off)
                </p>
              </div>
            )}

            {saveError && (
              <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                <p className="font-ui text-sm text-durga">{saveError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="w-12 h-14 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:border-aubergine/30 hover:text-aubergine transition-all">←</button>
              <button
                type="submit"
                disabled={saving || !selectedTierId}
                className={`flex-1 py-4 rounded-2xl font-display font-bold text-base transition-all ${!saving && selectedTierId ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
              >
                {saving ? "Creating…" : "Create My Group Link →"}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-peacock mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold mb-1">Group Created</p>
              <h2 className="font-display font-bold text-ink text-2xl mb-1">Your group link is ready!</h2>
              <p className="font-ui text-ink-muted text-sm">
                {tierHasDiscount && discount > 0
                  ? <>Share this with your crew. When {targetSize} people join, everyone pays <strong className="text-ink">${discountedPrice}</strong> per ticket ({discount}% off).</>
                  : <>Share this with your crew. When {targetSize} people join, everyone can buy their ticket at <strong className="text-ink">${unitPrice}</strong> together.</>
                }
              </p>
            </div>

            <div className="rounded-2xl bg-white border-2 border-aubergine/20 p-5">
              <p className={labelCls}>Your shareable link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-ivory rounded-xl px-3 py-2.5 border border-ivory-200 min-w-0">
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

            <div>
              <p className={labelCls}>Share via</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "WhatsApp", icon: "💬", channel: "whatsapp" },
                  { label: "iMessage", icon: "📱", channel: "sms" },
                  { label: "Copy Link", icon: "🔗", channel: "copy" },
                ].map(ch => (
                  <button key={ch.label} onClick={() => shareVia(ch.channel)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-ivory-200 hover:border-aubergine/30 transition-all">
                    <span className="text-2xl">{ch.icon}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-aubergine/5 border border-aubergine/15 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group Progress</p>
                <p className="font-mono text-[10px] text-ink-muted">1 / {targetSize} joined</p>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-marigold" style={{ width: `${(1 / targetSize) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {firstName[0]?.toUpperCase()}
                </div>
                <p className="font-ui text-sm text-ink-muted">
                  <strong className="text-ink">{firstName}</strong> (you) · Need {targetSize - 1} more
                  {tierHasDiscount && discount > 0 ? ` to unlock ${discount}% off` : " to complete the group"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={goToMyTicket} className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] shadow-sm transition-all">
                Secure My Ticket Now →
              </button>
              <Link href={`/group/${groupId}`} className="w-full py-3 rounded-2xl border border-aubergine/20 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all flex items-center justify-center">
                Preview group link
              </Link>
            </div>

            <p className="text-center font-mono text-[10px] text-ink-muted">
              Group link expires in 7 days
              {tierHasDiscount && discount > 0 && ` · Discount locks when ${targetSize} people join`}
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
