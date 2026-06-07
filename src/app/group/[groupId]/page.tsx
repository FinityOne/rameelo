"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { loadGroupOrder, joinGroupOrder, updateGroupMember, updateGroupName, tierHasGroupDiscount, groupDiscountPct, groupDiscountSummary, type GroupOrder } from "@/lib/group-orders";
import { GRADIENTS } from "@/app/organizer/events/create/types";


function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Light email mask for the "who's paying?" picker (link is public).
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const shown = local.slice(0, Math.min(2, local.length));
  return `${shown}${"•".repeat(Math.max(local.length - shown.length, 1))}@${domain}`;
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

  // Available active tiers for this event (for the join modal's ticket picker)
  type TierOption = { id: string; name: string; price: number };
  const [eventTiers, setEventTiers] = useState<TierOption[]>([]);

  // Auth state
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);

  // "Who's paying?" picker (shown when we don't already know the payer)
  const [payPickerOpen, setPayPickerOpen] = useState(false);

  // Current member's email (set after joining, used for edit access)
  const [myEmail, setMyEmail] = useState<string | null>(null);

  // Join form
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [joinEmail, setJoinEmail]   = useState("");
  const [joinQty, setJoinQty]       = useState(1);
  const [joinTierId, setJoinTierId] = useState<string | null>(null);
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Inline edit for existing members
  const [editEmail, setEditEmail]   = useState<string | null>(null);
  const [editQty, setEditQty]       = useState(1);
  const [saving, setSaving]         = useState(false);

  // Group name edit (host only)
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState("");

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      loadGroupOrder(groupId),
      supabase.auth.getUser(),
    ]).then(([groupData, { data: { user } }]) => {
      setGroup(groupData);
      setLoading(false);

      // Load the event's active, available tiers for the join picker
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
            }).map(t => ({ id: t.id, name: t.name, price: t.price })) as TierOption[];
            setEventTiers(available);
            // Default the picker to the group's tier, else the first available
            const def = available.find(t => t.id === groupData.tierId) ?? available[0];
            if (def) setJoinTierId(def.id);
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
          .select("first_name, last_name, email")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.first_name) setFirstName(profile.first_name);
            if (profile?.last_name)  setLastName(profile.last_name);
            if (profile?.email || email) setJoinEmail(profile?.email || email || "");
            // Pre-fill qty/tier if already a member
            const me = groupData?.members.find(m => m.email === (profile?.email || email));
            if (me) { setJoinQty(me.qty); if (me.tierId) setJoinTierId(me.tierId); }
          });
      }
    });
  }, [groupId]);

  // Lock background scroll while the join or pay-picker modal is open
  useEffect(() => {
    if (mode !== "join" && !payPickerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mode, payPickerOpen]);

  // Build the one-payer checkout payload and head to checkout. Self-contained
  // (reads state) so it can run from both the picker and the post-login resume.
  function goToGroupCheckout(payerEmail: string) {
    if (!group || !group.event || !group.tier) return;
    const ev = group.event;
    const tier = group.tier;
    // The member being paid as — used to lock/mask contact when they have an account.
    const payer = group.members.find(m => m.email.toLowerCase() === payerEmail.toLowerCase());
    const priceFor = (tid?: string) => (tid ? eventTiers.find(t => t.id === tid)?.price : undefined) ?? tier.price;
    const totalTickets = group.members.reduce((s, m) => s + m.qty, 0);
    const discount = groupDiscountPct(tier, totalTickets);
    const subtotalFull = group.members.reduce((s, m) => s + priceFor(m.tierId) * m.qty, 0);
    const subtotalAfterDiscount = Math.round(subtotalFull * (1 - discount / 100));
    const rameeloFee    = Math.round(subtotalAfterDiscount * 0.03 * 100) / 100;
    const processingFee = Math.round(subtotalAfterDiscount * 0.05 * 100) / 100;
    const blendedUnit   = totalTickets ? Math.round(subtotalFull / totalTickets) : tier.price;
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
      unitPrice: blendedUnit,
      discount,
      discountAmount: subtotalFull - subtotalAfterDiscount,
      subtotalAfterDiscount,
      rameeloFee,
      serviceFee: rameeloFee + processingFee,
      grandTotal: subtotalAfterDiscount + rameeloFee + processingFee,
      groupId,
      groupEmail: payerEmail,
      isGroupPay: true,
      groupPayerName: payer?.name ?? "",
      groupPayerHasAccount: !!payer?.userId,
    };
    localStorage.setItem("rameelo_checkout", JSON.stringify(payload));
    router.push("/checkout");
  }

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
          <p className="font-ui text-ink-muted text-sm mb-4">This link may have been removed.</p>
          <Link href="/events" className="text-marigold font-semibold hover:underline">Browse events →</Link>
        </div>
      </div>
    );
  }

  const ev = group.event;
  const tier = group.tier;
  const memberCount = group.members.length;           // number of distinct people
  const totalTickets = group.members.reduce((s, m) => s + m.qty, 0); // total tickets claimed
  const unitPrice = tier.price;

  // Discounts are driven entirely by this event's ticket tier — never hardcoded.
  const hasGroupDiscount = tierHasGroupDiscount(tier);          // tier offers a discount at some size
  const discountSummary = groupDiscountSummary(tier);           // { minQty, amount } | null
  const discount = groupDiscountPct(tier, totalTickets);        // live % for the current group size
  const discountActive = discount > 0;                          // threshold met → savings apply now
  const ticketsToUnlock = discountSummary ? Math.max(discountSummary.minQty - totalTickets, 0) : 0;
  const discountedPrice = Math.round(unitPrice * (1 - discount / 100));

  // No fixed cap — a group can grow without limit. When the tier has a discount,
  // its minimum quantity is the milestone we nudge toward (for the progress bar).
  const milestoneQty = discountSummary?.minQty ?? 0;
  const milestonePct = milestoneQty > 0 ? Math.min((totalTickets / milestoneQty) * 100, 100) : 0;

  // A member's chosen tier price (falls back to the group's tier).
  const tierPriceFor = (tierId?: string) =>
    (tierId ? eventTiers.find(t => t.id === tierId)?.price : undefined) ?? unitPrice;

  // One-payer model: the whole group is bought together in a single transaction.
  // Members may be on different tiers, so the subtotal sums each member's tier;
  // the group-level discount (from the group's tier) is applied across the board.
  const groupSubtotalFull = group.members.reduce((s, m) => s + tierPriceFor(m.tierId) * m.qty, 0);
  const groupPayTotal = Math.round(groupSubtotalFull * (1 - discount / 100)); // ticket subtotal, pre-fees
  const groupDiscountAmount = groupSubtotalFull - groupPayTotal;

  // Price of the tier currently selected in the join modal.
  const joinTierPrice = tierPriceFor(joinTierId ?? undefined);
  const joinTierDiscounted = Math.round(joinTierPrice * (1 - discount / 100));

  // My member record (if already joined)
  const myMember = myEmail ? group.members.find(m => m.email === myEmail) : null;
  // Anyone in the group or with the link can pay once it's payable (≥2 people).
  const groupPaid = group.status === "completed" || group.members.some(m => m.paid);
  const canPayGroup = memberCount >= 2 && !groupPaid;
  // Once paid, send visitors to their account to view/claim their tickets.
  const claimHref = authedUserId ? "/portal/tickets" : `/auth/signin?next=${encodeURIComponent("/portal/tickets")}`;

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
    const text = hasGroupDiscount
      ? `${group!.organizerName} invited you to join their group for ${ev.title} — join up and unlock the group rate! 🎉`
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

  // Start the "pay for the group" flow. A signed-in member is already known, so
  // they go straight to checkout. Anyone else (no account) must pick which member
  // they are first — that email is then locked at checkout.
  function startGroupPay() {
    const me = authedUserId ? group!.members.find(m => m.userId === authedUserId) : null;
    if (me) {
      goToGroupCheckout(me.email);
      return;
    }
    setPayPickerOpen(true);
  }

  // The viewer picked which member they are → checkout with that email locked.
  function selectPayer(m: GroupOrder["members"][0]) {
    setPayPickerOpen(false);
    goToGroupCheckout(m.email);
  }

  async function handleSaveEdit() {
    if (!editEmail) return;
    setSaving(true);
    await updateGroupMember({ groupId, email: editEmail, qty: editQty });
    // Refresh group data
    const refreshed = await loadGroupOrder(groupId);
    setGroup(refreshed);
    setEditEmail(null);
    setSaving(false);
  }

  async function handleSaveName() {
    setSaving(true);
    await updateGroupName(groupId, nameInput);
    const refreshed = await loadGroupOrder(groupId);
    setGroup(refreshed);
    setEditingName(false);
    setSaving(false);
  }

  function startEdit(member: GroupOrder["members"][0]) {
    setEditEmail(member.email);
    setEditQty(member.qty);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Header */}
      <div className="bg-white border-b border-ivory-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Logo variant="red" height={22} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted truncate max-w-[200px]">
            {group.name ?? `Group Order · ${groupId}`}
          </span>
        </div>
      </div>

      <div className={`max-w-lg mx-auto px-4 py-6 space-y-4 ${mode === "view" ? "pb-28" : ""}`}>

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
          {editingName ? (
            <div className="flex items-center gap-2 mb-1 w-full max-w-xs mx-auto">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                maxLength={50}
                placeholder="e.g. The Garba Squad 🎉"
                className="flex-1 rounded-xl border border-aubergine/30 bg-white px-3 py-2 font-display font-bold text-ink text-base text-center focus:outline-none focus:ring-2 focus:ring-aubergine/25"
              />
              <button onClick={handleSaveName} disabled={saving}
                className="shrink-0 px-3 py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-colors disabled:opacity-60">
                {saving ? "…" : "Save"}
              </button>
              <button onClick={() => setEditingName(false)}
                className="shrink-0 w-8 h-8 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink transition-colors text-sm">
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-1">
              {group.name ? (
                <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
                  {group.name}
                </p>
              ) : myEmail === group.organizerEmail ? (
                <p className="font-ui text-sm text-ink-muted/60 italic">No name yet</p>
              ) : null}
              {myEmail === group.organizerEmail && (
                <button
                  onClick={() => { setNameInput(group.name ?? ""); setEditingName(true); }}
                  className="text-ink-muted/50 hover:text-aubergine transition-colors"
                  title="Edit group name"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="font-ui text-sm text-ink-muted">
            Hosted by <strong className="text-ink">{group.organizerName}</strong>
          </p>
        </div>

        {groupPaid ? (
          /* Purchased — locked success state. Direct everyone to claim in-account. */
          <div className="rounded-2xl border-2 border-peacock/30 bg-peacock/[0.06] p-5 sm:p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-peacock flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold mb-1">Tickets purchased</p>
            <p className="font-display font-bold text-ink text-lg leading-snug">This group is all set! 🎉</p>
            <p className="font-ui text-sm text-ink-muted mt-1.5 mb-4 leading-relaxed">
              <strong className="text-ink">{group.organizerName}</strong> paid for the group and everyone&rsquo;s tickets have been sent out. Sign in or create an account <strong className="text-ink">with your own email</strong> to view and claim your tickets.
            </p>
            <Link
              href={claimHref}
              className="block w-full py-3.5 rounded-2xl bg-peacock text-white font-display font-bold text-sm text-center hover:opacity-90 active:scale-[0.98] shadow-sm transition-all"
            >
              View &amp; claim my tickets →
            </Link>
            {!authedUserId && (
              <p className="font-mono text-[10px] text-ink-muted mt-2">
                New to Rameelo?{" "}
                <Link href={`/auth/signup?next=${encodeURIComponent("/portal/tickets")}`} className="text-peacock font-bold hover:underline">Create an account</Link>
              </p>
            )}
          </div>
        ) : (
          /* Share — front and center so it's one tap to spread the word */
          <div className="rounded-2xl border border-marigold/30 bg-marigold/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-marigold-dark font-bold mb-3 text-center">
              Share your group link — invite the crew
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "WhatsApp", icon: "💬", channel: "whatsapp" },
                { label: "iMessage", icon: "📱", channel: "sms" },
                { label: linkCopied ? "Copied!" : "Copy Link", icon: linkCopied ? "✓" : "🔗", channel: "copy" },
              ].map(ch => (
                <button key={ch.label} onClick={() => shareVia(ch.channel)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95 ${
                    linkCopied && ch.channel === "copy" ? "border-peacock/40 bg-peacock/10 text-peacock" : "border-ivory-200 bg-white hover:border-marigold/50 text-ink-muted hover:text-aubergine"
                  }`}>
                  <span className="text-xl leading-none">{ch.icon}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wide">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Group progress — no cap; nudge toward the discount milestone if any */}
        <div className="rounded-2xl p-5 bg-white border border-ivory-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold mb-0.5 text-marigold">
                {hasGroupDiscount ? "Group Discount" : "Group Progress"}
              </p>
              <p className="font-display font-bold text-xl text-ink">
                {totalTickets === 0 ? "Be the first to join!" : `${totalTickets} ticket${totalTickets !== 1 ? "s" : ""} in the group`}
              </p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-aubergine">{totalTickets}</p>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">{totalTickets === 1 ? "ticket" : "tickets"}</p>
            </div>
          </div>
          {hasGroupDiscount && (
            <div className="h-2 rounded-full overflow-hidden bg-ivory-200">
              <div
                className="h-full rounded-full transition-all duration-500 bg-marigold"
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          )}
          <p className="font-ui text-xs mt-2 text-ink-muted">
            {groupPaid ? (
              <><strong className="text-peacock">All {totalTickets} ticket{totalTickets !== 1 ? "s" : ""} purchased</strong> — claim yours in your account.</>
            ) : hasGroupDiscount && discountActive ? (
              <><strong className="text-peacock">{discountSummary!.amount} group rate unlocked</strong> — keep adding people, everyone saves.</>
            ) : hasGroupDiscount && discountSummary ? (
              <><strong className="text-ink">{ticketsToUnlock} more ticket{ticketsToUnlock !== 1 ? "s" : ""}</strong> to unlock <strong className="text-peacock">{discountSummary.amount}</strong> for the group — add as many as you like!</>
            ) : (
              <>Add as many people as you like — the more the merrier.</>
            )}
          </p>
        </div>

        {/* Who's In */}
        <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Who&rsquo;s In · {memberCount} {memberCount === 1 ? "person" : "people"}
            </p>
            <p className="font-mono text-[10px] text-ink-muted">{totalTickets} {totalTickets === 1 ? "ticket" : "tickets"}</p>
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
                            {eventTiers.find(t => t.id === m.tierId) && <span className="ml-1">· {eventTiers.find(t => t.id === m.tierId)!.name}</span>}
                            {m.paid && <span className="ml-2 text-peacock">· Paid ✓</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!m.paid && (
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
            {/* Open spots — inviting placeholders to encourage more joins (hidden once paid) */}
            {!groupPaid && Array.from({ length: 4 }).map((_, i) => (
              <button
                key={`open-${i}`}
                type="button"
                onClick={() => setMode("join")}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-marigold/5 active:bg-marigold/10 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-marigold/40 flex items-center justify-center shrink-0 group-hover:border-marigold group-hover:bg-marigold/10 transition-all">
                  <span className="text-marigold-dark text-sm font-bold">+</span>
                </div>
                <span className="font-ui text-sm text-ink-muted group-hover:text-marigold-dark transition-colors">
                  {i === 0 && !myMember ? "Claim your spot — join the group" : "Open spot · tap to join"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── View mode — main CTA (hidden once the group is paid/locked) ── */}
        {mode === "view" && !groupPaid && (
          <div className="space-y-3">

            {/* One-payer model explainer */}
            <div className="rounded-2xl border border-aubergine/15 bg-aubergine/5 px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-ui text-sm text-aubergine/80 leading-relaxed">
                <strong className="text-aubergine">One person pays for the whole group.</strong> Everyone adds the tickets they need, then a single checkout covers everybody{discountActive ? ` at the ${discountSummary!.amount} group rate` : ""} — no splitting payments.
              </p>
            </div>

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
                      Add your name and how many tickets you need — no payment from you.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-2xl">${discountedPrice.toFixed(2)}</p>
                    {discountActive && <p className="font-mono text-[10px] text-aubergine/60 line-through">${unitPrice.toFixed(2)}</p>}
                    <p className="font-mono text-[10px] text-aubergine/60">per ticket</p>
                  </div>
                </div>
              </button>
            )}

            {/* Group payment — anyone in the group or with the link can pay for everyone */}
            {groupPaid ? (
              <div className="rounded-2xl border border-peacock/25 bg-peacock/5 p-5 text-center space-y-1">
                <div className="w-11 h-11 rounded-full bg-peacock/15 flex items-center justify-center mx-auto mb-1">
                  <svg className="w-6 h-6 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-display font-bold text-ink text-base">This group is paid 🎉</p>
                <p className="font-ui text-sm text-ink-muted">All {totalTickets} ticket{totalTickets !== 1 ? "s" : ""} are covered — see you on the dance floor!</p>
              </div>
            ) : memberCount >= 2 ? (
              <div className="rounded-2xl border border-ivory-200 bg-white p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold mb-1">Group payment</p>
                    <p className="font-display font-bold text-ink text-base">Pay for all {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}</p>
                    <p className="font-ui text-sm text-ink-muted mt-0.5">
                      {memberCount} {memberCount === 1 ? "person" : "people"} · {discountActive ? `${discountSummary!.amount} applied` : "standard rate"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-peacock text-2xl">${groupPayTotal.toFixed(2)}</p>
                    {discountActive && (
                      <p className="font-mono text-[10px] text-ink-muted line-through">${groupSubtotalFull.toFixed(2)}</p>
                    )}
                    <p className="font-mono text-[10px] text-ink-muted">total</p>
                  </div>
                </div>
                <button
                  onClick={startGroupPay}
                  className="w-full py-3.5 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm"
                >
                  Pay for the whole group →
                </button>
                <p className="font-mono text-[10px] text-ink-muted text-center">
                  Anyone here can check out for everyone — one payment covers the group.
                </p>
                {hasGroupDiscount && !discountActive && ticketsToUnlock > 0 ? (
                  <p className="font-mono text-[10px] text-ink-muted text-center">
                    Add {ticketsToUnlock} more ticket{ticketsToUnlock !== 1 ? "s" : ""} to unlock {discountSummary!.amount} — share the link first
                  </p>
                ) : (
                  <p className="font-mono text-[10px] text-ink-muted text-center">
                    Add as many people as you like — share the link to grow the group
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-ivory-200 bg-white p-5 text-center space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold mb-1">Group payment</p>
                <p className="font-display font-bold text-ink text-base">Invite at least 1 more person</p>
                <p className="font-ui text-sm text-ink-muted">
                  Payment unlocks once 2 people have joined — share your link above to grow the group.
                </p>
              </div>
            )}
          </div>
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
                Your {joinQty > 1 ? `${joinQty} tickets are` : "spot is"} reserved.{" "}
                {memberCount >= 2
                  ? "One person pays for the whole group in a single checkout — you can be that person, or leave it to someone else in the crew."
                  : "Payment unlocks once at least 2 people have joined — share the link to bring the crew in."}
              </p>
            </div>

            <div className="p-5 space-y-3">
              {memberCount >= 2 && (
                <button
                  onClick={() => goToGroupCheckout(joinEmail)}
                  className="w-full py-4 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm"
                >
                  I&apos;ll pay for the whole group · ${groupPayTotal.toFixed(2)} →
                </button>
              )}
              <button onClick={() => setMode("view")}
                className="w-full py-3 rounded-2xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all">
                {memberCount >= 2 ? "Back to group — let someone else pay" : "Back to group & invite friends"}
              </button>
              <p className="font-mono text-[10px] text-ink-muted text-center">
                We&apos;ll send the group link to {joinEmail}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar — always visible on mobile ── */}
      {mode === "view" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-4"
          style={{ background: "linear-gradient(to top, rgba(252,249,242,1) 70%, rgba(252,249,242,0))" }}>
          {groupPaid ? (
            /* Locked — purchase complete; send everyone to claim their tickets */
            <Link href={claimHref}
              className="w-full flex items-center justify-between gap-3 bg-peacock text-white px-5 py-4 rounded-2xl shadow-xl shadow-peacock/20 font-display font-bold active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-bold leading-tight">Tickets purchased</p>
                  <p className="font-ui text-xs text-white/70 font-normal">Sign in to view &amp; claim yours</p>
                </div>
              </div>
              <span className="text-lg">→</span>
            </Link>
          ) : canPayGroup ? (
            /* Payable — anyone in the group or with the link can pay for everyone */
            <button onClick={startGroupPay}
              className="w-full flex items-center justify-between gap-3 bg-aubergine text-white px-5 py-4 rounded-2xl shadow-xl shadow-aubergine/20 font-display font-bold active:scale-[0.98] transition-all">
              <div className="text-left">
                <p className="text-base font-bold leading-tight">Pay for the whole group</p>
                <p className="font-ui text-xs text-white/70 font-normal">{totalTickets} ticket{totalTickets !== 1 ? "s" : ""}{discountActive ? ` · ${discountSummary!.amount}` : ""}</p>
              </div>
              <p className="text-xl font-bold">${groupPayTotal.toFixed(2)} →</p>
            </button>
          ) : !myMember ? (
            /* Not joined yet, group not payable */
            <button onClick={() => setMode("join")}
              className="w-full flex items-center justify-between gap-3 bg-marigold text-aubergine px-5 py-4 rounded-2xl shadow-xl shadow-marigold/25 font-display font-bold active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-aubergine/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-bold leading-tight">Join this group</p>
                  <p className="font-ui text-xs text-aubergine/70 font-normal">
                    Add your tickets — one person pays
                  </p>
                </div>
              </div>
              <span className="text-lg">→</span>
            </button>
          ) : (
            /* In the group but fewer than 2 people — nudge to invite */
            <button onClick={() => shareVia("copy")}
              className="w-full flex items-center justify-between gap-3 bg-marigold text-aubergine px-5 py-4 rounded-2xl shadow-xl shadow-marigold/25 font-display font-bold active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-aubergine/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-bold leading-tight">{linkCopied ? "Link copied!" : "Invite 1 more to unlock payment"}</p>
                  <p className="font-ui text-xs text-aubergine/70 font-normal">Payment opens at 2 people</p>
                </div>
              </div>
              <span className="text-lg">{linkCopied ? "✓" : "🔗"}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Join modal ── */}
      {mode === "join" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setMode("view")}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-aubergine/40 backdrop-blur-sm" />

          {/* Sheet / card */}
          <form
            onSubmit={handleJoin}
            onClick={e => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white px-5 pt-5 pb-4 border-b border-ivory-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-ink text-lg leading-tight">Join the group</h3>
                <p className="font-ui text-xs text-ink-muted">No account needed — one person pays for everyone</p>
              </div>
              <button type="button" onClick={() => setMode("view")} aria-label="Close"
                className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {authedUserId && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-peacock/8 border border-peacock/20">
                  <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="font-ui text-xs text-peacock font-semibold">Signed in — your info is pre-filled</p>
                </div>
              )}

              {/* Ticket — pick an available, active tier */}
              <div>
                <label className={labelCls}>Pick your ticket *</label>
                {eventTiers.length === 0 ? (
                  <div className="rounded-xl border border-durga/20 bg-durga/5 px-4 py-3">
                    <p className="font-ui text-sm text-durga">No tickets are on sale right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventTiers.map(t => {
                      const sel = joinTierId === t.id;
                      const disc = discountActive ? Math.round(t.price * (1 - discount / 100)) : t.price;
                      return (
                        <button key={t.id} type="button" onClick={() => setJoinTierId(t.id)}
                          className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${sel ? "border-aubergine bg-aubergine/5" : "border-ivory-200 bg-white hover:border-aubergine/30"}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "border-aubergine" : "border-ivory-200"}`}>
                              {sel && <div className="w-2 h-2 rounded-full bg-aubergine" />}
                            </div>
                            <span className={`font-ui font-semibold text-sm truncate ${sel ? "text-aubergine" : "text-ink"}`}>{t.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-display font-bold text-sm ${sel ? "text-aubergine" : "text-ink"}`}>${disc}</p>
                            {discountActive && <p className="font-mono text-[10px] text-ink-muted line-through">${t.price}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

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
                    × ${joinTierDiscounted} = <strong>${joinTierDiscounted * joinQty}</strong>
                  </span>
                </div>
                <p className="font-mono text-[10px] text-ink-muted mt-1.5">Added to the group total — one person pays for everyone at checkout.</p>
              </div>

              {joinError && (
                <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                  <p className="font-ui text-sm text-durga">{joinError}</p>
                </div>
              )}

              <button type="submit" disabled={joining || !firstName || !lastName || !joinEmail.includes("@") || !joinTierId}
                className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${!joining && firstName && lastName && joinEmail.includes("@") && joinTierId ? "bg-aubergine text-white hover:bg-aubergine-light active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}>
                {joining ? "Joining…" : "Join the group →"}
              </button>
              <p className="font-mono text-[10px] text-ink-muted text-center">
                No payment from you — one person checks out for the whole group
              </p>
            </div>
          </form>
        </div>
      )}

      {/* ── "Who's paying?" picker ── */}
      {payPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setPayPickerOpen(false)}
        >
          <div className="absolute inset-0 bg-aubergine/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-5 pt-5 pb-4 border-b border-ivory-200 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-ink text-lg leading-tight">Which one are you?</h3>
                <p className="font-ui text-xs text-ink-muted">Pick yourself to pay for the whole group.</p>
              </div>
              <button type="button" onClick={() => setPayPickerOpen(false)} aria-label="Close"
                className="w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 space-y-2">
              {group.members.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectPayer(m)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-ivory-200 bg-white hover:border-aubergine/40 hover:bg-aubergine/[0.03] active:scale-[0.99] transition-all text-left"
                >
                  <MemberAvatar name={m.name} index={i} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-ui text-sm font-semibold text-ink truncate">{m.name}</span>
                      {m.isOrganizer && (
                        <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Host</span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted mt-0.5 truncate">
                      {maskEmail(m.email)} · {m.qty} ticket{m.qty !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
              <p className="font-mono text-[10px] text-ink-muted text-center pt-2">
                You&rsquo;ll pay for everyone — the whole group is covered in one checkout.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
