"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import {
  generateGroupId,
  createGroupOrder,
  tierHasGroupDiscount,
  groupDiscountPct,
  groupDiscountSummary,
} from "@/lib/group-orders";
import { salesClosedForEvent } from "@/lib/event-time";


function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Friendly display name from an email's local part (e.g. priya.patel → Priya Patel).
function nameFromEmail(em: string): string {
  const local = (em.split("@")[0] || "").replace(/[._-]+/g, " ").trim();
  if (!local) return "Host";
  return local.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Playful default group names — host can rename on the group page afterward.
const RANDOM_GROUP_NAMES = [
  "The Garba Squad",
  "Dandiya Dhamaka",
  "Raas Rebels",
  "Chaniya Choli Crew",
  "Nine Nights Posse",
  "Ghoomar Gang",
  "Sheri ke Sitare",
  "Dhol Dropouts",
  "Garbe ki Toli",
  "Navratri Nimbu Pani",
];
function randomGroupName(): string {
  return RANDOM_GROUP_NAMES[Math.floor(Math.random() * RANDOM_GROUP_NAMES.length)];
}

type EventSummary = {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  city: string;
  state: string;
  ticket_tiers: { id: string; name: string; price: number; quantity: number; quantity_sold: number; is_visible: boolean; sort_order: number; sale_start_date: string | null; sale_end_date: string | null; group_discount_min_qty: number | null; group_discount_type: "percentage" | "fixed" | null; group_discount_value: number | null }[];
  artists: { name: string; profile_image_url: string | null } | null;
};

function AvatarCircle({ name, imgUrl }: { name: string; imgUrl?: string | null }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: "#2E1B30" }}>
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

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState(""); // logged-in display name (from profile)
  const [email, setEmail]           = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  // Load event + check auth session
  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    const supabase = createClient();

    Promise.all([
      supabase
        .from("events")
        .select(`
          id, title, start_date, start_time, city, state,
          artists:artists!events_artist_id_fkey (name, profile_image_url),
          ticket_tiers (id, name, price, quantity, quantity_sold, is_visible, sort_order, sale_start_date, sale_end_date, group_discount_min_qty, group_discount_type, group_discount_value)
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
        // Auto-populate from profile — logged-in hosts only need to confirm.
        supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
            if (name) setAccountName(name);
            setEmail(profile?.email || user.email || "");
          });
      }

      setLoading(false);
    });
  }, [eventId]);

  const selectedTier = event?.ticket_tiers.find(t => t.id === selectedTierId) ?? null;
  // Discounts come straight from the event's active tiers — never hardcoded.
  const discountTier = event?.ticket_tiers.find(t => tierHasGroupDiscount(t)) ?? null;
  const discountInfo = groupDiscountSummary(discountTier); // { minQty, amount } | null
  const anyTierHasDiscount = !!discountInfo;

  const emailValid = email.trim().includes("@");
  const canCreate = !!selectedTierId && emailValid && !saving;

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate || !selectedTierId) return;
    setSaving(true);
    setSaveError("");

    const trimmedEmail = email.trim();
    const hostName = accountName.trim() || nameFromEmail(trimmedEmail);

    // Target/headline discount come from the selected tier's own discount config
    // (the group page recomputes the live discount as people join). If the tier
    // has a discount, the goal is to reach its minimum quantity; otherwise default.
    const tierMinQty = selectedTier && tierHasGroupDiscount(selectedTier) ? (selectedTier.group_discount_min_qty ?? 0) : 0;
    const goalTarget = tierMinQty > 0 ? Math.max(tierMinQty, 2) : 10;
    const discountPct = groupDiscountPct(selectedTier, goalTarget);

    const id = generateGroupId();

    const { error } = await createGroupOrder({
      groupId: id,
      name: randomGroupName(), // auto-named; host can rename on the group page
      eventId,
      tierId: selectedTierId,
      organizerName: hostName,
      organizerEmail: trimmedEmail,
      organizerPhone: "",
      organizerUserId: authedUserId,
      targetSize: goalTarget,
      discountPct,
      hostQty: 2, // host starts with 2 tickets — editable on the group page
    });

    if (error) {
      setSaving(false);
      setSaveError("Couldn't create your group. Try again.");
      return;
    }

    // Remember the host's email so they can edit their own record on the group page.
    localStorage.setItem(`rameelo_group_member_${id}`, trimmedEmail);

    // Email the host their group link + how-it-works (non-blocking).
    fetch("/api/group-created", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: id }),
    }).catch(() => { /* silent — email shouldn't block group creation */ });

    // Straight to the live group page (keep `saving` so the button stays disabled).
    router.push(`/group/${id}`);
  }

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

  // Online sales close when doors open in the event's city — no new groups after that.
  if (salesClosedForEvent(event)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center max-w-sm">
          <p className="font-display text-2xl font-bold text-ink mb-2">Sales are closed</p>
          <p className="font-ui text-sm text-ink-muted mb-4">Online sales for {event.title} close when doors open. Tickets may be available at the door.</p>
          <Link href={`/events/${event.id}`} className="text-marigold font-semibold hover:underline">← Back to event</Link>
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
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">New group order</span>
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

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-peacock font-bold mb-1">No payment yet · just forming your group</p>
            <h1 className="font-display font-bold text-ink text-2xl mb-1">Rally your crew</h1>
            <p className="font-ui text-ink-muted text-sm leading-relaxed">
              {anyTierHasDiscount
                ? "This isn’t checkout — you’re just starting a group. Grab your link, share it with friends, and unlock the group discount together. One person pays for everyone and each person gets their own ticket."
                : "This isn’t checkout — you’re just starting a group. Grab your link and share it with friends. One person pays for everyone and each person gets their own ticket."}
            </p>
          </div>

          {/* Email */}
          {authedUserId ? (
            <div className="rounded-2xl border border-ivory-200 bg-ivory/60 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold mb-0.5">Hosting as</p>
                <p className="font-ui text-sm text-ink truncate">{email || "your account"}</p>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-peacock font-bold shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.105-.895-2-2-2H8m8 2V7a4 4 0 00-8 0v4m-1 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z" /></svg>
                Signed in
              </span>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Your email *</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
                required
              />
              <p className="font-mono text-[9px] text-ink-muted mt-1.5">So we can send you the group link — no spam.</p>
            </div>
          )}

          {/* How group discounts work */}
          {discountInfo && (
            <div className="rounded-2xl border border-aubergine/15 bg-aubergine/4 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold mb-3">Group Discount</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-aubergine/10 flex items-center justify-center">
                    <span className="font-mono text-[10px] font-bold text-aubergine">{discountInfo.minQty}+</span>
                  </div>
                  <span className="font-ui text-sm text-ink">{discountInfo.minQty}+ tickets</span>
                </div>
                <span className="font-display font-bold text-aubergine">{discountInfo.amount}</span>
              </div>
              <p className="font-ui text-xs text-ink-muted mt-3 pt-3 border-t border-aubergine/10">
                Once the group reaches {discountInfo.minQty} tickets, one person pays for everyone at the discounted rate — and each person gets their own ticket.
              </p>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
              <p className="font-ui text-sm text-durga">{saveError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canCreate}
            className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${canCreate ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
          >
            {saving ? "Creating…" : "Create My Group Link →"}
          </button>

          <p className="text-center font-ui text-xs text-ink-muted">
            We&rsquo;ll give your group a fun name and 2 tickets to start — rename it, adjust your count, and invite your crew on the next screen.
          </p>
        </form>
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
