"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventFormData, EventCategory } from "./types";

type OrgOption = { id: string; name: string; city: string | null; state: string | null };

type ArtistOption = { id: string; name: string; tagline: string | null; profile_image_url: string | null; is_featured: boolean; genres: string[] };

function ArtistPicker({ value, valueId, onChange }: {
  value: string;
  valueId: string;
  onChange: (name: string, id: string) => void;
}) {
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .from('artists')
      .select('id, name, tagline, profile_image_url, is_featured, genres')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name')
      .then(({ data }) => setArtists((data as ArtistOption[]) ?? []));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = artists.filter(a =>
    !query || a.name.toLowerCase().includes(query.toLowerCase())
  );
  const featured = filtered.filter(a => a.is_featured);
  const others   = filtered.filter(a => !a.is_featured);

  function select(a: ArtistOption) {
    onChange(a.name, a.id);
    setQuery(a.name);
    setOpen(false);
  }

  function clearSelection() {
    onChange('', '');
    setQuery('');
  }

  const selected = artists.find(a => a.id === valueId);

  return (
    <div ref={ref} className="relative">
      {selected ? (
        /* Selected state */
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-aubergine/30 bg-aubergine/5">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-aubergine text-white font-bold text-sm">
            {selected.profile_image_url
              ? <img src={selected.profile_image_url} alt={selected.name} className="w-full h-full object-cover" />
              : selected.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-ui font-semibold text-aubergine text-sm truncate">{selected.name}</p>
              {selected.is_featured && <span className="text-marigold text-xs">⭐</span>}
            </div>
            {selected.tagline && <p className="font-ui text-xs text-ink-muted truncate">{selected.tagline}</p>}
          </div>
          <button type="button" onClick={clearSelection} className="w-6 h-6 rounded-full hover:bg-aubergine/10 flex items-center justify-center text-ink-muted hover:text-durga transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <input
            type="text"
            placeholder="Search artists or type a name…"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); onChange(e.target.value, ''); setOpen(true); }}
            className="w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
          />
          <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-20 top-full mt-1.5 w-full bg-white rounded-2xl border border-ivory-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {artists.length === 0 ? (
            <p className="px-4 py-6 text-center font-ui text-sm text-ink-muted">No artists added yet — admins can add artists in the admin panel.</p>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-4">
              <p className="font-ui text-sm text-ink-muted">No match — <span className="text-aubergine font-medium">"{query}"</span> will be saved as a custom artist name.</p>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-marigold">⭐ Featured Artists</p>
                  </div>
                  {featured.map(a => <ArtistRow key={a.id} artist={a} onSelect={() => select(a)} />)}
                  {others.length > 0 && <div className="mx-4 border-t border-ivory-200 my-1" />}
                </>
              )}
              {others.length > 0 && (
                <>
                  {featured.length > 0 && (
                    <div className="px-4 pt-1.5 pb-1">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-ink-muted">All Artists</p>
                    </div>
                  )}
                  {others.map(a => <ArtistRow key={a.id} artist={a} onSelect={() => select(a)} />)}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ArtistRow({ artist, onSelect }: { artist: ArtistOption; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ivory transition-colors text-left">
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-aubergine text-white font-bold text-xs">
        {artist.profile_image_url
          ? <img src={artist.profile_image_url} alt={artist.name} className="w-full h-full object-cover" />
          : artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-ui font-medium text-ink text-sm truncate">{artist.name}</p>
          {artist.is_featured && <span className="text-marigold text-xs">⭐</span>}
        </div>
        {artist.tagline && <p className="font-ui text-xs text-ink-muted truncate">{artist.tagline}</p>}
      </div>
      {artist.genres.length > 0 && (
        <span className="font-mono text-[8px] uppercase tracking-widest bg-ivory px-2 py-0.5 rounded-full text-ink-muted shrink-0">
          {artist.genres[0]}
        </span>
      )}
    </button>
  );
}

const CATEGORIES: { id: EventCategory; label: string; emoji: string; desc: string }[] = [
  { id: 'garba',     label: 'Garba',     emoji: '🌀', desc: 'Traditional circular folk dance' },
  { id: 'dandiya',   label: 'Dandiya',   emoji: '🥢', desc: 'Stick dance & celebration' },
  { id: 'raas',      label: 'Raas',      emoji: '🏆', desc: 'Competitive collegiate raas' },
  { id: 'workshop',  label: 'Workshop',  emoji: '🎓', desc: 'Instruction & learning sessions' },
  { id: 'community', label: 'Community', emoji: '🤝', desc: 'Social & cultural gathering' },
  { id: 'other',     label: 'Other',     emoji: '✨', desc: 'Something unique' },
];

const NIGHTS = Array.from({ length: 9 }, (_, i) => i + 1);

type Props = {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
};

export default function Step1Basics({ data, onChange }: Props) {
  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2";

  const [myOrgs, setMyOrgs] = useState<OrgOption[]>([]);

  useEffect(() => {
    async function loadOrgs() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('organization_members')
        .select('org_id, organizations(id, name, city, state)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin', 'member']);
      if (!data) return;
      const orgs = data
        .map((m: unknown) => {
          const row = m as { organizations: OrgOption | OrgOption[] | null };
          const o = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
          return o ?? null;
        })
        .filter((o): o is OrgOption => o !== null);
      setMyOrgs(orgs);
    }
    loadOrgs();
  }, []);

  function toggleNight(n: number) {
    const nights = data.navratriNights.includes(n)
      ? data.navratriNights.filter(x => x !== n)
      : [...data.navratriNights, n].sort((a, b) => a - b);
    onChange({ navratriNights: nights });
  }

  return (
    <div className="space-y-7">
      {/* Title */}
      <div>
        <label className={labelCls}>Event Title *</label>
        <input
          type="text"
          placeholder="e.g. The Edison Garba — Navratri 2026"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          className={inputCls}
          maxLength={100}
        />
        <p className="mt-1.5 font-mono text-[10px] text-ink-muted/60 text-right">{data.title.length}/100</p>
      </div>

      {/* Category */}
      <div>
        <label className={labelCls}>Event Type *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange({ category: cat.id })}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                data.category === cat.id
                  ? 'border-aubergine bg-aubergine/5'
                  : 'border-ivory-200 hover:border-aubergine/30 bg-white'
              }`}
            >
              <span className="text-xl shrink-0">{cat.emoji}</span>
              <div>
                <p className={`font-ui font-semibold text-sm leading-tight ${data.category === cat.id ? 'text-aubergine' : 'text-ink'}`}>{cat.label}</p>
                <p className="font-ui text-[11px] text-ink-muted mt-0.5 leading-tight">{cat.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Artist */}
      <div>
        <label className={labelCls}>Featured Artist / Performer</label>
        <ArtistPicker
          value={data.artist}
          valueId={data.artistId}
          onChange={(name, id) => onChange({ artist: name, artistId: id })}
        />
        <p className="mt-1.5 font-mono text-[9px] text-ink-muted/60">Select from the Rameelo artist roster or type a custom name</p>
      </div>

      {/* Organization */}
      {myOrgs.length > 0 && (
        <div>
          <label className={labelCls}>Presenting Organization</label>
          <select
            value={data.orgId}
            onChange={e => onChange({ orgId: e.target.value })}
            className={inputCls}
          >
            <option value="">No organization (individual)</option>
            {myOrgs.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}{o.city ? ` — ${o.city}${o.state ? `, ${o.state}` : ''}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1.5 font-mono text-[9px] text-ink-muted/60">
            Linking an organization shows your org&apos;s profile on the event page
          </p>
          {data.orgId && myOrgs.find(o => o.id === data.orgId) && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-aubergine/5 border border-aubergine/15">
              <div className="w-6 h-6 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                {myOrgs.find(o => o.id === data.orgId)!.name.charAt(0)}
              </div>
              <p className="font-ui text-xs font-semibold text-aubergine">
                {myOrgs.find(o => o.id === data.orgId)!.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <label className={labelCls}>Event Description</label>
        <textarea
          placeholder="Tell attendees what makes your event special — the vibe, the venue, the experience…"
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={4}
          maxLength={1000}
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1.5 font-mono text-[10px] text-ink-muted/60 text-right">{data.description.length}/1000</p>
      </div>

      {/* Navratri Nights */}
      <div>
        <label className={labelCls}>Navratri Night(s)</label>
        <p className="font-ui text-xs text-ink-muted mb-3">Select the night(s) this event covers. Leave blank if not applicable.</p>
        <div className="flex flex-wrap gap-2">
          {NIGHTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => toggleNight(n)}
              className={`w-10 h-10 rounded-xl font-display font-bold text-sm border-2 transition-all ${
                data.navratriNights.includes(n)
                  ? 'border-marigold bg-marigold text-aubergine shadow-sm'
                  : 'border-ivory-200 text-ink-muted hover:border-marigold/40 bg-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {data.navratriNights.length > 0 && (
          <p className="mt-2 font-ui text-xs text-aubergine font-medium">
            Night{data.navratriNights.length > 1 ? 's' : ''} {data.navratriNights.join(', ')} selected
          </p>
        )}
      </div>
    </div>
  );
}
