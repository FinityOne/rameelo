"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Artist = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  bio_long: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  video_urls: string[];
  press_kit_url: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  hometown_country: string;
  based_in: string | null;
  genres: string[];
  performance_style: string | null;
  instruments: string[];
  years_active_since: number | null;
  follower_count: number | null;
  monthly_listeners: number | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  booking_email: string | null;
  booking_phone: string | null;
  management_name: string | null;
  management_email: string | null;
  notable_events: string | null;
  awards: string | null;
  is_featured: boolean;
  is_active: boolean;
  verified: boolean;
  custom_domain: string | null;
  created_at: string;
};

const EMPTY_ARTIST: Omit<Artist, 'id' | 'created_at'> = {
  name: '', slug: '', tagline: '', bio: '', bio_long: '',
  profile_image_url: '', cover_image_url: '', gallery_image_urls: [], video_urls: [],
  press_kit_url: '', hometown_city: '', hometown_state: '', hometown_country: 'USA',
  based_in: '', genres: [], performance_style: null, instruments: [],
  years_active_since: null, follower_count: null, monthly_listeners: null,
  website_url: '', instagram_url: '', youtube_url: '',
  spotify_url: '', apple_music_url: '', facebook_url: '', tiktok_url: '',
  booking_email: '', booking_phone: '', management_name: '', management_email: '',
  notable_events: '', awards: '',
  is_featured: false, is_active: true, verified: false, custom_domain: null,
};

const GENRE_OPTIONS = ['Garba', 'Dandiya', 'Raas', 'Folk', 'Fusion', 'Bollywood', 'Sufi', 'Classical', 'Pop', 'Workshop'];
const INSTRUMENT_OPTIONS = ['Vocals', 'Dhol', 'Tabla', 'Harmonium', 'Flute', 'Keyboard', 'Guitar', 'Bass', 'Percussion', 'Trumpet'];
const PERF_STYLES = ['solo', 'duo', 'group', 'band'] as const;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function AvatarCircle({ artist, size = 48 }: { artist: Partial<Artist>; size?: number }) {
  const initials = (artist.name ?? '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (artist.profile_image_url) {
    return <img src={artist.profile_image_url} alt={artist.name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-aubergine flex items-center justify-center shrink-0 text-white font-display font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

type PanelProps = {
  artist: Partial<Artist> | null;
  onClose: () => void;
  onSave: () => void;
};

function ArtistPanel({ artist, onClose, onSave }: PanelProps) {
  const [form, setForm] = useState<Omit<Artist, 'id' | 'created_at'>>(
    artist ? { ...EMPTY_ARTIST, ...artist } : { ...EMPTY_ARTIST }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'identity' | 'media' | 'performance' | 'socials' | 'booking' | 'recognition'>('identity');
  const [profileUploading, setProfileUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!(artist as Artist)?.id;

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5";

  function patch(p: Partial<typeof form>) {
    setForm(prev => ({ ...prev, ...p }));
  }

  function toggleArray(key: 'genres' | 'instruments', val: string) {
    const arr = form[key] as string[];
    patch({ [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
  }

  async function uploadImage(file: File, field: 'profile_image_url' | 'cover_image_url') {
    const setUploading = field === 'profile_image_url' ? setProfileUploading : setCoverUploading;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `artists/${Date.now()}_${field}.${ext}`;
      const { error } = await supabase.storage.from('event-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      patch({ [field]: data.publicUrl });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Artist name is required.'); return; }
    if (!form.slug.trim()) { setError('Slug is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline: form.tagline || null,
        bio: form.bio || null,
        bio_long: form.bio_long || null,
        profile_image_url: form.profile_image_url || null,
        cover_image_url: form.cover_image_url || null,
        gallery_image_urls: form.gallery_image_urls,
        video_urls: form.video_urls,
        press_kit_url: form.press_kit_url || null,
        hometown_city: form.hometown_city || null,
        hometown_state: form.hometown_state || null,
        hometown_country: form.hometown_country || 'USA',
        based_in: form.based_in || null,
        genres: form.genres,
        performance_style: form.performance_style || null,
        instruments: form.instruments,
        years_active_since: form.years_active_since || null,
        follower_count: form.follower_count ?? null,
        monthly_listeners: form.monthly_listeners ?? null,
        website_url: form.website_url || null,
        instagram_url: form.instagram_url || null,
        youtube_url: form.youtube_url || null,
        spotify_url: form.spotify_url || null,
        apple_music_url: form.apple_music_url || null,
        facebook_url: form.facebook_url || null,
        tiktok_url: form.tiktok_url || null,
        booking_email: form.booking_email || null,
        booking_phone: form.booking_phone || null,
        management_name: form.management_name || null,
        management_email: form.management_email || null,
        notable_events: form.notable_events || null,
        awards: form.awards || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
        verified: form.verified,
        custom_domain: form.custom_domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null,
      };

      if (isEdit) {
        const { error } = await supabase.from('artists').update(payload).eq('id', (artist as Artist).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('artists').insert(payload);
        if (error) throw error;
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save artist.');
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { key: 'identity', label: 'Identity' },
    { key: 'media', label: 'Media' },
    { key: 'performance', label: 'Performance' },
    { key: 'socials', label: 'Socials' },
    { key: 'booking', label: 'Booking' },
    { key: 'recognition', label: 'Recognition' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Panel header */}
        <div className="px-6 py-5 border-b border-ivory-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AvatarCircle artist={form} size={40} />
            <div>
              <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: '-0.01em' }}>
                {form.name || (isEdit ? 'Edit Artist' : 'New Artist')}
              </p>
              <p className="font-mono text-[10px] text-ink-muted">{isEdit ? `rameelo.com/artists/${form.slug}` : 'New artist profile'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ivory flex items-center justify-center text-ink-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Platform flags strip */}
        <div className="px-6 py-3 bg-ivory border-b border-ivory-200 flex items-center gap-5 shrink-0">
          {([
            { key: 'is_featured', label: 'Featured', activeColor: 'bg-marigold' },
            { key: 'is_active',   label: 'Active',   activeColor: 'bg-peacock' },
            { key: 'verified',    label: 'Verified',  activeColor: 'bg-aubergine' },
          ] as const).map(({ key, label, activeColor }) => (
            <button key={key} type="button" onClick={() => patch({ [key]: !form[key] })}
              className="flex items-center gap-2">
              <div className={`relative w-9 h-5 rounded-full transition-colors ${form[key] ? activeColor : 'bg-ivory-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form[key] ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className={`font-mono text-[9px] uppercase tracking-widest ${form[key] ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-ivory-200 flex gap-1 overflow-x-auto shrink-0">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`font-mono text-[10px] uppercase tracking-widest py-3 px-2 border-b-2 transition-all whitespace-nowrap ${
                tab === t.key ? 'border-aubergine text-aubergine' : 'border-transparent text-ink-muted hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {tab === 'identity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Artist Name *</label>
                  <input type="text" placeholder="Falguni Pathak" value={form.name}
                    onChange={e => { patch({ name: e.target.value, slug: slugify(e.target.value) }); }}
                    className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>URL Slug *</label>
                  <div className="flex items-center gap-0 rounded-xl border border-ivory-200 overflow-hidden focus-within:ring-2 focus-within:ring-aubergine/20 focus-within:border-aubergine/40">
                    <span className="pl-3.5 font-ui text-sm text-ink-muted shrink-0">rameelo.com/artists/</span>
                    <input type="text" placeholder="falguni-pathak" value={form.slug}
                      onChange={e => patch({ slug: slugify(e.target.value) })}
                      className="flex-1 bg-white px-1 py-2.5 font-ui text-sm text-aubergine focus:outline-none" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Tagline</label>
                  <input type="text" placeholder="The Queen of Garba" value={form.tagline ?? ''}
                    onChange={e => patch({ tagline: e.target.value })} className={inputCls} maxLength={100} />
                  <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{(form.tagline ?? '').length}/100</p>
                </div>
              </div>
              <div>
                <label className={labelCls}>Short Bio <span className="text-ink-muted/50 normal-case tracking-normal">(shown on cards & previews)</span></label>
                <textarea rows={3} placeholder="2–3 sentences about the artist…" value={form.bio ?? ''}
                  onChange={e => patch({ bio: e.target.value })} maxLength={300}
                  className={`${inputCls} resize-none`} />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{(form.bio ?? '').length}/300</p>
              </div>
              <div>
                <label className={labelCls}>Full Biography <span className="text-ink-muted/50 normal-case tracking-normal">(artist landing page)</span></label>
                <textarea rows={6} placeholder="The artist's full story — upbringing, journey, style, achievements…" value={form.bio_long ?? ''}
                  onChange={e => patch({ bio_long: e.target.value })} maxLength={3000}
                  className={`${inputCls} resize-none`} />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{(form.bio_long ?? '').length}/3000</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Hometown City</label>
                  <input type="text" placeholder="Ahmedabad" value={form.hometown_city ?? ''}
                    onChange={e => patch({ hometown_city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Hometown State / Region</label>
                  <input type="text" placeholder="Gujarat" value={form.hometown_state ?? ''}
                    onChange={e => patch({ hometown_state: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input type="text" placeholder="India" value={form.hometown_country}
                    onChange={e => patch({ hometown_country: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Currently Based In</label>
                  <input type="text" placeholder="Mumbai, India" value={form.based_in ?? ''}
                    onChange={e => patch({ based_in: e.target.value })} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {tab === 'media' && (
            <>
              {/* Profile photo */}
              <div>
                <label className={labelCls}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  <AvatarCircle artist={form} size={64} />
                  <div className="flex-1">
                    {profileUploading ? (
                      <div className="flex items-center gap-2 text-ink-muted font-ui text-sm">
                        <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />Uploading…
                      </div>
                    ) : (
                      <>
                        <input ref={profileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'profile_image_url')} />
                        <button type="button" onClick={() => profileInputRef.current?.click()}
                          className="font-ui text-sm text-aubergine hover:underline">
                          {form.profile_image_url ? 'Change photo' : 'Upload photo'}
                        </button>
                        {form.profile_image_url && (
                          <button type="button" onClick={() => patch({ profile_image_url: '' })}
                            className="ml-3 font-ui text-xs text-durga hover:underline">Remove</button>
                        )}
                        <p className="font-mono text-[9px] text-ink-muted mt-1">Square image · max 8 MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover / hero image */}
              <div>
                <label className={labelCls}>Cover / Hero Image <span className="text-ink-muted/50 normal-case tracking-normal">(landing page banner)</span></label>
                {form.cover_image_url ? (
                  <div className="relative rounded-2xl overflow-hidden h-32 mb-2">
                    <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => patch({ cover_image_url: '' })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'cover_image_url')} />
                    <div onClick={() => coverInputRef.current?.click()}
                      className="border-2 border-dashed border-ivory-200 rounded-2xl p-6 text-center cursor-pointer hover:border-aubergine/40 hover:bg-aubergine/5 transition-all">
                      {coverUploading ? (
                        <div className="flex items-center justify-center gap-2 text-ink-muted font-ui text-sm">
                          <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />Uploading…
                        </div>
                      ) : (
                        <>
                          <p className="font-ui text-sm font-medium text-ink">Drop or click to upload cover</p>
                          <p className="font-mono text-[9px] text-ink-muted mt-1">Recommended: 1920×640 · max 8 MB</p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Press kit URL */}
              <div>
                <label className={labelCls}>Press Kit URL</label>
                <input type="url" placeholder="https://drive.google.com/…" value={form.press_kit_url ?? ''}
                  onChange={e => patch({ press_kit_url: e.target.value })} className={inputCls} />
              </div>

              {/* Video URLs */}
              <div>
                <label className={labelCls}>Highlight Reel / Video URLs <span className="text-ink-muted/50 normal-case tracking-normal">(one per line)</span></label>
                <textarea rows={3} placeholder="https://youtube.com/watch?v=…" value={(form.video_urls ?? []).join('\n')}
                  onChange={e => patch({ video_urls: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  className={`${inputCls} resize-none`} />
              </div>
            </>
          )}

          {tab === 'performance' && (
            <>
              <div>
                <label className={labelCls}>Genre Tags</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(g => (
                    <button key={g} type="button" onClick={() => toggleArray('genres', g)}
                      className={`px-3 py-1.5 rounded-full font-ui text-xs font-medium border-2 transition-all ${
                        form.genres.includes(g) ? 'border-aubergine bg-aubergine/5 text-aubergine' : 'border-ivory-200 text-ink-muted hover:border-aubergine/30'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Performance Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {PERF_STYLES.map(s => (
                    <button key={s} type="button" onClick={() => patch({ performance_style: form.performance_style === s ? null : s })}
                      className={`py-2.5 rounded-xl font-ui text-xs font-semibold border-2 capitalize transition-all ${
                        form.performance_style === s ? 'border-aubergine bg-aubergine/5 text-aubergine' : 'border-ivory-200 text-ink-muted hover:border-aubergine/30'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Instruments / Skills</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENT_OPTIONS.map(inst => (
                    <button key={inst} type="button" onClick={() => toggleArray('instruments', inst)}
                      className={`px-3 py-1.5 rounded-full font-ui text-xs font-medium border-2 transition-all ${
                        form.instruments.includes(inst) ? 'border-peacock bg-peacock/5 text-peacock' : 'border-ivory-200 text-ink-muted hover:border-peacock/30'
                      }`}>
                      {inst}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Performing Since (Year)</label>
                <input type="number" placeholder="2005" min={1950} max={new Date().getFullYear()}
                  value={form.years_active_since ?? ''}
                  onChange={e => patch({ years_active_since: e.target.value ? parseInt(e.target.value) : null })}
                  className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Follower Count</label>
                  <input type="number" min={0} placeholder="125000"
                    value={form.follower_count ?? ''}
                    onChange={e => patch({ follower_count: e.target.value ? parseInt(e.target.value) : null })}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Monthly Listeners</label>
                  <input type="number" min={0} placeholder="250000"
                    value={form.monthly_listeners ?? ''}
                    onChange={e => patch({ monthly_listeners: e.target.value ? parseInt(e.target.value) : null })}
                    className={inputCls} />
                </div>
              </div>
              <p className="font-mono text-[10px] text-ink-muted/70 -mt-2">Shown on the public artist page (e.g. 125,000 → “125K+”). Leave blank to hide.</p>
            </>
          )}

          {tab === 'socials' && (
            <div className="space-y-4">
              {([
                { key: 'website_url',     label: 'Website',      placeholder: 'https://falgunipathak.com',    icon: '🌐' },
                { key: 'instagram_url',   label: 'Instagram',    placeholder: 'https://instagram.com/…',      icon: '📸' },
                { key: 'youtube_url',     label: 'YouTube',      placeholder: 'https://youtube.com/@…',       icon: '▶️' },
                { key: 'spotify_url',     label: 'Spotify',      placeholder: 'https://open.spotify.com/…',  icon: '🎵' },
                { key: 'apple_music_url', label: 'Apple Music',  placeholder: 'https://music.apple.com/…',   icon: '🎶' },
                { key: 'facebook_url',    label: 'Facebook',     placeholder: 'https://facebook.com/…',      icon: '👍' },
                { key: 'tiktok_url',      label: 'TikTok',       placeholder: 'https://tiktok.com/@…',       icon: '🎬' },
              ] as const).map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className={labelCls}>{icon} {label}</label>
                  <input type="url" placeholder={placeholder} value={(form[key] as string) ?? ''}
                    onChange={e => patch({ [key]: e.target.value })} className={inputCls} />
                </div>
              ))}
            </div>
          )}

          {tab === 'booking' && (
            <div className="space-y-5">
              <div className="rounded-xl bg-marigold/8 border border-marigold/20 p-3">
                <p className="font-ui text-xs text-ink-muted leading-relaxed">
                  <strong className="text-ink">Booking info</strong> is admin-only — it will not be shown on the public artist page unless you explicitly display it.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Booking Email</label>
                  <input type="email" placeholder="bookings@agency.com" value={form.booking_email ?? ''}
                    onChange={e => patch({ booking_email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Booking Phone</label>
                  <input type="tel" placeholder="+1 (555) 000-0000" value={form.booking_phone ?? ''}
                    onChange={e => patch({ booking_phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Management Name</label>
                  <input type="text" placeholder="Star Management Inc." value={form.management_name ?? ''}
                    onChange={e => patch({ management_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Management Email</label>
                  <input type="email" placeholder="manager@agency.com" value={form.management_email ?? ''}
                    onChange={e => patch({ management_email: e.target.value })} className={inputCls} />
                </div>
              </div>

              {/* Custom Domain */}
              <div className="rounded-2xl border-2 border-aubergine/15 bg-aubergine/3 overflow-hidden">
                <div className="px-4 py-3 bg-aubergine/8 border-b border-aubergine/15 flex items-center gap-2">
                  <svg className="w-4 h-4 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                  <p className="font-display font-bold text-aubergine text-sm" style={{ letterSpacing: '-0.01em' }}>Custom Domain</p>
                  <span className="ml-auto font-mono text-[8px] bg-marigold/20 text-marigold-dark px-2 py-0.5 rounded-full uppercase tracking-widest">Official Artist Site</span>
                </div>
                <div className="p-4 space-y-4">
                  <p className="font-ui text-xs text-ink-muted leading-relaxed">
                    Point the artist&apos;s own domain here — visitors who land on <strong className="text-ink">jigardangadhavi.com</strong> will see the full Rameelo artist page with an &ldquo;Official site powered by Rameelo&rdquo; banner.
                  </p>
                  <div>
                    <label className={labelCls}>Custom Domain (no https://)</label>
                    <input
                      type="text"
                      placeholder="jigardangadhavi.com"
                      value={form.custom_domain ?? ''}
                      onChange={e => patch({ custom_domain: e.target.value })}
                      className={inputCls}
                    />
                    {form.custom_domain && (
                      <p className="mt-1.5 font-mono text-[9px] text-peacock">
                        ✓ Saved as: {form.custom_domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                      </p>
                    )}
                  </div>

                  {/* DNS setup instructions */}
                  <div className="rounded-xl bg-ivory border border-ivory-200 p-3 space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold">DNS Setup (do once per domain)</p>
                    <p className="font-ui text-xs text-ink-muted">In your domain registrar (GoDaddy, Namecheap, Google Domains, etc.), add these records:</p>
                    <div className="space-y-1.5 font-mono text-[10px]">
                      <div className="flex gap-2 items-center">
                        <span className="bg-aubergine/10 text-aubergine px-2 py-0.5 rounded shrink-0">A</span>
                        <span className="text-ink-muted">@</span>
                        <span className="text-ink">76.76.21.21</span>
                        <span className="text-ink-muted ml-auto">Vercel IP</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="bg-aubergine/10 text-aubergine px-2 py-0.5 rounded shrink-0">CNAME</span>
                        <span className="text-ink-muted">www</span>
                        <span className="text-ink">cname.vercel-dns.com</span>
                      </div>
                    </div>
                    <p className="font-ui text-[10px] text-ink-muted pt-1 border-t border-ivory-200">
                      Then add the domain in your Vercel project → Settings → Domains.
                    </p>
                  </div>

                  {/* What the visitor sees */}
                  <div className="rounded-xl overflow-hidden border border-peacock/20">
                    <p className="px-3 py-2 bg-peacock/6 font-mono text-[9px] uppercase tracking-widest text-peacock border-b border-peacock/15">Preview — what visitors see</p>
                    <div className="p-3 bg-aubergine/90 flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-marigold flex items-center justify-center shrink-0">
                        <span className="font-display font-bold text-aubergine text-[10px]">R</span>
                      </div>
                      <p className="font-ui text-xs text-white/90 leading-snug flex-1">
                        <strong className="text-marigold">{form.custom_domain || 'artistname.com'}</strong> is the official site for <strong className="text-white">{form.name || 'this artist'}</strong> · All tour info &amp; tickets exclusively on Rameelo
                      </p>
                      <span className="font-mono text-[8px] text-white/50 shrink-0 border border-white/15 rounded px-1.5 py-0.5">Official ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'recognition' && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Notable Events & Appearances</label>
                <textarea rows={4} placeholder="Headlined UK Garba 2023, Navratri Mahotsav 2022 (MSG), Edison NJ Garba 2021…"
                  value={form.notable_events ?? ''} onChange={e => patch({ notable_events: e.target.value })}
                  className={`${inputCls} resize-none`} maxLength={1000} />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{(form.notable_events ?? '').length}/1000</p>
              </div>
              <div>
                <label className={labelCls}>Awards & Recognition</label>
                <textarea rows={4} placeholder="Filmfare Award for Best Female Playback Singer 2021, Global Garba Icon Award…"
                  value={form.awards ?? ''} onChange={e => patch({ awards: e.target.value })}
                  className={`${inputCls} resize-none`} maxLength={1000} />
                <p className="mt-1 font-mono text-[9px] text-ink-muted/50 text-right">{(form.awards ?? '').length}/1000</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {error && (
          <div className="px-6 py-2 bg-durga/10 border-t border-durga/20 shrink-0">
            <p className="font-ui text-xs text-durga">{error}</p>
          </div>
        )}
        <div className="px-6 py-4 border-t border-ivory-200 flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : (isEdit ? 'Save changes' : 'Add artist')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [panelArtist, setPanelArtist] = useState<Partial<Artist> | null | 'new'>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('artists')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('name');
    setArtists((data as Artist[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleFeatured(artist: Artist) {
    setTogglingId(artist.id);
    const supabase = createClient();
    await supabase.from('artists').update({ is_featured: !artist.is_featured }).eq('id', artist.id);
    await load();
    setTogglingId(null);
  }

  async function toggleActive(artist: Artist) {
    setTogglingId(artist.id);
    const supabase = createClient();
    await supabase.from('artists').update({ is_active: !artist.is_active }).eq('id', artist.id);
    await load();
    setTogglingId(null);
  }

  const filtered = artists.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.tagline ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const featured = filtered.filter(a => a.is_featured);
  const regular  = filtered.filter(a => !a.is_featured);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: '-0.02em' }}>Artists</h2>
          {!loading && (
            <p className="font-ui text-ink-muted text-sm mt-0.5">
              {artists.length} total · {artists.filter(a => a.is_featured).length} featured · {artists.filter(a => a.is_active).length} active
            </p>
          )}
        </div>
        <button
          onClick={() => setPanelArtist('new')}
          className="flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-4 py-2 rounded-xl hover:bg-aubergine-light transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add artist
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" placeholder="Search artists…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : artists.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="text-4xl mb-4">🎤</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: '-0.015em' }}>No artists yet</p>
          <p className="font-ui text-ink-muted text-sm mb-6">Add garba artists, singers, and performers to link them to events.</p>
          <button onClick={() => setPanelArtist('new')}
            className="inline-flex items-center gap-2 bg-aubergine text-white font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            Add your first artist →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2 border-b border-ivory-200 bg-ivory">
            <div className="w-9" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Artist</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted hidden md:block">Genres</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted hidden sm:block">Status</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Actions</span>
          </div>

          {featured.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-marigold/5 border-b border-marigold/10">
                <span className="font-mono text-[9px] uppercase tracking-widest text-marigold">⭐ Featured</span>
              </div>
              {featured.map(a => (
                <ArtistRow key={a.id} artist={a} onEdit={() => setPanelArtist(a)} onToggleFeatured={() => toggleFeatured(a)} onToggleActive={() => toggleActive(a)} toggling={togglingId === a.id} />
              ))}
            </>
          )}

          {regular.length > 0 && (
            <>
              {featured.length > 0 && (
                <div className="px-4 py-1.5 bg-ivory/60 border-b border-ivory-200 border-t border-ivory-200">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">All Others</span>
                </div>
              )}
              {regular.map(a => (
                <ArtistRow key={a.id} artist={a} onEdit={() => setPanelArtist(a)} onToggleFeatured={() => toggleFeatured(a)} onToggleActive={() => toggleActive(a)} toggling={togglingId === a.id} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Slide-over panel */}
      {panelArtist !== null && (
        <ArtistPanel
          artist={panelArtist === 'new' ? {} : panelArtist}
          onClose={() => setPanelArtist(null)}
          onSave={() => { setPanelArtist(null); load(); }}
        />
      )}
    </div>
  );
}

function ArtistRow({ artist, onEdit, onToggleFeatured, onToggleActive, toggling }: {
  artist: Artist;
  onEdit: () => void;
  onToggleFeatured: () => void;
  onToggleActive: () => void;
  toggling: boolean;
}) {
  const location = artist.based_in || [artist.hometown_city, artist.hometown_state].filter(Boolean).join(', ');

  return (
    <div className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-ivory-200 last:border-0 hover:bg-ivory/40 transition-colors ${!artist.is_active ? 'opacity-50' : ''}`}>
      {/* Avatar — no cover strip to conflict with */}
      <AvatarCircle artist={artist} size={36} />

      {/* Name + meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-bold text-ink text-sm truncate" style={{ letterSpacing: '-0.01em' }}>{artist.name}</p>
          {artist.verified && <span className="text-[10px] text-peacock shrink-0">✓</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-ui text-xs text-ink-muted truncate">
            {artist.tagline
              ? artist.tagline
              : location
              ? `📍 ${location}`
              : <span className="italic">No tagline</span>
            }
          </p>
          {artist.custom_domain && (
            <span className="font-mono text-[8px] bg-aubergine/8 border border-aubergine/15 text-aubergine px-1.5 py-0.5 rounded shrink-0">
              🌐 {artist.custom_domain}
            </span>
          )}
        </div>
      </div>

      {/* Genres */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {artist.genres.length === 0
          ? <span className="font-mono text-[9px] text-ink-muted/40">—</span>
          : <>
              {artist.genres.slice(0, 3).map(g => (
                <span key={g} className="font-mono text-[8px] uppercase tracking-widest bg-ivory border border-ivory-200 px-2 py-0.5 rounded-full text-ink-muted">{g}</span>
              ))}
              {artist.genres.length > 3 && <span className="font-mono text-[9px] text-ink-muted">+{artist.genres.length - 3}</span>}
            </>
        }
      </div>

      {/* Status badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={onToggleFeatured} disabled={toggling}
          className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 rounded-lg border transition-all ${
            artist.is_featured
              ? 'bg-marigold/15 border-marigold/30 text-marigold-dark'
              : 'border-ivory-200 text-ink-muted hover:border-marigold/30 hover:text-marigold'
          }`}>
          {artist.is_featured ? '⭐ Featured' : 'Feature'}
        </button>
        <button type="button" onClick={onToggleActive} disabled={toggling}
          className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 rounded-lg border transition-all ${
            artist.is_active
              ? 'border-ivory-200 text-ink-muted hover:border-durga/20 hover:text-durga'
              : 'bg-peacock/10 border-peacock/20 text-peacock'
          }`}>
          {artist.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Edit */}
      <button type="button" onClick={onEdit}
        className="font-ui text-xs text-aubergine hover:underline shrink-0 whitespace-nowrap">
        Edit →
      </button>
    </div>
  );
}
