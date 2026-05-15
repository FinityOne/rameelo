"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_FORM, type EventFormData } from "./types";
import Step1Basics   from "./Step1Basics";
import Step2Schedule from "./Step2Schedule";
import Step3Venue    from "./Step3Venue";
import Step4Cover    from "./Step4Cover";
import Step5Tickets  from "./Step5Tickets";
import Step6Review   from "./Step6Review";

const STEPS = [
  { title: 'Basics',   subtitle: 'Name, type & artist',    icon: '🎉' },
  { title: 'Schedule', subtitle: 'Dates & times',           icon: '📅' },
  { title: 'Venue',    subtitle: 'Location & parking',      icon: '📍' },
  { title: 'Cover',    subtitle: 'Photo & event style',     icon: '🎨' },
  { title: 'Tickets',  subtitle: 'Tiers & group discounts', icon: '🎟️' },
  { title: 'Review',   subtitle: 'Submit for approval',     icon: '✅' },
];

function isStepValid(step: number, data: EventFormData): boolean {
  switch (step) {
    case 0: return !!data.title && !!data.category;
    case 1: return !!data.startDate && !!data.startTime && (!data.isMultiDay || !!data.endDate);
    case 2: return !!data.venueName && !!data.addressLine1 && !!data.city && !!data.state;
    case 3: return true;
    case 4: return data.ticketTiers.length > 0 && data.ticketTiers.every(t => t.name && t.price !== '' && t.quantity !== '');
    case 5: return true;
    default: return false;
  }
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventFormData>(DEFAULT_FORM);
  const [organizerId, setOrganizerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setOrganizerId(user.id);
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

      // Insert event
      const { data: evt, error: evtErr } = await supabase
        .from('events')
        .insert({
          organizer_id:      organizerId,
          title:             form.title,
          category:          form.category,
          artist:            form.artist || null,
          artist_id:         form.artistId || null,
          description:       form.description || null,
          navratri_nights:   form.navratriNights.length ? form.navratriNights : null,
          is_multi_day:      form.isMultiDay,
          start_date:        form.startDate,
          end_date:          form.isMultiDay ? form.endDate : null,
          start_time:        form.startTime,
          end_time:          form.endTime || null,
          doors_open_time:   form.doorsOpenTime || null,
          venue_name:        form.venueName,
          address_line1:     form.addressLine1,
          address_line2:     form.addressLine2 || null,
          city:              form.city,
          state:             form.state,
          zip:               form.zip || null,
          parking:           form.parking,
          parking_notes:     form.parkingNotes || null,
          website_url:       form.websiteUrl || null,
          cover_image_url:   form.coverImageUrl || null,
          cover_gradient:    form.coverGradient,
          dress_code:        form.dressCode,
          dress_code_details:form.dressCodeDetails || null,
          dandiya_sticks:    form.dandiyaSticks,
          age_restriction:   form.ageRestriction,
          capacity:          form.capacity ? parseInt(form.capacity) : null,
          status:            'pending_review',
        })
        .select('id')
        .single();

      if (evtErr) throw evtErr;

      // Insert ticket tiers
      const tiers = form.ticketTiers.map((t, i) => ({
        event_id:               evt.id,
        name:                   t.name,
        description:            t.description || null,
        price:                  parseFloat(t.price),
        quantity:               parseInt(t.quantity),
        sale_start_date:        t.saleStartDate || null,
        sale_end_date:          t.saleEndDate || null,
        group_discount_min_qty: t.groupDiscountEnabled && t.groupDiscountMinQty ? parseInt(t.groupDiscountMinQty) : null,
        group_discount_type:    t.groupDiscountEnabled && t.groupDiscountValue ? t.groupDiscountType : null,
        group_discount_value:   t.groupDiscountEnabled && t.groupDiscountValue ? parseFloat(t.groupDiscountValue) : null,
        sort_order:             i,
      }));

      const { error: tierErr } = await supabase.from('ticket_tiers').insert(tiers);
      if (tierErr) throw tierErr;

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
        <div className="w-20 h-20 rounded-3xl bg-marigold/15 border border-marigold/25 flex items-center justify-center mx-auto text-4xl">🎉</div>
        <div>
          <h2 className="font-display font-bold text-ink text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>Event submitted!</h2>
          <p className="font-ui text-ink-muted text-sm leading-relaxed max-w-sm mx-auto">
            <strong className="text-ink">{form.title}</strong> is now under review. Our team will approve it within 24 hours. You&apos;ll see it in your events dashboard once it&apos;s live.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/portal/organizer/events')}
            className="bg-aubergine text-white font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-aubergine-light transition-colors">
            View my events
          </button>
          <button onClick={() => { setSubmitted(false); setForm(DEFAULT_FORM); setStep(0); }}
            className="border border-ivory-200 text-ink font-ui font-semibold text-sm px-6 py-3 rounded-xl hover:bg-ivory transition-colors">
            Create another
          </button>
        </div>
      </div>
    );
  }

  const valid = isStepValid(step, form);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => router.push('/portal/organizer/events')} className="font-ui text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            My Events
          </button>
          <span className="text-ink-muted/40">/</span>
          <span className="font-ui text-xs text-ink-muted">Create Event</span>
        </div>
        <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: '-0.02em' }}>Create a new event</h1>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-4">
        <div className="flex items-start gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { if (done) setStep(i); }}
                disabled={!done}
                className={`flex flex-col items-center gap-1.5 flex-1 min-w-[60px] px-1 py-1 rounded-xl transition-all ${done ? 'cursor-pointer hover:bg-ivory' : 'cursor-default'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  done   ? 'border-peacock bg-peacock text-white'
                  : active ? 'border-aubergine bg-aubergine text-white'
                  : 'border-ivory-200 bg-ivory text-ink-muted'
                }`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <span className="font-display font-bold text-xs">{i + 1}</span>
                  )}
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-wider text-center leading-tight ${active ? 'text-aubergine font-bold' : done ? 'text-peacock' : 'text-ink-muted'}`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-ivory-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-aubergine rounded-full transition-all duration-500"
            style={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
          />
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
        {step === 3 && <Step4Cover    data={form} onChange={patch} organizerId={organizerId} />}
        {step === 4 && <Step5Tickets  data={form} onChange={patch} />}
        {step === 5 && <Step6Review   data={form} onEdit={(s) => setStep(s)} />}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-durga/10 border border-durga/25 px-4 py-3">
          <p className="font-ui text-sm text-durga">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pb-8">
        <button
          type="button"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 font-ui font-semibold text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-4 py-3 rounded-xl hover:bg-ivory"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-ink-muted tracking-widest">{step + 1} / {STEPS.length}</span>

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-aubergine text-white font-display font-bold text-base px-8 py-3.5 rounded-2xl hover:bg-aubergine-light active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              {submitting ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting…</>
              ) : (
                <>Submit for review →</>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!valid}
              className={`flex items-center gap-2 font-display font-bold text-base px-8 py-3.5 rounded-2xl transition-all ${
                valid
                  ? 'bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm'
                  : 'bg-ivory-200 text-ink-muted cursor-not-allowed'
              }`}
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
