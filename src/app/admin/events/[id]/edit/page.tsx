"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import ComboTicketsManager from "./ComboTicketsManager";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  quantity_sold?: number;
  sold_out: boolean;
  sale_start_date: string;
  sale_end_date: string;
  group_discount_mode: "simple" | "scaling" | null;
  group_discount_min_qty: number | null;
  group_discount_type: "percentage" | "fixed" | null;
  group_discount_value: number | null;
  group_discount_tiers: { min_qty: number; percent: number }[] | null;
  sort_order: number;
  _dirty: boolean;
  _new?: boolean;
};

type EventData = {
  id: string;
  title: string;
  category: string;
  artist: string;
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
  metro_city: string;
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
  selling_on_rameelo: boolean;
  featured_on_tour: boolean;
  featured_on_events: boolean;
  featured_on_artist: boolean;
  organizer_id: string | null;
  org_id: string | null;
};

type OrgOption = { id: string; name: string; city: string | null; state: string | null };
type ProfileOption = { id: string; first_name: string | null; last_name: string | null; email: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; pillCls: string }> = {
  draft:          { label: "Draft",     pillCls: "bg-ivory-200 text-ink-muted" },
  pending_review: { label: "In Review", pillCls: "bg-marigold/20 text-[#a06b00]" },
  published:      { label: "Published", pillCls: "bg-peacock/15 text-peacock" },
  rejected:       { label: "Rejected",  pillCls: "bg-durga/15 text-durga" },
  cancelled:      { label: "Cancelled", pillCls: "bg-ivory-200 text-ink-muted" },
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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const NIGHTS = Array.from({ length: 9 }, (_, i) => i + 1);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tier Card ────────────────────────────────────────────────────────────────

// Default percentage ladder when an admin first switches a tier to scaling.
const DEFAULT_SCALING: { min_qty: number; percent: number }[] = [
  { min_qty: 5, percent: 10 },
  { min_qty: 8, percent: 12 },
  { min_qty: 10, percent: 15 },
];

function TierCard({ tier, idx, onChange }: {
  tier: Tier; idx: number;
  onChange: (patch: Partial<Tier>) => void;
}) {
  const price = tier.price || 0;
  // Effective mode: explicit, else legacy rows with a min-qty are "simple".
  const mode: "none" | "simple" | "scaling" =
    tier.group_discount_mode === "scaling" ? "scaling"
    : tier.group_discount_mode === "simple" || tier.group_discount_min_qty != null ? "simple"
    : "none";
  const levels = tier.group_discount_tiers ?? [];

  function setMode(next: "none" | "simple" | "scaling") {
    if (next === "none") {
      onChange({ group_discount_mode: null, group_discount_min_qty: null, group_discount_type: null, group_discount_value: null, group_discount_tiers: null });
    } else if (next === "simple") {
      onChange({ group_discount_mode: "simple", group_discount_min_qty: tier.group_discount_min_qty ?? 4, group_discount_type: tier.group_discount_type ?? "percentage", group_discount_value: tier.group_discount_value ?? 10, group_discount_tiers: null });
    } else {
      onChange({ group_discount_mode: "scaling", group_discount_min_qty: null, group_discount_type: null, group_discount_value: null, group_discount_tiers: levels.length ? levels : DEFAULT_SCALING });
    }
  }
  function updateLevel(i: number, patch: Partial<{ min_qty: number; percent: number }>) {
    onChange({ group_discount_tiers: levels.map((l, j) => j === i ? { ...l, ...patch } : l) });
  }
  function addLevel() {
    const lastQty = levels.length ? levels[levels.length - 1].min_qty : 4;
    onChange({ group_discount_tiers: [...levels, { min_qty: lastQty + 2, percent: 15 }] });
  }
  function removeLevel(i: number) {
    onChange({ group_discount_tiers: levels.filter((_, j) => j !== i) });
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${tier._dirty ? "border-aubergine/35 shadow-sm" : "border-ivory-200"}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 bg-ivory border-b border-ivory-200">
        <div className="w-6 h-6 rounded-full bg-aubergine/10 border border-aubergine/20 flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-aubergine text-[10px]">{idx + 1}</span>
        </div>
        <p className="font-display font-semibold text-ink text-sm flex-1 truncate" style={{ letterSpacing: "-0.01em" }}>
          {tier.name || `Tier ${idx + 1}`}
        </p>
        {tier.sold_out && (
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest bg-ink text-white px-1.5 py-0.5 rounded-full shrink-0">Sold Out</span>
        )}
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
            <label className={labelCls}>Tickets Available</label>
            <input type="number" min="1" placeholder="500"
              value={tier.quantity || ""}
              onChange={e => onChange({ quantity: parseInt(e.target.value) || 1 })}
              className={inputCls} />
          </div>
        </div>

        {/* ── Force sold out ──
            Closes the tier for purchase regardless of inventory and shows a
            "Sold Out" treatment on the public event page (FOMO driver). */}
        <div className={`rounded-xl border p-3 transition-colors ${tier.sold_out ? "bg-ink/[0.04] border-ink/20" : "bg-ivory/60 border-ivory-200"}`}>
          <ToggleRow
            title="Mark as sold out"
            desc={
              tier.sold_out
                ? `Closed — buyers see “Sold Out.” ${typeof tier.quantity_sold === "number" ? `${tier.quantity_sold} of ${tier.quantity} sold.` : ""}`.trim()
                : "Force this tier closed no matter how many are sold. Surfaces a “Sold Out” badge on the event page to drive urgency."
            }
            checked={tier.sold_out}
            onChange={v => onChange({ sold_out: v })}
          />
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

        {/* ── Group discount ── */}
        <div className="rounded-xl bg-peacock/5 border border-peacock/15 p-3 space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-peacock">Group Discount</p>
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {([["none", "None"], ["simple", "Flat rate"], ["scaling", "Scaling"]] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`py-2 rounded-lg border-2 font-ui font-semibold text-xs transition-all ${mode === m ? "border-peacock bg-peacock/10 text-peacock" : "border-ivory-200 text-ink-muted hover:border-peacock/30"}`}>
                {label}
              </button>
            ))}
          </div>

          {mode === "simple" && (
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
          )}

          {mode === "scaling" && (
            <div className="space-y-2">
              <p className="font-ui text-[11px] text-ink-muted">Percentage-only. The highest level the group reaches applies.</p>
              {levels.map((lvl, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Min qty</label>
                    <input type="number" min="2" value={lvl.min_qty || ""}
                      onChange={e => updateLevel(i, { min_qty: parseInt(e.target.value) || 0 })}
                      className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>% off</label>
                    <input type="number" min="0" max="100" value={lvl.percent || ""}
                      onChange={e => updateLevel(i, { percent: parseInt(e.target.value) || 0 })}
                      className={inputCls} />
                  </div>
                  <button type="button" onClick={() => removeLevel(i)}
                    className="mb-0.5 w-9 h-9 rounded-lg border border-ivory-200 flex items-center justify-center text-durga hover:bg-durga/5 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLevel}
                className="w-full py-2 rounded-lg border border-dashed border-peacock/40 font-ui text-xs text-peacock hover:bg-peacock/5 transition-all">
                + Add level
              </button>
            </div>
          )}
        </div>

        {price > 0 && (
          <div className="rounded-xl bg-aubergine/5 border border-aubergine/12 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-aubergine/50">Face value</p>
              <p className="font-display font-bold text-aubergine text-lg">${price.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{tier.quantity.toLocaleString()} tickets</p>
              <p className="font-display font-bold text-peacock text-lg">
                ${(price * tier.quantity).toLocaleString()}
              </p>
              <p className="font-mono text-[9px] text-ink-muted">projected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({ title, desc, checked, onChange }: {
  title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left group">
      <span className={`mt-0.5 shrink-0 w-10 h-6 rounded-full transition-colors relative ${checked ? "bg-peacock" : "bg-ivory-200"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-ui text-sm font-semibold text-ink">{title}</span>
        <span className="block font-ui text-xs text-ink-muted leading-relaxed mt-0.5">{desc}</span>
      </span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ActiveTab = "details" | "schedule" | "venue" | "cover" | "tickets";

const VALID_TABS: ActiveTab[] = ["details", "schedule", "venue", "cover", "tickets"];

export default function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [ev, setEv]             = useState<EventData | null>(null);
  const [tiers, setTiers]       = useState<Tier[]>([]);
  const [orgs, setOrgs]         = useState<OrgOption[]>([]);
  const [organizers, setOrganizers] = useState<ProfileOption[]>([]);
  const [orgSearch, setOrgSearch]   = useState("");
  const [orgSearch2, setOrgSearch2] = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<"all" | null>(null);
  const [error, setError]       = useState("");
  const [uploading, setUploading] = useState(false);
  const [evDirty, setEvDirty]   = useState(false);
  const tabParam = searchParams.get("tab") as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam && VALID_TABS.includes(tabParam) ? tabParam : "details");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: raw }, { data: orgsData }, { data: profilesData }] = await Promise.all([
        supabase
          .from("events")
          .select(`
            id, title, category, artist, description, navratri_nights,
            is_multi_day, start_date, end_date, start_time, end_time, doors_open_time,
            venue_name, address_line1, address_line2, city, state, zip, metro_city,
            parking, parking_notes, website_url, cover_image_url, cover_gradient,
            dress_code, dress_code_details, dandiya_sticks, age_restriction,
            capacity, status, selling_on_rameelo, featured_on_tour, featured_on_events, featured_on_artist, organizer_id, org_id
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("organizations")
          .select("id, name, city, state")
          .order("name"),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("role", "organizer")
          .order("first_name"),
      ]);

      if (!raw) { router.replace("/admin/events"); return; }

      setOrgs((orgsData ?? []) as OrgOption[]);
      setOrganizers((profilesData ?? []) as ProfileOption[]);

      setEv({
        ...raw,
        artist:             raw.artist ?? "",
        description:        raw.description ?? "",
        navratri_nights:    raw.navratri_nights ?? [],
        end_date:           raw.end_date ?? "",
        end_time:           raw.end_time ?? "",
        doors_open_time:    raw.doors_open_time ?? "",
        venue_name:         raw.venue_name ?? "",
        address_line1:      raw.address_line1 ?? "",
        address_line2:      raw.address_line2 ?? "",
        city:               raw.city ?? "",
        state:              raw.state ?? "",
        zip:                raw.zip ?? "",
        metro_city:         raw.metro_city ?? "",
        parking:            raw.parking ?? "none",
        parking_notes:      raw.parking_notes ?? "",
        website_url:        raw.website_url ?? "",
        cover_image_url:    raw.cover_image_url ?? "",
        cover_gradient:     raw.cover_gradient ?? "aubergine",
        dress_code:         raw.dress_code ?? "none",
        dress_code_details: raw.dress_code_details ?? "",
        dandiya_sticks:     raw.dandiya_sticks ?? "not_applicable",
        age_restriction:    raw.age_restriction ?? "all",
        capacity:           raw.capacity ? String(raw.capacity) : "",
        organizer_id:       raw.organizer_id ?? null,
        org_id:             raw.org_id ?? null,
      } as EventData);

      const { data: tierData } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", id)
        .order("sort_order");

      setTiers(((tierData ?? []) as Omit<Tier, "_dirty">[]).map(t => ({
        ...t,
        description:     (t as unknown as Record<string, string>).description ?? "",
        sale_start_date: (t as unknown as Record<string, string>).sale_start_date ?? "",
        sale_end_date:   (t as unknown as Record<string, string>).sale_end_date ?? "",
        sold_out:        (t as unknown as Record<string, boolean>).sold_out ?? false,
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
      name: "", description: "", price: 0, quantity: 100, sold_out: false,
      sale_start_date: "", sale_end_date: "",
      group_discount_mode: null, group_discount_min_qty: null, group_discount_type: null, group_discount_value: null, group_discount_tiers: null,
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
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
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

    try {
      const supabase = createClient();
      const promises: Promise<void>[] = [];

      if (evDirty) {
        promises.push((async () => {
          const { error: evErr } = await supabase.from("events").update({
            title:              ev.title,
            category:           ev.category,
            artist:             ev.artist || null,
            description:        ev.description || null,
            navratri_nights:    ev.navratri_nights.length ? ev.navratri_nights : null,
            is_multi_day:       ev.is_multi_day,
            start_date:         ev.start_date || null,
            end_date:           ev.is_multi_day ? (ev.end_date || null) : null,
            start_time:         ev.start_time || null,
            end_time:           ev.end_time || null,
            doors_open_time:    ev.doors_open_time || null,
            venue_name:         ev.venue_name || null,
            address_line1:      ev.address_line1 || null,
            address_line2:      ev.address_line2 || null,
            city:               ev.city || null,
            state:              ev.state || null,
            zip:                ev.zip || null,
            metro_city:         ev.metro_city.trim() || null,
            parking:            ev.parking || null,
            parking_notes:      ev.parking_notes || null,
            website_url:        ev.website_url || null,
            cover_image_url:    ev.cover_image_url || null,
            cover_gradient:     ev.cover_gradient,
            dress_code:         ev.dress_code,
            dress_code_details: ev.dress_code_details || null,
            dandiya_sticks:     ev.dandiya_sticks,
            age_restriction:    ev.age_restriction,
            capacity:           ev.capacity ? parseInt(ev.capacity) : null,
            selling_on_rameelo: ev.selling_on_rameelo,
            featured_on_tour:   ev.featured_on_tour,
            featured_on_events: ev.featured_on_events,
            featured_on_artist: ev.featured_on_artist,
            organizer_id:       ev.organizer_id || null,
            org_id:             ev.org_id || null,
          }).eq("id", id);
          if (evErr) throw evErr;
        })());
      }

      for (const tier of tiers.filter(t => t._dirty)) {
        const payload = {
          event_id:               id,
          name:                   tier.name,
          description:            tier.description || null,
          price:                  tier.price,
          quantity:               tier.quantity,
          sold_out:               tier.sold_out,
          sale_start_date:        tier.sale_start_date || null,
          sale_end_date:          tier.sale_end_date || null,
          group_discount_mode:    tier.group_discount_mode,
          group_discount_min_qty: tier.group_discount_min_qty,
          group_discount_type:    tier.group_discount_type,
          group_discount_value:   tier.group_discount_value,
          group_discount_tiers:   tier.group_discount_mode === "scaling" ? (tier.group_discount_tiers ?? []) : null,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!ev) return null;

  const gradient   = GRADIENTS.find(g => g.id === ev.cover_gradient) ?? GRADIENTS[0];
  const statusMeta = STATUS_META[ev.status] ?? STATUS_META.draft;
  const anyDirty   = evDirty || tiers.some(t => t._dirty);
  const projRevenue = tiers.reduce((s, t) => s + t.price * t.quantity, 0);

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: "details",  label: "Details",       icon: "🎉" },
    { id: "schedule", label: "Schedule",       icon: "📅" },
    { id: "venue",    label: "Venue",          icon: "📍" },
    { id: "cover",    label: "Cover & Style",  icon: "🎨" },
    { id: "tickets",  label: "Tickets",        icon: "🎟️" },
  ];

  const tabHasDot: Record<ActiveTab, boolean> = {
    details:  evDirty,
    schedule: evDirty,
    venue:    evDirty,
    cover:    evDirty,
    tickets:  tiers.some(t => t._dirty),
  };

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/admin/events"
              className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Event Review
            </Link>
            <span className="text-ink-muted/40 text-xs">/</span>
            <Link href={`/admin/events/${id}`}
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
            <span className="font-mono text-[8px] bg-durga/10 text-durga px-2 py-0.5 rounded-full shrink-0">Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/admin/events/${id}`}
            className="flex items-center gap-2 font-ui font-semibold text-sm px-4 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted hover:text-ink hover:border-aubergine/20 transition-all">
            ← Review page
          </Link>
          <button
            type="button" onClick={doSave} disabled={saving || !anyDirty}
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

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-durga/10 border border-durga/20 px-4 py-3">
          <p className="font-ui text-sm text-durga">{error}</p>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 bg-ivory-200 rounded-2xl p-1 w-fit overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-ui text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tabHasDot[tab.id] && (
              <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-marigold shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          DETAILS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "details" && (
        <div className="max-w-3xl space-y-4">

          {/* Organizer assignment */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">👤</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Organizer</p>
              <span className="ml-auto font-mono text-[8px] bg-durga/10 text-durga px-2 py-0.5 rounded-full">Admin only</span>
            </div>
            <div className="p-5 space-y-4">

              {/* Individual organizer */}
              <div>
                <label className={labelCls}>Individual Organizer</label>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  className={inputCls}
                />
                {(() => {
                  const q = orgSearch.trim().toLowerCase();
                  const current = organizers.find(p => p.id === ev.organizer_id);
                  const filtered = q
                    ? organizers.filter(p =>
                        [p.first_name, p.last_name, p.email].join(" ").toLowerCase().includes(q)
                      ).slice(0, 6)
                    : [];
                  return (
                    <>
                      {current && (
                        <div className="mt-2 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/20">
                          <div className="w-8 h-8 rounded-full bg-aubergine flex items-center justify-center text-white font-display font-bold text-xs shrink-0">
                            {(current.first_name?.[0] ?? "") + (current.last_name?.[0] ?? "") || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-ui text-sm font-semibold text-ink truncate">
                              {[current.first_name, current.last_name].filter(Boolean).join(" ") || "—"}
                            </p>
                            <p className="font-mono text-[10px] text-ink-muted truncate">{current.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { patchEv({ organizer_id: null }); setOrgSearch(""); }}
                            className="font-ui text-xs text-durga hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {!current && (
                        <p className="mt-1.5 font-mono text-[9px] text-ink-muted/60">No organizer assigned.</p>
                      )}
                      {filtered.length > 0 && (
                        <div className="mt-1 rounded-xl border border-ivory-200 overflow-hidden divide-y divide-ivory-200 shadow-sm">
                          {filtered.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { patchEv({ organizer_id: p.id }); setOrgSearch(""); }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-ivory/60 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-aubergine/20 flex items-center justify-center text-aubergine font-display font-bold text-[10px] shrink-0">
                                {(p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "") || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-ui text-sm text-ink truncate">
                                  {[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
                                </p>
                                <p className="font-mono text-[10px] text-ink-muted truncate">{p.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Organization */}
              <div>
                <label className={labelCls}>Organization</label>
                <input
                  type="text"
                  placeholder="Search organizations…"
                  value={orgSearch2}
                  onChange={e => setOrgSearch2(e.target.value)}
                  className={inputCls}
                />
                {(() => {
                  const q = orgSearch2.trim().toLowerCase();
                  const current = orgs.find(o => o.id === ev.org_id);
                  const filtered = q
                    ? orgs.filter(o => o.name.toLowerCase().includes(q)).slice(0, 6)
                    : [];
                  return (
                    <>
                      {current && (
                        <div className="mt-2 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-peacock/5 border border-peacock/20">
                          <div className="w-8 h-8 rounded-full bg-peacock/20 flex items-center justify-center text-peacock font-display font-bold text-xs shrink-0">
                            {current.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-ui text-sm font-semibold text-ink truncate">{current.name}</p>
                            {(current.city || current.state) && (
                              <p className="font-mono text-[10px] text-ink-muted truncate">
                                {[current.city, current.state].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => { patchEv({ org_id: null }); setOrgSearch2(""); }}
                            className="font-ui text-xs text-durga hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {!current && (
                        <p className="mt-1.5 font-mono text-[9px] text-ink-muted/60">No organization linked.</p>
                      )}
                      {filtered.length > 0 && (
                        <div className="mt-1 rounded-xl border border-ivory-200 overflow-hidden divide-y divide-ivory-200 shadow-sm">
                          {filtered.map(o => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => { patchEv({ org_id: o.id }); setOrgSearch2(""); }}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-ivory/60 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-peacock/15 flex items-center justify-center text-peacock font-display font-bold text-[10px] shrink-0">
                                {o.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-ui text-sm text-ink truncate">{o.name}</p>
                                {(o.city || o.state) && (
                                  <p className="font-mono text-[10px] text-ink-muted truncate">
                                    {[o.city, o.state].filter(Boolean).join(", ")}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Ticketing & promotion */}
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">🎟️</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Ticketing &amp; Promotion</p>
              <span className="ml-auto font-mono text-[8px] bg-durga/10 text-durga px-2 py-0.5 rounded-full">Admin only</span>
            </div>
            <div className="p-5 space-y-3">
              <ToggleRow
                title="Sell tickets on Rameelo"
                desc="Attendees buy tickets directly here. Turn off to list the event for interest/discovery only (no checkout)."
                checked={ev.selling_on_rameelo}
                onChange={v => patchEv({ selling_on_rameelo: v })}
              />
              <div className="h-px bg-ivory-200" />
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Featured placement</p>
              <ToggleRow
                title="Feature on the tour page"
                desc="Highlight this event in the homepage “Featured this Navratri” showcase."
                checked={ev.featured_on_tour}
                onChange={v => patchEv({ featured_on_tour: v })}
              />
              <ToggleRow
                title="Feature on the events list"
                desc="Pin this event to the top of the public Events page with a Featured badge."
                checked={ev.featured_on_events}
                onChange={v => patchEv({ featured_on_events: v })}
              />
              <ToggleRow
                title="Feature on the artist page"
                desc="Pin this event to the top of the artist's tour list on their detail page, with a Featured badge."
                checked={ev.featured_on_artist}
                onChange={v => patchEv({ featured_on_artist: v })}
              />
            </div>
          </div>

          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">🎉</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Event Details</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Event Title *</label>
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
                <label className={labelCls}>Artist / Performer</label>
                <input type="text" placeholder="e.g. DJ Suketu" value={ev.artist}
                  onChange={e => patchEv({ artist: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={5} maxLength={1000} value={ev.description}
                  onChange={e => patchEv({ description: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder="Tell attendees what makes this event special…" />
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
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SCHEDULE TAB
      ══════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <div className="max-w-3xl">
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">📅</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Schedule</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Event type</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: false, label: "Single day" },
                    { value: true,  label: "Multi-day" },
                  ] as const).map(opt => (
                    <button key={String(opt.value)} type="button" onClick={() => patchEv({ is_multi_day: opt.value })}
                      className={`py-2.5 rounded-xl font-ui font-medium text-sm border-2 transition-all ${
                        ev.is_multi_day === opt.value ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/30"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`grid gap-4 ${ev.is_multi_day ? "grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
                <div>
                  <label className={labelCls}>Start Date *</label>
                  <input type="date" value={ev.start_date}
                    onChange={e => patchEv({ start_date: e.target.value })} className={inputCls} />
                </div>
                {ev.is_multi_day && (
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="date" value={ev.end_date}
                      onChange={e => patchEv({ end_date: e.target.value })} className={inputCls} />
                  </div>
                )}
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          VENUE TAB
      ══════════════════════════════════════════ */}
      {activeTab === "venue" && (
        <div className="max-w-3xl space-y-4">
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">📍</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Venue & Location</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Venue Name</label>
                <input type="text" placeholder="e.g. Georgia World Congress Center" value={ev.venue_name}
                  onChange={e => patchEv({ venue_name: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Address Line 1</label>
                <input type="text" placeholder="123 Main Street" value={ev.address_line1}
                  onChange={e => patchEv({ address_line1: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Address Line 2</label>
                <input type="text" placeholder="Suite 400" value={ev.address_line2}
                  onChange={e => patchEv({ address_line2: e.target.value })} className={inputCls} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>City</label>
                  <input type="text" placeholder="Atlanta" value={ev.city}
                    onChange={e => patchEv({ city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <select value={ev.state} onChange={e => patchEv({ state: e.target.value })}
                    className={`${inputCls} cursor-pointer`}>
                    <option value="">Select…</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>ZIP</label>
                  <input type="text" placeholder="30313" maxLength={10} value={ev.zip}
                    onChange={e => patchEv({ zip: e.target.value })} className={inputCls} />
                </div>
              </div>

              {/* Major metro — featured prominently on the event page */}
              <div>
                <label className={labelCls}>Major Metro Area</label>
                <input type="text" placeholder="Los Angeles" value={ev.metro_city}
                  onChange={e => patchEv({ metro_city: e.target.value })} className={inputCls} />
                <p className="font-ui text-xs text-ink-muted/70 mt-1.5">The nearest big-city metro (e.g. <span className="font-semibold text-ink-muted">Los Angeles</span> for an Irvine venue). Shown as a standout sticker on the event page.</p>
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          COVER & STYLE TAB
      ══════════════════════════════════════════ */}
      {activeTab === "cover" && (
        <div className="max-w-3xl space-y-4">
          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">🎨</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Cover Photo</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl bg-aubergine/5 border border-aubergine/15 px-3.5 py-3">
                <svg className="w-4 h-4 text-aubergine shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="font-ui text-xs text-ink-muted leading-relaxed">
                  <span className="font-semibold text-ink">Recommended: 1600 × 900 px (16:9 landscape), JPG or PNG under 8 MB.</span> The cover fills the event hero edge-to-edge. Keep faces and key visuals <span className="font-medium text-ink">centered or slightly right</span>, and leave the left side and outer edges clear — the title &amp; details overlay the left on desktop, and the sides crop on mobile.
                </div>
              </div>
              <div className="relative w-full h-44 rounded-2xl overflow-hidden"
                style={{ background: ev.cover_image_url ? undefined : gradient.css }}>
                {ev.cover_image_url && (
                  <img src={ev.cover_image_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-4 left-5 font-display font-bold text-white text-2xl leading-tight"
                  style={{ letterSpacing: "-0.02em" }}>
                  {ev.title || "Event Title"}
                </p>
                {ev.cover_image_url && (
                  <button type="button" onClick={() => patchEv({ cover_image_url: "" })}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
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

              <div>
                <label className={labelCls}>Gradient (shown when no photo)</label>
                <div className="grid grid-cols-6 gap-2">
                  {GRADIENTS.map(g => (
                    <button key={g.id} type="button" onClick={() => patchEv({ cover_gradient: g.id })}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        ev.cover_gradient === g.id ? "border-aubergine shadow-md scale-105" : "border-transparent hover:border-aubergine/40"
                      }`} title={g.name}>
                      <div className="absolute inset-0" style={{ background: g.css }} />
                      <div className="absolute bottom-1 left-0 right-0 text-center">
                        <p className="font-mono text-[7px] text-white/70">{g.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <div className={sectionHead}>
              <span className="text-base">✨</span>
              <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Event Style</p>
            </div>
            <div className="p-5 space-y-4">
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
                  className="w-40 rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TICKETS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div className="max-w-2xl space-y-4">
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
            <button type="button" onClick={doSave} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
              {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : "Save ticket changes"}
            </button>
          )}

          {/* Combo tickets — org-spanning bundles (saved independently of the tiers above) */}
          <ComboTicketsManager eventId={id} orgId={ev.org_id} />
        </div>
      )}

    </div>
  );
}
