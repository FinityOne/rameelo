"use client";

import { useState, useEffect, useRef } from "react";
import type { EventFormData, ParkingOption } from "./types";
import { GRADIENT_BY_STATE } from "./types";

type NominatimResult = {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
};

const PARKING_OPTIONS: { id: ParkingOption; label: string; icon: string }[] = [
  { id: 'free',        label: 'Free parking',       icon: '🅿️' },
  { id: 'paid_nearby', label: 'Paid parking nearby', icon: '💳' },
  { id: 'street',      label: 'Street parking',      icon: '🚗' },
  { id: 'valet',       label: 'Valet available',     icon: '🤵' },
  { id: 'limited',     label: 'Limited parking',     icon: '⚠️' },
  { id: 'none',        label: 'No parking info',     icon: '❓' },
];

type Props = {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
};

export default function Step3Venue({ data, onChange }: Props) {
  const [query, setQuery] = useState(data.addressLine1);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 5) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=us&limit=6`,
          { headers: { 'User-Agent': 'Rameelo/1.0 (heran@finityone.com)' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch { /* network error — silent */ }
      finally { setSearching(false); }
    }, 500);
  }, [query]);

  function selectSuggestion(r: NominatimResult) {
    const a = r.address;
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || '';
    const state = a.state ? stateAbbr(a.state) : '';
    const zip = a.postcode || '';

    setQuery(street);
    setShowSuggestions(false);
    onChange({
      addressLine1: street,
      city,
      state,
      zip,
      // auto-suggest a gradient if we haven't uploaded an image
      coverGradient: GRADIENT_BY_STATE[state] ?? 'aubergine',
    });
  }

  return (
    <div className="space-y-7">
      <p className="font-mono text-[10px] text-ink-muted tracking-wide">
        City and state are required. Venue name and street address are optional — fill in what you have.
      </p>
      {/* Venue name */}
      <div>
        <label className={labelCls}>Venue Name <span className="normal-case text-ink-muted/50">(optional)</span></label>
        <input
          type="text"
          placeholder="e.g. NJ Convention & Exposition Center"
          value={data.venueName}
          onChange={e => onChange({ venueName: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Address autocomplete */}
      <div ref={wrapperRef} className="relative">
        <label className={labelCls}>Street Address <span className="normal-case text-ink-muted/50">(optional)</span></label>
        <div className="relative">
          <input
            type="text"
            placeholder="Start typing an address…"
            value={query}
            onChange={e => { setQuery(e.target.value); onChange({ addressLine1: e.target.value }); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className={inputCls}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-aubergine animate-spin" />
            </div>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-ink-muted/60">Powered by OpenStreetMap — city, state, and ZIP fill automatically</p>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl border border-ivory-200 shadow-xl overflow-hidden">
            {suggestions.map(r => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectSuggestion(r)}
                className="w-full text-left px-4 py-3 hover:bg-ivory transition-colors border-b border-ivory-200 last:border-0"
              >
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-ui text-sm text-ink leading-snug line-clamp-2">{r.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Address line 2 */}
      <div>
        <label className={labelCls}>Suite / Floor / Unit</label>
        <input
          type="text"
          placeholder="e.g. Hall B, Floor 3"
          value={data.addressLine2}
          onChange={e => onChange({ addressLine2: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>City *</label>
          <input type="text" value={data.city} onChange={e => onChange({ city: e.target.value })} className={inputCls} placeholder="Edison" />
        </div>
        <div>
          <label className={labelCls}>State *</label>
          <input type="text" value={data.state} onChange={e => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })} className={inputCls} placeholder="NJ" maxLength={2} />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input type="text" value={data.zip} onChange={e => onChange({ zip: e.target.value })} className={inputCls} placeholder="08817" maxLength={10} />
        </div>
      </div>

      {/* Major metro — featured on the event page so buyers recognize the region */}
      <div>
        <label className={labelCls}>Major Metro Area <span className="normal-case text-ink-muted/50">(optional)</span></label>
        <input type="text" value={data.metroCity} onChange={e => onChange({ metroCity: e.target.value })} className={inputCls} placeholder="Los Angeles" />
        <p className="font-ui text-xs text-ink-muted/70 mt-1.5">The nearest big-city metro (e.g. enter <span className="font-semibold text-ink-muted">Los Angeles</span> for an Irvine venue). Featured prominently on the event page.</p>
      </div>

      {/* Parking */}
      <div>
        <label className={labelCls}>Parking</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PARKING_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ parking: opt.id })}
              className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${
                data.parking === opt.id
                  ? 'border-aubergine bg-aubergine/5'
                  : 'border-ivory-200 hover:border-aubergine/25 bg-white'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              <span className={`font-ui text-xs font-medium ${data.parking === opt.id ? 'text-aubergine' : 'text-ink'}`}>{opt.label}</span>
            </button>
          ))}
        </div>
        {data.parking !== 'none' && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Add parking notes (optional)"
              value={data.parkingNotes}
              onChange={e => onChange({ parkingNotes: e.target.value })}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Website */}
      <div>
        <label className={labelCls}>Event Website</label>
        <input
          type="url"
          placeholder="https://yourevent.com"
          value={data.websiteUrl}
          onChange={e => onChange({ websiteUrl: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  );
}

const STATE_MAP: Record<string, string> = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC',
};
function stateAbbr(full: string) {
  return STATE_MAP[full] ?? full.slice(0, 2).toUpperCase();
}
