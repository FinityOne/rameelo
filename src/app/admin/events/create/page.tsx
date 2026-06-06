"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_FORM, type EventFormData } from "@/app/organizer/events/create/types";
import Step1Basics   from "@/app/organizer/events/create/Step1Basics";
import Step2Schedule from "@/app/organizer/events/create/Step2Schedule";
import Step3Venue    from "@/app/organizer/events/create/Step3Venue";
import Step4Cover    from "@/app/organizer/events/create/Step4Cover";
import Step5Tickets  from "@/app/organizer/events/create/Step5Tickets";
import Step6Review   from "@/app/organizer/events/create/Step6Review";

const STEPS = [
  { title: 'Basics',   subtitle: 'Name, type & artist',    icon: '🎉' },
  { title: 'Schedule', subtitle: 'Dates & times',           icon: '📅' },
  { title: 'Venue',    subtitle: 'Location or TBA',         icon: '📍' },
  { title: 'Cover',    subtitle: 'Photo & event style',     icon: '🎨' },
  { title: 'Tickets',  subtitle: 'Tiers or skip',           icon: '🎟️' },
  { title: 'Publish',  subtitle: 'Settings & go live',      icon: '🚀' },
];

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";

function isStepValid(step: number, data: EventFormData, sellingOnRameelo: boolean, locationTba: boolean): boolean {
  switch (step) {
    case 0: return !!data.title && !!data.category;
    case 1: return !!data.startDate && (!data.isMultiDay || !!data.endDate);
    case 2: return locationTba || (!!data.city && !!data.state);
    case 3: return true;
    case 4: return !sellingOnRameelo || (
      data.ticketTiers.length > 0 &&
      data.ticketTiers.every(t => t.name && t.price !== '' && t.quantity !== '')
    );
    case 5: return true;
    default: return false;
  }
}

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<EventFormData>(DEFAULT_FORM);
  const [adminId, setAdminId]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const [createdId, setCreatedId]   = useState('');

  // Admin-specific publish settings
  const [publishStatus, setPublishStatus]       = useState<'published' | 'draft'>('published');
  const [sellingOnRameelo, setSellingOnRameelo] = useState(true);
  const [featuredOnTour, setFeaturedOnTour]     = useState(false);
  const [featuredOnEvents, setFeaturedOnEvents] = useState(false);
  const [featuredOnArtist, setFeaturedOnArtist] = useState(false);
  const [locationTba, setLocationTba]           = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setAdminId(user.id);
    });
  }, []);

  function patch(p: Partial<EventFormData>) {
    setForm(prev => ({ ...prev, ...p }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();

      // Derive organizer_id from the org's owner when an org is selected.
      // Never auto-assign the admin as organizer.
      let organizerId: string | null = null;
      if (form.orgId) {
        const { data: ownerRow } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('org_id', form.orgId)
          .eq('role', 'owner')
          .limit(1)
          .single();
        // Fall back to first admin member if no explicit owner
        if (!ownerRow) {
          const { data: adminRow } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('org_id', form.orgId)
            .in('role', ['owner', 'admin'])
            .order('joined_at')
            .limit(1)
            .single();
          organizerId = adminRow?.user_id ?? null;
        } else {
          organizerId = ownerRow.user_id;
        }
      }

      const { data: evt, error: evtErr } = await supabase
        .from('events')
        .insert({
          organizer_id:       organizerId,
          org_id:             form.orgId || null,
          title:              form.title,
          category:           form.category,
          artist:             form.artist || null,
          artist_id:          form.artistId || null,
          description:        form.description || null,
          navratri_nights:    form.navratriNights.length ? form.navratriNights : null,
          is_multi_day:       form.isMultiDay,
          start_date:         form.startDate,
          end_date:           form.isMultiDay ? form.endDate : null,
          start_time:         form.startTime || null,
          end_time:           form.endTime || null,
          doors_open_time:    form.doorsOpenTime || null,
          venue_name:         locationTba ? null : (form.venueName || null),
          address_line1:      locationTba ? null : (form.addressLine1 || null),
          address_line2:      locationTba ? null : (form.addressLine2 || null),
          city:               locationTba ? null : (form.city || null),
          state:              locationTba ? null : (form.state || null),
          zip:                locationTba ? null : (form.zip || null),
          parking:            locationTba ? null : (form.parking || null),
          parking_notes:      locationTba ? null : (form.parkingNotes || null),
          location_tba:       locationTba,
          website_url:        form.websiteUrl || null,
          cover_image_url:    form.coverImageUrl || null,
          cover_gradient:     form.coverGradient,
          dress_code:         form.dressCode,
          dress_code_details: form.dressCodeDetails || null,
          dandiya_sticks:     form.dandiyaSticks,
          age_restriction:    form.ageRestriction,
          capacity:           form.capacity ? parseInt(form.capacity) : null,
          status:             publishStatus,
          selling_on_rameelo: sellingOnRameelo,
          featured_on_tour:   featuredOnTour,
          featured_on_events: featuredOnEvents,
          featured_on_artist: featuredOnArtist,
        })
        .select('id')
        .single();

      if (evtErr) throw evtErr;

      // Insert ticket tiers only if selling on Rameelo and tiers exist
      if (sellingOnRameelo && form.ticketTiers.length > 0) {
        const tiers = form.ticketTiers.map((t, i) => ({
          event_id:               evt.id,
          name:                   t.name,
          description:            t.description || null,
          price:                  parseFloat(t.price),
          quantity:               parseInt(t.quantity),
          sale_start_date:        t.saleStartDate || null,
          sale_end_date:          t.saleEndDate || null,
          group_discount_mode:    t.groupDiscountEnabled ? t.groupDiscountMode : null,
          group_discount_min_qty: t.groupDiscountEnabled && t.groupDiscountMode === 'simple' && t.groupDiscountMinQty ? parseInt(t.groupDiscountMinQty) : null,
          group_discount_type:    t.groupDiscountEnabled && t.groupDiscountMode === 'simple' && t.groupDiscountValue ? t.groupDiscountType : null,
          group_discount_value:   t.groupDiscountEnabled && t.groupDiscountMode === 'simple' && t.groupDiscountValue ? parseFloat(t.groupDiscountValue) : null,
          sort_order:             i,
        }));
        const { error: tierErr } = await supabase.from('ticket_tiers').insert(tiers);
        if (tierErr) throw tierErr;
      }

      setCreatedId(evt.id);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-4xl"
          style={{ background: publishStatus === 'published' ? 'rgba(14,140,122,0.12)' : 'rgba(245,166,35,0.12)' }}>
          {publishStatus === 'published' ? '🚀' : '📝'}
        </div>
        <div>
          <h2 className="font-display font-bold text-ink text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>
            {publishStatus === 'published' ? 'Event published!' : 'Event saved as draft'}
          </h2>
          <p className="font-ui text-ink-muted text-sm leading-relaxed max-w-sm mx-auto">
            <strong className="text-ink">{form.title}</strong>{' '}
            {publishStatus === 'published'
              ? sellingOnRameelo
                ? 'is now live and selling tickets.'
                : 'is live and collecting interest — flip the ticketing toggle when the organizer is ready.'
              : 'has been saved. Publish it from the event review page when ready.'}
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {publishStatus === 'published' && (
            <Link href={`/admin/events/${createdId}`}
              className="bg-peacock text-white font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-peacock/90 transition-colors">
              View event →
            </Link>
          )}
          <button onClick={() => router.push('/admin/events')}
            className="bg-aubergine text-white font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            Back to events
          </button>
          <button
            onClick={() => { setSubmitted(false); setForm(DEFAULT_FORM); setStep(0); setPublishStatus('published'); setSellingOnRameelo(true); setFeaturedOnTour(false); setFeaturedOnEvents(false); setFeaturedOnArtist(false); setLocationTba(false); }}
            className="border border-ivory-200 text-ink font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-ivory transition-colors">
            Create another
          </button>
        </div>
      </div>
    );
  }

  const valid  = isStepValid(step, form, sellingOnRameelo, locationTba);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/events" className="font-ui text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Event Review
          </Link>
          <span className="text-ink-muted/40">/</span>
          <span className="font-ui text-xs text-ink-muted">Create Event</span>
        </div>
        <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: '-0.02em' }}>Create a new event</h1>
        <p className="font-ui text-sm text-ink-muted mt-0.5">Admin-created events publish directly — no review required.</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-4">
        <div className="flex items-start gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <button key={i} type="button" onClick={() => { if (done) setStep(i); }} disabled={!done}
                className={`flex flex-col items-center gap-1.5 flex-1 min-w-[56px] px-1 py-1 rounded-xl transition-all ${done ? 'cursor-pointer hover:bg-ivory' : 'cursor-default'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  done ? 'border-peacock bg-peacock text-white' : active ? 'border-aubergine bg-aubergine text-white' : 'border-ivory-200 bg-ivory text-ink-muted'
                }`}>
                  {done
                    ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    : <span className="font-display font-bold text-xs">{i + 1}</span>}
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-wider text-center leading-tight ${active ? 'text-aubergine font-bold' : done ? 'text-peacock' : 'text-ink-muted'}`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 bg-ivory-200 rounded-full overflow-hidden">
          <div className="h-full bg-aubergine rounded-full transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-ivory-200">
          <span className="text-2xl">{STEPS[step].icon}</span>
          <div>
            <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: '-0.015em' }}>{STEPS[step].title}</p>
            <p className="font-ui text-ink-muted text-sm">{STEPS[step].subtitle}</p>
          </div>
        </div>

        {step === 0 && <Step1Basics   data={form} onChange={patch} />}
        {step === 1 && <Step2Schedule data={form} onChange={patch} />}
        {step === 2 && (
          <div className="space-y-5">
            {/* Location TBA toggle */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: false, icon: '📍', label: 'Location confirmed', desc: 'Enter venue name, address & parking' },
                { value: true,  icon: '🕐', label: 'Location TBA',        desc: 'Venue not announced yet — skip for now' },
              ] as const).map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setLocationTba(opt.value)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${locationTba === opt.value ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 hover:border-aubergine/30'}`}>
                  <p className="font-ui text-sm font-semibold text-ink mb-0.5">{opt.icon} {opt.label}</p>
                  <p className="font-mono text-[9px] text-ink-muted leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>

            {locationTba ? (
              <div className="rounded-xl border-2 border-dashed border-marigold/30 bg-marigold/5 px-5 py-8 text-center space-y-2">
                <p className="text-2xl">🕐</p>
                <p className="font-ui font-semibold text-ink text-sm">Venue to be announced</p>
                <p className="font-mono text-[10px] text-ink-muted max-w-xs mx-auto">
                  The event page will show "Venue TBA". You can add the location later from the event review page once it&apos;s confirmed.
                </p>
              </div>
            ) : (
              <Step3Venue data={form} onChange={patch} />
            )}
          </div>
        )}
        {step === 3 && <Step4Cover    data={form} onChange={patch} organizerId={adminId} />}
        {step === 4 && (
          <div className="space-y-5">
            {/* Ticketing mode selector */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticket sales on Rameelo</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: true,  icon: '🎟️', label: 'Sell tickets here',   desc: 'Attendees buy tickets directly on Rameelo — add at least one tier below' },
                  { value: false, icon: '👀', label: 'Not selling on Rameelo', desc: 'Show an interest form instead — flip this on anytime from the event page' },
                ] as const).map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => setSellingOnRameelo(opt.value)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${sellingOnRameelo === opt.value ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 hover:border-aubergine/30'}`}>
                    <p className="font-ui text-sm font-semibold text-ink mb-0.5">{opt.icon} {opt.label}</p>
                    <p className="font-mono text-[9px] text-ink-muted leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {sellingOnRameelo ? (
              <Step5Tickets data={form} onChange={patch} />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-peacock/25 bg-peacock/5 px-5 py-8 text-center space-y-2">
                <p className="text-2xl">👀</p>
                <p className="font-ui font-semibold text-ink text-sm">Interest form mode</p>
                <p className="font-mono text-[10px] text-ink-muted max-w-xs mx-auto">
                  The event page will show a &quot;Claim My Spot&quot; interest form. You can enable ticket sales anytime from the event review page.
                </p>
              </div>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="space-y-5">
            {/* Publication settings — admin exclusive */}
            <div className="rounded-2xl border-2 border-aubergine/20 bg-aubergine/3 overflow-hidden">
              <div className="px-5 py-3.5 bg-aubergine/8 border-b border-aubergine/15 flex items-center gap-2">
                <span className="text-base">⚙️</span>
                <p className="font-display font-bold text-aubergine text-sm" style={{ letterSpacing: '-0.01em' }}>Publication Settings</p>
                <span className="ml-auto font-mono text-[9px] bg-durga/10 text-durga px-2 py-0.5 rounded-full">Admin only</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Status */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Status after creation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'published', label: '🚀 Publish now', desc: 'Immediately visible to the public' },
                      { value: 'draft',     label: '📝 Save as draft', desc: 'Hidden until you publish it' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button" onClick={() => setPublishStatus(opt.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${publishStatus === opt.value ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 hover:border-aubergine/30'}`}>
                        <p className="font-ui text-sm font-semibold text-ink">{opt.label}</p>
                        <p className="font-mono text-[9px] text-ink-muted mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticketing mode */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticketing mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: true,  label: '🎟️ Sell tickets',    desc: 'Full ticket purchase flow' },
                      { value: false, label: '👀 Interest only',   desc: 'Show inquiry form instead' },
                    ] as const).map(opt => (
                      <button key={String(opt.value)} type="button" onClick={() => setSellingOnRameelo(opt.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${sellingOnRameelo === opt.value ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 hover:border-aubergine/30'}`}>
                        <p className="font-ui text-sm font-semibold text-ink">{opt.label}</p>
                        <p className="font-mono text-[9px] text-ink-muted mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {!sellingOnRameelo && (
                    <p className="mt-2 font-mono text-[10px] text-marigold-dark bg-marigold/10 px-3 py-2 rounded-lg">
                      Interest mode: attendees fill a &quot;Claim My Spot&quot; form. You can flip this to ticket-selling anytime from the event review page.
                    </p>
                  )}
                </div>

                {/* Featured placement */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Featured placement</p>
                  <div className="space-y-2">
                    {([
                      { key: 'tour',   label: '⭐ Feature on the tour page',   desc: 'Show in the homepage “Featured this Navratri” showcase', checked: featuredOnTour,   set: setFeaturedOnTour },
                      { key: 'events', label: '⭐ Feature on the events list', desc: 'Pin to the top of the public Events page with a badge',     checked: featuredOnEvents, set: setFeaturedOnEvents },
                      { key: 'artist', label: '⭐ Feature on the artist page', desc: 'Pin to the top of the artist’s tour list with a badge',     checked: featuredOnArtist, set: setFeaturedOnArtist },
                    ] as const).map(opt => (
                      <button key={opt.key} type="button" onClick={() => opt.set(!opt.checked)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${opt.checked ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 hover:border-aubergine/30'}`}>
                        <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-md border flex items-center justify-center ${opt.checked ? 'bg-aubergine border-aubergine' : 'border-ink-muted/40'}`}>
                          {opt.checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-ui text-sm font-semibold text-ink">{opt.label}</span>
                          <span className="block font-mono text-[9px] text-ink-muted mt-0.5">{opt.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Full review summary */}
            <Step6Review data={form} onEdit={(s) => setStep(s)} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-durga/10 border border-durga/25 px-4 py-3">
          <p className="font-ui text-sm text-durga">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pb-8">
        <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 font-ui font-semibold text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-3 rounded-xl hover:bg-ivory">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-ink-muted tracking-widest">{step + 1} / {STEPS.length}</span>

          {isLast ? (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 bg-aubergine text-white font-display font-bold text-base px-8 py-3.5 rounded-2xl hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm disabled:opacity-60">
              {submitting
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</>
                : publishStatus === 'published' ? '🚀 Publish event →' : '📝 Save as draft →'}
            </button>
          ) : (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!valid}
              className={`flex items-center gap-2 font-display font-bold text-base px-8 py-3.5 rounded-2xl transition-all ${
                valid ? 'bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm' : 'bg-ivory-200 text-ink-muted cursor-not-allowed'
              }`}>
              {(step === 2 && locationTba) || (step === 4 && !sellingOnRameelo) ? 'Skip →' : 'Continue'}
              {!(step === 4 && !sellingOnRameelo) && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
