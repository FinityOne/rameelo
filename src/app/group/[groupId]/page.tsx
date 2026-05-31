"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { loadGroupOrder, joinGroupOrder, updateGroupMember, type GroupOrder } from "@/lib/group-orders";
import { GRADIENTS } from "@/app/organizer/events/create/types";


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
  // "view" = browse, "join" = join form open, "joined" = just joined (success state)
  const [mode, setMode] = useState<"view" | "join" | "joined">("view");

  // Available tiers for this event (loaded separately)
  type TierOption = { id: string; name: string; price: number; quantity: number; quantity_sold: number };
  const [eventTiers, setEventTiers] = useState<TierOption[]>([]);

  // Auth state
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);

  // Current member's email (set after joining, used for edit access)
  const [myEmail, setMyEmail] = useState<string | null>(null);

  // Join form
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [joinEmail, setJoinEmail]   = useState("");
  const [joinQty, setJoinQty]       = useState(1);
  const [joinTierId, setJoinTierId] = useState<string | null>(null);
  const [joinNotes, setJoinNotes]   = useState("");
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Inline edit for existing members
  const [editEmail, setEditEmail]   = useState<string | null>(null);
  const [editQty, setEditQty]       = useState(1);
  const [editNotes, setEditNotes]   = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      loadGroupOrder(groupId),
      supabase.auth.getUser(),
    ]).then(([groupData, { data: { user } }]) => {
      setGroup(groupData);
      setLoading(false);

      // Load available event tiers
      if (groupData?.eventId) {
        const now = new Date();
        supabase
          .from("ticket_tiers")
          .select("id, name, price, quantity, quantity_sold, is_visible, sale_start_date, sale_end_date, sort_order")
          .eq("event_id", groupData.eventId)
          .eq("is_visible", true)
          .order("sort_order")
          .then(({ data: tiers }) => {
            const available = (tiers ?? []).filter(t => {
              if (t.quantity_sold >= t.quantity) return false;
              if (t.sale_start_date && new Date(t.sale_start_date + "T00:00:00") > now) return false;
              if (t.sale_end_date   && new Date(t.sale_end_date   + "T23:59:59") < now) return false;
              return true;
            }) as TierOption[];
            setEventTiers(available);
            // Default to the group's tier, or first available
            const defaultTier = available.find(t => t.id === groupData.tierId) ?? available[0];
            if (defaultTier) setJoinTierId(defaultTier.id);
          });
      }

      // Restore my email from localStorage
      const stored = localStorage.getItem(`rameelo_group_member_${groupId}`);
      if (stored) setMyEmail(stored);

      if (user) {
        setAuthedUserId(user.id);
        const email = user.email ?? null;
        if (email && !stored) setMyEmail(email);
        supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.first_name) setFirstName(profile.first_name);
            if (profile?.last_name)  setLastName(profile.last_name);
            if (profile?.email || email) setJoinEmail(profile?.email || email || "");
            // Pre-fill qty/notes if already a member
            const me = groupData?.members.find(m => m.email === (profile?.email || email));
            if (me) { setJoinQty(me.qty); setJoinNotes(me.notes ?? ""); if (me.tierId) setJoinTierId(me.tierId); }
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
  const memberCount = group.members.length;           // number of distinct people
  const totalTickets = group.members.reduce((s, m) => s + m.qty, 0); // total tickets claimed
  const target = group.targetSize;
  const discount = group.discountPct;
  const pct = Math.min((totalTickets / target) * 100, 100);
  const remaining = Math.max(target - totalTickets, 0); // open spots (in tickets)
  const unitPrice = tier.price;
  const discountedPrice = Math.round(unitPrice * (1 - discount / 100));
  const isExpired = group.status === "expired" || new Date(group.deadline) < new Date();

  // The tier the current user has selected (or would select)
  const activeTier = eventTiers.find(t => t.id === joinTierId) ?? tier;
  const activeTierPrice = (activeTier as { price: number }).price;
  const activeDiscountedPrice = discount > 0 ? Math.round(activeTierPrice * (1 - discount / 100)) : activeTierPrice;

  // Payment model: if the tier has a min-qty group discount, all tickets must be
  // paid for together in one transaction (splitting would lose the discount).
  const isMinQtyDiscount =
    !!tier.group_discount_mode &&
    (tier.group_discount_mode === "scaling" ||
      (tier.group_discount_mode === "simple" && !!tier.group_discount_min_qty));

  // Total cost for paying for the whole group
  const groupPayTotal = discountedPrice * totalTickets;

  // My member record (if already joined)
  const myMember = myEmail ? group.members.find(m => m.email === myEmail) : null;

  const gradient = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/group/${groupId}`
    : `https://rameelo.com/group/${groupId}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  function shareVia(channel: string) {
    const text = discount > 0
      ? `${group!.organizerName} invited you to join their group for ${ev.title} — grab your ticket together! 🎉`
      : `${group!.organizerName} is putting a group together for ${ev.title}. Join and get your ticket! 🎉`;
    if (channel === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + shareUrl)}`);
    else if (channel === "sms") window.open(`sms:?body=${encodeURIComponent(text + "\n" + shareUrl)}`);
    else copyLink();
  }

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
      qty: joinQty,
      tierId: joinTierId ?? undefined,
      notes: joinNotes || undefined,
    });

    if (error) {
      setJoining(false);
      setJoinError("Couldn't join the group. Please try again.");
      return;
    }

    // Remember this member for edit access
    localStorage.setItem(`rameelo_group_member_${groupId}`, joinEmail);
    setMyEmail(joinEmail);

    // Refresh group data then show success state
    const refreshed = await loadGroupOrder(groupId);
    setGroup(refreshed);
    setJoining(false);
    setMode("joined");
  }

  function handleCheckout(checkoutEmail: string, checkoutQty: number, checkoutTierId: string) {
    const chosenTier = eventTiers.find(t => t.id === checkoutTierId) ?? group!.tier!;
    const chosenPrice = chosenTier.price;
    const discountedCheckoutPrice = discount > 0 ? Math.round(chosenPrice * (1 - discount / 100)) : chosenPrice;
    const payload = {
      eventId: ev.id,
      tierId: chosenTier.id,
      tierName: (chosenTier as { name: string }).name,
      eventTitle: ev.title,
      eventDate: fmtDate(ev.start_date),
      eventVenue: ev.venue_name,
      eventCity: ev.city,
      eventState: ev.state,
      artistName: ev.artists?.name ?? null,
      qty: checkoutQty,
      unitPrice: discountedCheckoutPrice,
      discount,
      discountAmount: chosenPrice - discountedCheckoutPrice,
      serviceFee: Math.round(discountedCheckoutPrice * 0.05),
      grandTotal: discountedCheckoutPrice + Math.round(discountedCheckoutPrice * 0.05),
      groupId,
      groupEmail: checkoutEmail,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  // Pay for everyone in a single transaction (required for min-qty discounts)
  function handleGroupCheckout(payerEmail: string) {
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
      qty: totalTickets,
      unitPrice: discountedPrice,
      discount,
      discountAmount: unitPrice - discountedPrice,
      serviceFee: Math.round(discountedPrice * 0.05),
      grandTotal: discountedPrice * totalTickets + Math.round(discountedPrice * totalTickets * 0.05),
      groupId,
      groupEmail: payerEmail,
      isGroupPay: true,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

  async function handleSaveEdit() {
    if (!editEmail) return;
    setSaving(true);
    await updateGroupMember({ groupId, email: editEmail, qty: editQty, notes: editNotes || undefined });
    // Refresh group data
    const refreshed = await loadGroupOrder(groupId);
    setGroup(refreshed);
    setEditEmail(null);
    setSaving(false);
  }

  function startEdit(member: GroupOrder["members"][0]) {
    setEditEmail(member.email);
    setEditQty(member.qty);
    setEditNotes(member.notes ?? "");
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

      <div className={`max-w-lg mx-auto px-4 py-6 space-y-4 ${!isExpired && mode === "view" ? "pb-28" : ""}`}>

        {/* Host invite context */}
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
            {memberCount > 5 && (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-ivory-200 flex items-center justify-center text-ink-muted text-[10px] font-bold" style={{ zIndex: 0 }}>
                +{memberCount - 5}
              </div>
            )}
          </div>
          <p className="font-ui text-sm text-ink-muted">
            <strong className="text-ink">{group.organizerName}</strong> is hosting a group for this event
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
          <div className="px-5 py-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted border-t border-ivory-200">
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
            <Link
              href={`/events/${ev.id}?groupId=${groupId}`}
              className="ml-auto flex items-center gap-1 font-ui text-xs font-semibold text-marigold-dark hover:text-marigold transition-colors shrink-0"
            >
              View event details
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>

        {/* Group progress */}
        <div className="rounded-2xl p-5 bg-white border border-ivory-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold mb-0.5 text-marigold">
                {discount > 0 ? "Group Discount" : "Group Progress"}
              </p>
              <p className="font-display font-bold text-xl text-ink">
                {totalTickets === 0 ? "Be the first to join!" : totalTickets === 1 ? "1 ticket claimed so far" : `${totalTickets} tickets claimed`}
                {remaining > 0 && <span className="text-ink-muted font-medium text-base"> · {remaining} spot{remaining !== 1 ? "s" : ""} left</span>}
              </p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-aubergine">
                {totalTickets}<span className="text-sm font-medium text-ink-muted">/{target}</span>
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">tickets</p>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-ivory-200">
            <div
              className="h-full rounded-full transition-all duration-500 bg-marigold"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-ui text-xs mt-2 text-ink-muted">
            {discount > 0
              ? <><strong className="text-peacock">{discount}% group discount</strong> — join and share the link to fill remaining spots.</>
              : <>Join and share the link — the more the merrier.</>
            }
          </p>
        </div>

        {/* Who's In */}
        <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Who&rsquo;s In · {memberCount} {memberCount === 1 ? "person" : "people"}
            </p>
            <p className="font-mono text-[10px] text-ink-muted">{totalTickets} of {target} tickets</p>
          </div>
          <div className="divide-y divide-ivory-200">
            {group.members.map((m, i) => {
              const isMe = myEmail === m.email;
              const isEditing = editEmail === m.email;
              return (
                <div key={i} className={`px-5 py-3 ${isMe ? "bg-aubergine/3" : ""}`}>
                  {isEditing ? (
                    <div className="space-y-3 py-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-ui text-sm font-semibold text-ink">{m.name}</span>
                        <button onClick={() => setEditEmail(null)} className="font-mono text-[10px] text-ink-muted hover:text-ink">Cancel</button>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">How many tickets?</p>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setEditQty(q => Math.max(1, q - 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all">−</button>
                          <span className="font-display font-bold text-2xl text-ink w-8 text-center">{editQty}</span>
                          <button type="button" onClick={() => setEditQty(q => Math.min(20, q + 1))}
                            className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-lg text-ink hover:border-aubergine hover:text-aubergine transition-all">+</button>
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">Notes for the group</p>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="e.g. bringing my parents and two kids 🎉"
                          className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all resize-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-all disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MemberAvatar name={m.name} index={i} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-ui text-sm font-semibold text-ink">{m.name}</span>
                            {m.isOrganizer && (
                              <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Host</span>
                            )}
                            {isMe && !m.paid && (
                              <span className="font-mono text-[9px] text-aubergine">You</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                            {m.qty} ticket{m.qty !== 1 ? "s" : ""}
                            {m.paid && <span className="ml-2 text-peacock">· Paid ✓</span>}
                          </p>
                          {m.notes && (
                            <p className="font-ui text-xs text-ink-muted/80 mt-1 italic">&ldquo;{m.notes}&rdquo;</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isMe && !m.paid && (
                          <button
                            onClick={() => startEdit(m)}
                            className="font-mono text-[9px] text-aubergine hover:text-aubergine-light underline underline-offset-2"
                          >
                            Edit
                          </button>
                        )}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
                          {m.paid && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Empty spots — each is a tappable join button */}
            {!isExpired && Array.from({ length: Math.min(remaining, 5) }).map((_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={() => setMode("join")}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-marigold/5 active:bg-marigold/10 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-marigold/40 flex items-center justify-center shrink-0 group-hover:border-marigold group-hover:bg-marigold/10 transition-all">
                  <span className="text-marigold-dark text-sm font-bold">+</span>
                </div>
                <span className="font-ui text-sm text-ink-muted group-hover:text-marigold-dark transition-colors">
                  {i === 0 && !myMember ? "Claim this spot — join the group" : "Open spot · tap to join"}
                </span>
              </button>
            ))}
            {!isExpired && remaining > 5 && (
              <button
                type="button"
                onClick={() => setMode("join")}
                className="w-full px-5 py-3 text-center font-mono text-[10px] text-ink-muted hover:text-marigold-dark transition-colors"
              >
                +{remaining - 5} more open spot{remaining - 5 !== 1 ? "s" : ""} — tap to join
              </button>
            )}
          </div>
        </div>

        {/* ── Expired ── */}
        {isExpired && (
          <div className="rounded-2xl bg-ivory border border-ivory-200 p-5 text-center">
            <p className="font-display font-bold text-ink text-lg mb-1">This group link has expired</p>
            <p className="font-ui text-ink-muted text-sm mb-4">Group orders expire after 7 days. Browse events to find another.</p>
            <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
              Browse Events →
            </Link>
          </div>
        )}

        {/* ── View mode — main CTA ── */}
        {!isExpired && mode === "view" && (
          <div className="space-y-3">

            {/* Min-qty discount: banner explaining one-payer model */}
            {isMinQtyDiscount && totalTickets > 0 && (
              <div className="rounded-2xl border border-aubergine/20 bg-aubergine/5 px-4 py-3 flex items-start gap-3">
                <svg className="w-4 h-4 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-ui text-sm text-aubergine/80 leading-relaxed">
                  This group uses a <strong className="text-aubergine">minimum-quantity discount</strong> — all {totalTickets} tickets must be purchased together in one transaction to unlock the {discount}% savings. One person pays for the whole group.
                </p>
              </div>
            )}

            {/* Not yet in group */}
            {!myMember && (
              <button
                onClick={() => setMode("join")}
                className="w-full rounded-2xl bg-marigold text-aubergine p-5 text-left hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-lg mb-0.5">Join this group →</p>
                    <p className="font-ui text-sm text-aubergine/70">
                      {isMinQtyDiscount
                        ? "Add your name and tickets — one person will pay for everyone."
                        : "Add your name, pick tickets, pay when ready."}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-2xl">${activeDiscountedPrice.toFixed(2)}</p>
                    {discount > 0 && <p className="font-mono text-[10px] text-aubergine/60 line-through">${activeTierPrice.toFixed(2)}</p>}
                    <p className="font-mono text-[10px] text-aubergine/60">per ticket</p>
                  </div>
                </div>
              </button>
            )}

            {/* Already in group, not paid */}
            {myMember && !myMember.paid && !isMinQtyDiscount && (
              <div className="rounded-2xl border-2 border-marigold bg-marigold/5 p-5 space-y-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-marigold font-bold mb-1">You&apos;re in the group!</p>
                  <p className="font-display font-bold text-ink text-base">Ready to secure your ticket?</p>
                  <p className="font-ui text-sm text-ink-muted mt-0.5">
                    {myMember.qty} ticket{myMember.qty !== 1 ? "s" : ""}
                    {discount > 0 && <span className="text-peacock ml-1">· {discount}% group rate</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleCheckout(myEmail!, myMember.qty, myMember.tierId ?? joinTierId ?? tier.id)}
                  className="w-full py-3.5 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-sm"
                >
                  Pay for my {myMember.qty} ticket{myMember.qty !== 1 ? "s" : ""} · ${(activeDiscountedPrice * myMember.qty).toFixed(2)} →
                </button>
                <button onClick={() => setMode("join")} className="w-full py-2 font-ui text-sm text-ink-muted hover:text-aubergine transition-colors">
                  Change tickets or notes
                </button>
              </div>
            )}

            {/* Min-qty discount: pay for everyone (shown to all members) */}
            {isMinQtyDiscount && totalTickets > 0 && (
              <div className="rounded-2xl border border-ivory-200 bg-white p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold mb-1">Group payment</p>
                    <p className="font-display font-bold text-ink text-base">Pay for all {totalTickets} tickets</p>
                    <p className="font-ui text-sm text-ink-muted mt-0.5">
                      {memberCount} {memberCount === 1 ? "person" : "people"} · {discount > 0 ? `${discount}% off applied` : "standard rate"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-peacock text-2xl">${groupPayTotal.toFixed(2)}</p>
                    {discount > 0 && (
                      <p className="font-mono text-[10px] text-ink-muted line-through">${(unitPrice * totalTickets).toFixed(2)}</p>
                    )}
                    <p className="font-mono text-[10px] text-ink-muted">total</p>
                  </div>
                </div>
                <button
                  onClick={() => handleGroupCheckout(myEmail ?? group.organizerEmail)}
                  className="w-full py-3.5 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm"
                >
                  I&apos;ll pay for the whole group →
                </button>
                {remaining > 0 && (
                  <p className="font-mono text-[10px] text-ink-muted text-center">
                    {remaining} spot{remaining !== 1 ? "s" : ""} still open — share the link so everyone joins first
                  </p>
                )}
              </div>
            )}

            {/* No discount: optional "pay for everyone" */}
            {!isMinQtyDiscount && totalTickets > 0 && (
              <button
                onClick={() => handleGroupCheckout(myEmail ?? group.organizerEmail)}
                className="w-full py-3 rounded-2xl border border-aubergine/25 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Or pay for everyone · ${groupPayTotal.toFixed(2)} total
              </button>
            )}

            {/* Share nudge */}
            <div className="rounded-2xl border border-ivory-200 bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
                Know someone who&apos;d love this? Spread the word
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "WhatsApp", icon: "💬", channel: "whatsapp" },
                  { label: "iMessage", icon: "📱", channel: "sms" },
                  { label: linkCopied ? "Copied!" : "Copy Link", icon: linkCopied ? "✓" : "🔗", channel: "copy" },
                ].map(ch => (
                  <button key={ch.label} onClick={() => shareVia(ch.channel)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95 ${
                      linkCopied && ch.channel === "copy" ? "border-peacock/30 bg-peacock/5 text-peacock" : "border-ivory-200 hover:border-aubergine/30 text-ink-muted hover:text-aubergine"
                    }`}>
                    <span className="text-xl leading-none">{ch.icon}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wide">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="font-mono text-[10px] text-ink-muted text-center">
              Link expires {new Date(group.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}

        {/* ── Join form ── */}
        {!isExpired && mode === "join" && (
          <form onSubmit={handleJoin} className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-ivory-200 flex items-center gap-3">
              <button type="button" onClick={() => setMode("view")}
                className="w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0">
                ←
              </button>
              <div>
                <h3 className="font-display font-bold text-ink text-lg leading-tight">Join the group</h3>
                <p className="font-ui text-xs text-ink-muted">No account needed — pay when you&apos;re ready</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {authedUserId && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-peacock/8 border border-peacock/20">
                  <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="font-ui text-xs text-peacock font-semibold">Signed in — your info is pre-filled</p>
                </div>
              )}

              {/* Name */}
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

              {/* Email */}
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" autoComplete="email" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
                <p className="font-mono text-[10px] text-ink-muted mt-1">Your ticket will be sent here</p>
              </div>

              {/* Ticket type — only show if multiple available */}
              {eventTiers.length > 1 && (
                <div>
                  <label className={labelCls}>Ticket type</label>
                  <div className="space-y-2">
                    {eventTiers.map(t => {
                      const tDiscounted = discount > 0 ? Math.round(t.price * (1 - discount / 100)) : t.price;
                      const sel = joinTierId === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => setJoinTierId(t.id)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${sel ? "border-aubergine bg-aubergine/5" : "border-ivory-200 bg-white hover:border-aubergine/30"}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-aubergine" : "border-ivory-200"}`}>
                              {sel && <div className="w-2 h-2 rounded-full bg-aubergine" />}
                            </div>
                            <span className={`font-ui font-semibold text-sm ${sel ? "text-aubergine" : "text-ink"}`}>{t.name}</span>
                          </div>
                          <div className="text-right">
                            <p className={`font-display font-bold text-sm ${sel ? "text-aubergine" : "text-ink"}`}>${tDiscounted}</p>
                            {discount > 0 && <p className="font-mono text-[10px] text-ink-muted line-through">${t.price}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Qty */}
              <div>
                <label className={labelCls}>How many tickets?</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setJoinQty(q => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl hover:border-aubergine hover:text-aubergine transition-all">−</button>
                  <span className="font-display font-bold text-3xl text-ink w-10 text-center">{joinQty}</span>
                  <button type="button" onClick={() => setJoinQty(q => Math.min(20, q + 1))}
                    className="w-11 h-11 rounded-xl border border-ivory-200 flex items-center justify-center font-bold text-xl hover:border-aubergine hover:text-aubergine transition-all">+</button>
                  <span className="font-mono text-[10px] text-ink-muted ml-1">
                    × ${joinTierId ? (discount > 0 ? Math.round((eventTiers.find(t=>t.id===joinTierId)?.price ?? activeTierPrice) * (1-discount/100)) : (eventTiers.find(t=>t.id===joinTierId)?.price ?? activeTierPrice)) : activeDiscountedPrice} = <strong>${(joinTierId ? (discount > 0 ? Math.round((eventTiers.find(t=>t.id===joinTierId)?.price ?? activeTierPrice) * (1-discount/100)) : (eventTiers.find(t=>t.id===joinTierId)?.price ?? activeTierPrice)) : activeDiscountedPrice) * joinQty}</strong>
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
                <textarea rows={2} value={joinNotes} onChange={e => setJoinNotes(e.target.value)}
                  placeholder="e.g. bringing my parents and two kids 🎉"
                  className="w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all resize-none" />
              </div>

              {joinError && (
                <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                  <p className="font-ui text-sm text-durga">{joinError}</p>
                </div>
              )}

              <button type="submit" disabled={joining || !firstName || !lastName || !joinEmail.includes("@")}
                className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${!joining && firstName && lastName && joinEmail.includes("@") ? "bg-aubergine text-white hover:bg-aubergine-light active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}>
                {joining ? "Joining…" : "Join the group →"}
              </button>
              <p className="font-mono text-[10px] text-ink-muted text-center">
                {isMinQtyDiscount
                  ? "No payment from you — the host covers everyone in one transaction"
                  : "No payment yet — you'll pay when you're ready"}
              </p>
            </div>
          </form>
        )}

        {/* ── Joined success state ── */}
        {mode === "joined" && (
          <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
            <div className="p-6 text-center border-b border-ivory-200">
              <div className="w-14 h-14 rounded-full bg-peacock/10 border border-peacock/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="font-display font-bold text-ink text-xl mb-1">You&apos;re in, {firstName}!</p>
              <p className="font-ui text-sm text-ink-muted leading-relaxed">
                {isMinQtyDiscount
                  ? <>Your {joinQty > 1 ? `${joinQty} tickets are` : "spot is"} reserved. The group host will pay for everyone in one transaction once everyone&apos;s joined — no action needed from you right now.</>
                  : <>{joinQty > 1 ? `${joinQty} tickets reserved for you.` : "Your spot is reserved."} Pay whenever you&apos;re ready — no rush.</>
                }
              </p>
            </div>

            <div className="p-5 space-y-3">
              {isMinQtyDiscount ? (
                <>
                  <button
                    onClick={() => handleGroupCheckout(joinEmail)}
                    className="w-full py-4 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm"
                  >
                    I&apos;ll pay for the whole group · ${groupPayTotal.toFixed(2)} →
                  </button>
                  <button onClick={() => setMode("view")}
                    className="w-full py-3 rounded-2xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all">
                    Back to group — let someone else pay
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleCheckout(joinEmail, joinQty, joinTierId ?? tier.id)}
                    className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-sm"
                  >
                    Pay for my {joinQty} ticket{joinQty !== 1 ? "s" : ""} · ${(activeDiscountedPrice * joinQty).toFixed(2)} →
                  </button>
                  <button
                    onClick={() => handleGroupCheckout(joinEmail)}
                    className="w-full py-3 rounded-2xl border border-aubergine/25 text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all"
                  >
                    Or pay for everyone · ${groupPayTotal.toFixed(2)} total
                  </button>
                  <button
                    onClick={() => setMode("view")}
                    className="w-full py-3 rounded-2xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all"
                  >
                    I&apos;ll pay later — back to group
                  </button>
                </>
              )}
              <p className="font-mono text-[10px] text-ink-muted text-center">
                We&apos;ll send a reminder to {joinEmail}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar — always visible on mobile ── */}
      {!isExpired && mode === "view" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-4"
          style={{ background: "linear-gradient(to top, rgba(252,249,242,1) 70%, rgba(252,249,242,0))" }}>
          {!myMember ? (
            /* Not joined yet */
            <button onClick={() => setMode("join")}
              className="w-full flex items-center justify-between gap-3 bg-marigold text-aubergine px-5 py-4 rounded-2xl shadow-xl shadow-marigold/25 font-display font-bold active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-aubergine/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-bold leading-tight">Join this group</p>
                  <p className="font-ui text-xs text-aubergine/70 font-normal">
                    {isMinQtyDiscount ? "Declare your tickets — one person pays" : "No payment needed yet"}
                  </p>
                </div>
              </div>
              <span className="text-lg">→</span>
            </button>
          ) : !myMember.paid && isMinQtyDiscount ? (
            /* Min-qty discount: one person pays for everyone */
            <button onClick={() => handleGroupCheckout(myEmail ?? group.organizerEmail)}
              className="w-full flex items-center justify-between gap-3 bg-aubergine text-white px-5 py-4 rounded-2xl shadow-xl shadow-aubergine/20 font-display font-bold active:scale-[0.98] transition-all">
              <div className="text-left">
                <p className="text-base font-bold leading-tight">Pay for the whole group</p>
                <p className="font-ui text-xs text-white/70 font-normal">{totalTickets} tickets · {discount}% off</p>
              </div>
              <p className="text-xl font-bold">${groupPayTotal.toFixed(2)} →</p>
            </button>
          ) : !myMember.paid ? (
            /* No min-qty discount: individual pay CTA */
            <button onClick={() => handleCheckout(myEmail!, myMember.qty, myMember.tierId ?? joinTierId ?? tier.id)}
              className="w-full flex items-center justify-between gap-3 bg-marigold text-aubergine px-5 py-4 rounded-2xl shadow-xl shadow-marigold/25 font-display font-bold active:scale-[0.98] transition-all">
              <div className="text-left">
                <p className="text-base font-bold leading-tight">Pay for my tickets</p>
                <p className="font-ui text-xs text-aubergine/70 font-normal">{myMember.qty} ticket{myMember.qty !== 1 ? "s" : ""} reserved</p>
              </div>
              <p className="text-xl font-bold">${(activeDiscountedPrice * myMember.qty).toFixed(2)} →</p>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
