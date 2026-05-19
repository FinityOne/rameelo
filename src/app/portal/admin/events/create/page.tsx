"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_FORM, type EventFormData } from "@/app/portal/organizer/events/create/types";
import Step1Basics   from "@/app/portal/organizer/events/create/Step1Basics";
import Step2Schedule from "@/app/portal/organizer/events/create/Step2Schedule";
import Step3Venue    from "@/app/portal/organizer/events/create/Step3Venue";
import Step4Cover    from "@/app/portal/organizer/events/create/Step4Cover";
import Step5Tickets  from "@/app/portal/organizer/events/create/Step5Tickets";
import Step6Review   from "@/app/portal/organizer/events/create/Step6Review";

const STEPS = [
  { title: 'Basics',   subtitle: 'Name, type & artist',    icon: '🎉' },
  { title: 'Schedule', subtitle: 'Dates & times',           icon: '📅' },
  { title: 'Venue',    subtitle: 'Location & parking',      icon: '📍' },
  { title: 'Cover',    subtitle: 'Photo & event style',     icon: '🎨' },
  { title: 'Tickets',  subtitle: 'Tiers & group discounts', icon: '🎟️' },
  { title: 'Publish',  subtitle: 'Settings & go live',      icon: '🚀' },
];

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";

function isStepValid(step: number, data: EventFormData, sellingOnRameelo: boolean): boolean {
  switch (step) {
    case 0: return !!data.title && !!data.category;
    case 1: return !!data.startDate && !!data.startTime && (!data.isMultiDay || !!data.endDate);
    case 2: return !!data.venueName && !!data.addressLine1 && !!data.city && !!data.state;
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

      const { data: evt, error: evtErr } = await supabase
        .from('events')
        .insert({
          organizer_id:       adminId,
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
          start_time:         form.startTime,
          end_time:           form.endTime || null,
          doors_open_time:    form.doorsOpenTime || null,
          venue_name:         form.venueName,
          address_line1:      form.addressLine1,
          address_line2:      form.addressLine2 || null,
          city:               form.city,
          state:              form.state,
          zip:                form.zip || null,
          parking:            form.parking,
          parking_notes:      form.parkingNotes || null,
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
            <Link href={`/portal/admin/events/${createdId}`}
              className="bg-peacock text-white font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-peacock/90 transition-colors">
              View event →
            </Link>
          )}
          <button onClick={() => router.push('/portal/admin/events')}
            className="bg-aubergine text-white font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            Back to events
          </button>
          <button onClick={() => { setSubmitted(false); setForm(DEFAULT_FORM); setStep(0); setPublishStatus('published'); setSellingOnRameelo(true); }}
            className="border border-ivory-200 text-ink font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-ivory transition-colors">
            Create another
          </button>
        </div>
      </div>
    );
  }

  const valid  = isStepValid(step, form, sellingOnRameelo);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/portal/admin/events" className="font-ui text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
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
        {step === 2 && <Step3Venue    data={form} onChange={patch} />}
        {step === 3 && <Step4Cover    data={form} onChange={patch} organizerId={adminId} />}
        {step === 4 && (
          <div className="space-y-5">
            {/* Ticketing mode banner */}
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${sellingOnRameelo ? 'border-peacock/25 bg-peacock/5' : 'border-marigold/30 bg-marigold/5'}`}>
              <span className="text-lg shrink-0">{sellingOnRameelo ? '🎟️' : '👀'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-ink mb-0.5">
                  {sellingOnRameelo ? 'Selling tickets on Rameelo' : 'Interest collection only — tickets not required'}
                </p>
                <p className="font-mono text-[10px] text-ink-muted">
                  {sellingOnRameelo
                    ? 'Add at least one ticket tier below.'
                    : 'You can skip this step — the event will show an interest form instead of ticket purchase.'}
                </p>
              </div>
              <button type="button" onClick={() => setSellingOnRameelo(s => !s)}
                className="font-mono text-[10px] text-aubergine hover:underline shrink-0">
                Change
              </button>
            </div>
            {sellingOnRameelo && <Step5Tickets data={form} onChange={patch} />}
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
              {step === 4 && !sellingOnRameelo ? 'Skip to publish →' : 'Continue'}
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
