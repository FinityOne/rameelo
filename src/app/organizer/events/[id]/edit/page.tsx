"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "../../create/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sale_start_date: string;
  sale_end_date: string;
  group_discount_min_qty: number | null;
  group_discount_type: "percentage" | "fixed" | null;
  group_discount_value: number | null;
  sort_order: number;
  _dirty: boolean;
  _new?: boolean;
};

type EventData = {
  id: string;
  title: string;
  category: string;
  artist: string;
  artist_id: string | null;
  description: string;
  navratri_nights: number[];
  is_multi_day: boolean;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  doors_open_time: string;
  venue_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  parking: string;
  parking_notes: string;
  website_url: string;
  cover_image_url: string;
  cover_gradient: string;
  dress_code: string;
  dress_code_details: string;
  dandiya_sticks: string;
  age_restriction: string;
  capacity: string;
  status: string;
  review_note: string | null;
  org_id: string | null;
};

type OrgOption = { id: string; name: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FEE  = 0.03;
const CARD_FEE_PCT  = 0.05;

const STATUS_META: Record<string, { label: string; pillCls: string; bannerCls: string; icon: string; msg: string }> = {
  draft:          { label: "Draft",     pillCls: "bg-ivory-200 text-ink-muted",   bannerCls: "bg-ivory border-ivory-200",        icon: "📝", msg: "This event is a draft. Submit it for review when ready." },
  pending_review: { label: "In Review", pillCls: "bg-marigold/20 text-[#a06b00]", bannerCls: "bg-marigold/8 border-marigold/25",  icon: "🔍", msg: "Your event is under review. Changes are visible to our team." },
  published:      { label: "Published", pillCls: "bg-peacock/15 text-peacock",     bannerCls: "bg-peacock/8 border-peacock/20",   icon: "✅", msg: "Your event is live. Changes save immediately and are visible to attendees." },
  rejected:       { label: "Rejected",  pillCls: "bg-durga/15 text-durga",         bannerCls: "bg-durga/6 border-durga/20",       icon: "❌", msg: "Your event was rejected. Fix the issues below and resubmit." },
  cancelled:      { label: "Cancelled", pillCls: "bg-ivory-200 text-ink-muted",   bannerCls: "bg-ivory border-ivory-200",        icon: "🚫", msg: "This event has been cancelled." },
};

const CATEGORIES = [
  { id: "garba", label: "Garba" }, { id: "dandiya", label: "Dandiya" },
  { id: "raas", label: "Raas" }, { id: "workshop", label: "Workshop" },
  { id: "community", label: "Community" }, { id: "other", label: "Other" },
];

const PARKING_OPTIONS = [
  { id: "free", label: "Free" }, { id: "paid_nearby", label: "Paid nearby" },
  { id: "street", label: "Street" }, { id: "valet", label: "Valet" },
  { id: "limited", label: "Limited" }, { id: "none", label: "None" },
];

const NIGHTS = Array.from({ length: 9 }, (_, i) => i + 1);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buyerTotal(price: number) {
  return +(price + price * PLATFORM_FEE + price * CARD_FEE_PCT).toFixed(2);
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmt12(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
const labelCls = "block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5";
const sectionCls = "bg-white rounded-2xl border border-ivory-200 overflow-hidden";
const sectionHead = "px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center gap-2";

// ─── Sub-components ────────────────────────────────────────────────────────────

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <svg className="w-3 h-3 text-ink-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/70">{label}</span>
      </div>
      <div className="w-full rounded-xl border border-ivory-200 bg-ivory/60 px-3.5 py-2.5 font-ui text-sm text-ink-muted cursor-not-allowed select-none">
        {value || "—"}
      </div>
      <p className="mt-1 font-mono text-[9px] text-ink-muted/60">Contact your account manager to update</p>
    </div>
  );
}

function TierCard({ tier, idx, onChange }: {
  tier: Tier; idx: number;
  onChange: (patch: Partial<Tier>) => void;
}) {
  const price = tier.price || 0;
  const hasGroup = tier.group_discount_min_qty !== null;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${tier._dirty ? "border-aubergine/35 shadow-sm" : "border-ivory-200"}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 bg-ivory border-b border-ivory-200">
        <div className="w-6 h-6 rounded-full bg-aubergine/10 border border-aubergine/20 flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-aubergine text-[10px]">{idx + 1}</span>
        </div>
        <p className="font-display font-semibold text-ink text-sm flex-1 truncate" style={{ letterSpacing: "-0.01em" }}>
          {tier.name || `Tier ${idx + 1}`}
        </p>
        {tier._dirty && (
          <span className="font-mono text-[8px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full shrink-0">Unsaved</span>
        )}
      </div>

      <div className="p-4 bg-white space-y-3">
        <div>
          <label className={labelCls}>Tier Name *</label>
          <input type="text" placeholder="General Admission" value={tier.name}
            onChange={e => onChange({ name: e.target.value })} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-ui text-sm text-ink-muted">$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={tier.price || ""}
                onChange={e => onChange({ price: parseFloat(e.target.value) || 0 })}
                className={`${inputCls} pl-7`} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets Available</label>
              {!tier._new && <span className="font-mono text-[9px] text-peacock">Can increase</span>}
            </div>
            <input type="number" min="1" placeholder="500"
              value={tier.quantity || ""}
              onChange={e => onChange({ quantity: parseInt(e.target.value) || 1 })}
              className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <input type="text" placeholder="e.g. Floor access + welcome drink"
            value={tier.description}
            onChange={e => onChange({ description: e.target.value })}
            className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sale starts</label>
            <input type="date" value={tier.sale_start_date}
              onChange={e => onChange({ sale_start_date: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sale ends</label>
            <input type="date" value={tier.sale_end_date}
              onChange={e => onChange({ sale_end_date: e.target.value })}
              className={inputCls} />
          </div>
        </div>

        {hasGroup ? (
          <div className="rounded-xl bg-peacock/5 border border-peacock/15 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-widest text-peacock">Group Discount</p>
              <button type="button" onClick={() => onChange({ group_discount_min_qty: null, group_discount_type: null, group_discount_value: null })}
                className="font-ui text-[11px] text-durga hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>Min qty</label>
                <input type="number" min="2" value={tier.group_discount_min_qty ?? ""}
                  onChange={e => onChange({ group_discount_min_qty: parseInt(e.target.value) || null })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={tier.group_discount_type ?? "percentage"}
                  onChange={e => onChange({ group_discount_type: e.target.value as "percentage" | "fixed" })}
                  className={`${inputCls} cursor-pointer`}>
                  <option value="percentage">% off</option>
                  <option value="fixed">$ off</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{tier.group_discount_type === "fixed" ? "$ off" : "% off"}</label>
                <input type="number" min="0" step="0.01" value={tier.group_discount_value ?? ""}
                  onChange={e => onChange({ group_discount_value: parseFloat(e.target.value) || null })}
                  className={inputCls} />
              </div>
            </div>
          </div>
        ) : (
          <button type="button"
            onClick={() => onChange({ group_discount_min_qty: 4, group_discount_type: "percentage", group_discount_value: 10 })}
            className="w-full py-2 rounded-xl border border-dashed border-ivory-200 font-ui text-xs text-ink-muted hover:border-peacock/40 hover:text-peacock hover:bg-peacock/5 transition-all">
            + Add group discount
          </button>
        )}

        {price > 0 && (
          <div className="rounded-xl bg-aubergine/5 border border-aubergine/12 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-aubergine/50">Buyer pays (incl. fees)</p>
              <p className="font-display font-bold text-aubergine text-lg">${buyerTotal(price)}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-widest text-peacock/70">You receive</p>
              <p className="font-display font-bold text-peacock text-lg">${price.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrganizerEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [ev, setEv]               = useState<EventData | null>(null);
  const [tiers, setTiers]         = useState<Tier[]>([]);
  const [userOrgs, setUserOrgs]   = useState<OrgOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState<"all" | null>(null);
  const [error, setError]         = useState("");
  const [uploading, setUploading] = useState(false);
  const [evDirty, setEvDirty]     = useState(false);
  const [showFinWarn, setShowFinWarn] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "tickets">("details");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: raw }, { data: orgsData }] = await Promise.all([
        supabase
          .from("events")
          .select(`
            id, title, category, artist, artist_id, description, navratri_nights,
            is_multi_day, start_date, end_date, start_time, end_time, doors_open_time,
            venue_name, address_line1, address_line2, city, state, zip,
            parking, parking_notes, website_url, cover_image_url, cover_gradient,
            dress_code, dress_code_details, dandiya_sticks, age_restriction,
            capacity, status, review_note, org_id
          `)
          .eq("id", id)
          .eq("organizer_id", user.id)
          .single(),
        supabase
          .from("organization_members")
          .select("organizations (id, name)")
          .eq("user_id", user.id),
      ]);

      if (!raw) { router.replace("/organizer/events"); return; }

      setUserOrgs(((orgsData ?? []) as unknown as { organizations: OrgOption }[])
        .map(r => r.organizations).filter(Boolean));

      setEv({
        ...raw,
        artist:             raw.artist ?? "",
        artist_id:          raw.artist_id ?? null,
        description:        raw.description ?? "",
        navratri_nights:    raw.navratri_nights ?? [],
        end_date:           raw.end_date ?? "",
        end_time:           raw.end_time ?? "",
        doors_open_time:    raw.doors_open_time ?? "",
        address_line2:      raw.address_line2 ?? "",
        zip:                raw.zip ?? "",
        parking_notes:      raw.parking_notes ?? "",
        website_url:        raw.website_url ?? "",
        cover_image_url:    raw.cover_image_url ?? "",
        dress_code_details: raw.dress_code_details ?? "",
        capacity:           raw.capacity ? String(raw.capacity) : "",
        org_id:             raw.org_id ?? null,
      } as EventData);

      const { data: tierData } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", id)
        .order("sort_order");

      setTiers(((tierData ?? []) as Omit<Tier, "_dirty">[]).map(t => ({
        ...t,
        description:     t.description ?? "",
        sale_start_date: t.sale_start_date ?? "",
        sale_end_date:   t.sale_end_date ?? "",
        _dirty: false,
      })));

      setLoading(false);
    }
    load();
  }, [id, router]);

  function patchEv(patch: Partial<EventData>) {
    setEv(prev => prev ? { ...prev, ...patch } : prev);
    setEvDirty(true);
    setSaved(null);
  }

  function toggleNight(n: number) {
    if (!ev) return;
    const nights = ev.navratri_nights.includes(n)
      ? ev.navratri_nights.filter(x => x !== n)
      : [...ev.navratri_nights, n].sort((a, b) => a - b);
    patchEv({ navratri_nights: nights });
  }

  function patchTier(idx: number, patch: Partial<Tier>) {
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, ...patch, _dirty: true } : t));
    setSaved(null);
  }

  function addTier() {
    if (tiers.length >= 6) return;
    setTiers(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: "", description: "", price: 0, quantity: 100,
      sale_start_date: "", sale_end_date: "",
      group_discount_min_qty: null, group_discount_type: null, group_discount_value: null,
      sort_order: prev.length,
      _dirty: true, _new: true,
    }]);
    setSaved(null);
  }

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `covers/${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      patchEv({ cover_image_url: data.publicUrl });
    } finally {
      setUploading(false);
    }
  }

  async function doSave() {
    if (!ev) return;
    setSaving(true);
    setError("");
    setShowFinWarn(false);

    try {
      const supabase = createClient();
      const dirtyTiers = tiers.filter(t => t._dirty);
      const promises: Promise<void>[] = [];

      if (evDirty) {
        promises.push((async () => {
          await supabase.from("events").update({
            title:              ev.title,
            category:           ev.category,
            description:        ev.description || null,
            navratri_nights:    ev.navratri_nights.length ? ev.navratri_nights : null,
            start_time:         ev.start_time || null,
            end_time:           ev.end_time || null,
            doors_open_time:    ev.doors_open_time || null,
            parking:            ev.parking,
            parking_notes:      ev.parking_notes || null,
            website_url:        ev.website_url || null,
            cover_image_url:    ev.cover_image_url || null,
            cover_gradient:     ev.cover_gradient,
            dress_code:         ev.dress_code,
            dress_code_details: ev.dress_code_details || null,
            dandiya_sticks:     ev.dandiya_sticks,
            age_restriction:    ev.age_restriction,
            capacity:           ev.capacity ? parseInt(ev.capacity) : null,
            org_id:             ev.org_id || null,
          }).eq("id", id);
        })());
      }

      for (const tier of dirtyTiers) {
        const payload = {
          event_id:               id,
          name:                   tier.name,
          description:            tier.description || null,
          price:                  tier.price,
          quantity:               tier.quantity,
          sale_start_date:        tier.sale_start_date || null,
          sale_end_date:          tier.sale_end_date || null,
          group_discount_min_qty: tier.group_discount_min_qty,
          group_discount_type:    tier.group_discount_type,
          group_discount_value:   tier.group_discount_value,
          sort_order:             tier.sort_order,
        };
        if (tier._new) {
          promises.push((async () => { await supabase.from("ticket_tiers").insert(payload); })());
        } else {
          promises.push((async () => { await supabase.from("ticket_tiers").update(payload).eq("id", tier.id); })());
        }
      }

      await Promise.all(promises);
      setEvDirty(false);
      setTiers(prev => prev.map(t => ({ ...t, _dirty: false, _new: false })));
      setSaved("all");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    const tiersDirty = tiers.some(t => t._dirty && !t._new);
    if (tiersDirty) { setShowFinWarn(true); return; }
    doSave();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!ev) return null;

  const gradient    = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
  const statusMeta  = STATUS_META[ev.status] ?? STATUS_META.draft;
  const anyDirty    = evDirty || tiers.some(t => t._dirty);
  const projRevenue = tiers.reduce((s, t) => s + t.price * t.quantity, 0);

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/organizer/events"
              className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              My Events
            </Link>
            <span className="text-ink-muted/40 text-xs">/</span>
            <Link href={`/organizer/events/${id}`}
              className="font-ui text-xs text-ink-muted hover:text-ink transition-colors truncate max-w-[180px]">
              {ev.title}
            </Link>
            <span className="text-ink-muted/40 text-xs">/</span>
            <span className="font-ui text-xs text-ink">Edit</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-ink text-xl truncate" style={{ letterSpacing: "-0.02em" }}>{ev.title}</h1>
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusMeta.pillCls}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/organizer/events/${id}`}
            className="flex items-center gap-2 font-ui font-semibold text-sm px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted hover:text-ink hover:border-aubergine/20 transition-all">
            ← Dashboard
          </Link>
          <button
            type="button" onClick={requestSave} disabled={saving || !anyDirty}
            className={`flex items-center gap-2 font-display font-bold text-sm px-6 py-2.5 rounded-xl transition-all shrink-0 ${
              saved === "all"
                ? "bg-peacock/10 text-peacock border border-peacock/20 cursor-default"
                : anyDirty
                  ? "bg-aubergine text-white hover:bg-aubergine-light shadow-sm active:scale-[0.98]"
                  : "bg-ivory text-ink-muted border border-ivory-200 cursor-not-allowed"
            }`}>
            {saving ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
            ) : saved === "all" ? (
              <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Saved</>
            ) : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`rounded-2xl border px-5 py-3.5 flex items-center gap-3 ${statusMeta.bannerCls}`}>
        <span className="text-lg shrink-0">{statusMeta.icon}</span>
        <p className="font-ui text-sm text-ink flex-1">{statusMeta.msg}</p>
        {ev.status === "rejected" && ev.review_note && (
          <div className="ml-2 pl-4 border-l border-durga/20">
            <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-0.5">Admin feedback</p>
            <p className="font-ui text-xs text-ink">{ev.review_note}</p>
          </div>
        )}
      </div>

      {/* ── Financial warning modal ── */}
      {showFinWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-marigold/15 border border-marigold/25 flex items-center justify-center mx-auto text-2xl">💡</div>
            <div className="text-center space-y-2">
              <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Ticket changes affect financials</p>
              <p className="font-ui text-sm text-ink-muted leading-relaxed">
                You&apos;re editing existing ticket tiers. Price or quantity changes update your revenue projections instantly — everything stays accurate.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowFinWarn(false)}
                className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">
                Cancel
              </button>
              <button onClick={doSave}
                className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors">
                Save anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-durga/10 border border-durga/20 px-4 py-3">
          <p className="font-ui text-sm text-durga">{error}</p>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 bg-ivory-200 rounded-2xl p-1 w-fit">
        {([
          { id: "details", label: "Event Details", icon: "🎉" },
          { id: "tickets", label: "Ticket Tiers", icon: "🎟️" },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-ui text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === "tickets" && tiers.some(t => t._dirty) && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-marigold shrink-0" />
            )}
            {tab.id === "details" && evDirty && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-marigold shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          DETAILS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "details" && (
        <div className="max-w-3xl space-y-4">

          {/* Basics */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">🎉</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Event Basics</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Event Title</label>
                <input type="text" value={ev.title} maxLength={100}
                  onChange={e => patchEv({ title: e.target.value })} className={inputCls} />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{ev.title.length}/100</p>
              </div>

              <div>
                <label className={labelCls}>Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => patchEv({ category: cat.id })}
                      className={`py-2.5 rounded-xl font-ui font-medium text-xs border-2 transition-all ${
                        ev.category === cat.id ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/30"
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={4} maxLength={1000} value={ev.description}
                  onChange={e => patchEv({ description: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder="Tell attendees what makes your event special…" />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{ev.description.length}/1000</p>
              </div>

              <div>
                <label className={labelCls}>Navratri Night(s)</label>
                <div className="flex flex-wrap gap-2">
                  {NIGHTS.map(n => (
                    <button key={n} type="button" onClick={() => toggleNight(n)}
                      className={`w-10 h-10 rounded-xl font-display font-bold text-sm border-2 transition-all ${
                        ev.navratri_nights.includes(n)
                          ? "border-marigold bg-marigold text-aubergine"
                          : "border-ivory-200 text-ink-muted hover:border-marigold/40 bg-white"
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <LockedField label="Artist / Performer" value={ev.artist || "Not specified"} />

              {userOrgs.length > 0 && (
                <div>
                  <label className={labelCls}>Organization</label>
                  <select
                    value={ev.org_id ?? ""}
                    onChange={e => patchEv({ org_id: e.target.value || null })}
                    className={inputCls}
                  >
                    <option value="">No organization attached</option>
                    {userOrgs.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 font-mono text-[9px] text-ink-muted/60">Link this event to your organization for co-management and reporting.</p>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">📅</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Schedule</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LockedField label="Start Date" value={fmtDate(ev.start_date)} />
                {ev.is_multi_day && <LockedField label="End Date" value={fmtDate(ev.end_date || null)} />}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Doors Open</label>
                  <input type="time" value={ev.doors_open_time}
                    onChange={e => patchEv({ doors_open_time: e.target.value })} className={inputCls} />
                  {ev.doors_open_time && <p className="mt-1 font-mono text-[9px] text-ink-muted/60">{fmt12(ev.doors_open_time)}</p>}
                </div>
                <div>
                  <label className={labelCls}>Start Time</label>
                  <input type="time" value={ev.start_time}
                    onChange={e => patchEv({ start_time: e.target.value })} className={inputCls} />
                  {ev.start_time && <p className="mt-1 font-mono text-[9px] text-ink-muted/60">{fmt12(ev.start_time)}</p>}
                </div>
                <div>
                  <label className={labelCls}>End Time</label>
                  <input type="time" value={ev.end_time}
                    onChange={e => patchEv({ end_time: e.target.value })} className={inputCls} />
                  {ev.end_time && <p className="mt-1 font-mono text-[9px] text-ink-muted/60">{fmt12(ev.end_time)}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Venue */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">📍</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Venue & Location</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LockedField label="Venue Name" value={ev.venue_name} />
                <LockedField label="Address" value={[ev.address_line1, ev.address_line2].filter(Boolean).join(", ")} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <LockedField label="City" value={ev.city} />
                <LockedField label="State" value={ev.state} />
                <LockedField label="ZIP" value={ev.zip} />
              </div>
              <div>
                <label className={labelCls}>Parking</label>
                <div className="grid grid-cols-3 gap-2">
                  {PARKING_OPTIONS.map(opt => (
                    <button key={opt.id} type="button" onClick={() => patchEv({ parking: opt.id })}
                      className={`py-2 rounded-xl font-ui text-xs font-medium border-2 transition-all ${
                        ev.parking === opt.id ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/25"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Parking Notes</label>
                <input type="text" placeholder="e.g. Use Lot B after 6 PM" value={ev.parking_notes}
                  onChange={e => patchEv({ parking_notes: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Website URL</label>
                <input type="url" placeholder="https://yourevent.com" value={ev.website_url}
                  onChange={e => patchEv({ website_url: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Cover & Style */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">🎨</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Cover & Style</p>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className={labelCls}>Cover Photo</label>
                <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3"
                  style={{ background: ev.cover_image_url ? undefined : gradient.css }}>
                  {ev.cover_image_url && (
                    <img src={ev.cover_image_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <p className="absolute bottom-3 left-4 font-display font-bold text-white text-lg leading-tight" style={{ letterSpacing: "-0.02em" }}>
                    {ev.title || "Your Event"}
                  </p>
                  {ev.cover_image_url && (
                    <button type="button" onClick={() => patchEv({ cover_image_url: "" })}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
                {!ev.cover_image_url && (
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-ivory-200 font-ui text-sm text-ink-muted hover:border-aubergine/40 hover:text-aubergine hover:bg-aubergine/5 transition-all flex items-center justify-center gap-2">
                    {uploading ? <><div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />Uploading…</> : "Upload cover photo"}
                  </button>
                )}
              </div>

              <div>
                <label className={labelCls}>Default Gradient</label>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENTS.map(g => (
                    <button key={g.id} type="button" onClick={() => patchEv({ cover_gradient: g.id })}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        ev.cover_gradient === g.id && !ev.cover_image_url ? "border-aubergine shadow-md scale-105" : "border-transparent hover:border-aubergine/40"
                      }`} title={g.name}>
                      <div className="absolute inset-0" style={{ background: g.css }} />
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <p className="font-mono text-[7px] text-white/70">{g.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Dress Code</label>
                  <div className="space-y-1.5">
                    {[["none","No requirement"],["encouraged","Traditional encouraged"],["required","Traditional required"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => patchEv({ dress_code: v })}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 font-ui text-xs transition-all ${ev.dress_code === v ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink hover:border-aubergine/25"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Dandiya Sticks</label>
                  <div className="space-y-1.5">
                    {[["not_applicable","Not applicable"],["provided","Provided"],["byod","Bring your own"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => patchEv({ dandiya_sticks: v })}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 font-ui text-xs transition-all ${ev.dandiya_sticks === v ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink hover:border-aubergine/25"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Age Restriction</label>
                  <div className="space-y-1.5">
                    {[["all","All ages"],["13+","13+"],["18+","18+ only"],["21+","21+ only"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => patchEv({ age_restriction: v })}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 font-ui text-xs transition-all ${ev.age_restriction === v ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink hover:border-aubergine/25"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Total Capacity</label>
                <input type="number" min="1" placeholder="Unlimited" value={ev.capacity}
                  onChange={e => patchEv({ capacity: e.target.value })}
                  className="w-36 rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all" />
              </div>
            </div>
          </div>

          {/* Mobile save */}
          {anyDirty && (
            <div className="sm:hidden">
              <button type="button" onClick={requestSave} disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
                {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save all changes"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TICKETS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div className="max-w-2xl space-y-4" id="tickets">

          {/* Panel header */}
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-ivory-200">
              <div>
                <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>🎟️ Ticket Tiers</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">
                  {tiers.length}/6 tiers · Projected gross{" "}
                  <span className="font-semibold text-ink">${projRevenue.toLocaleString()}</span>
                </p>
              </div>
              {tiers.length < 6 && (
                <button type="button" onClick={addTier}
                  className="flex items-center gap-1.5 bg-aubergine/8 text-aubergine border border-aubergine/20 hover:bg-aubergine/15 font-ui font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add tier
                </button>
              )}
            </div>

            <div className="px-5 py-3 bg-marigold/6 border-b border-marigold/15 flex gap-2.5">
              <span className="text-sm shrink-0">💡</span>
              <p className="font-ui text-xs text-ink-muted leading-relaxed">
                Price and quantity changes update revenue projections instantly. Tiers cannot be deleted to preserve sales history.
              </p>
            </div>

            {tiers.length === 0 && (
              <div className="p-8 text-center">
                <p className="font-display font-semibold text-ink text-sm mb-1">No ticket tiers yet</p>
                <p className="font-ui text-xs text-ink-muted mb-4">Add at least one tier for attendees to purchase.</p>
                <button type="button" onClick={addTier}
                  className="inline-flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-xs px-4 py-2 rounded-xl hover:bg-aubergine-light transition-colors">
                  Add first tier
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {tiers.map((tier, idx) => (
              <TierCard key={tier.id} tier={tier} idx={idx} onChange={patch => patchTier(idx, patch)} />
            ))}
          </div>

          {tiers.length > 0 && tiers.length < 6 && (
            <button type="button" onClick={addTier}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-ivory-200 font-ui font-medium text-sm text-ink-muted hover:border-aubergine/40 hover:text-aubergine hover:bg-aubergine/5 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add another tier
            </button>
          )}

          {anyDirty && (
            <button type="button" onClick={requestSave} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
              {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save ticket changes"}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
