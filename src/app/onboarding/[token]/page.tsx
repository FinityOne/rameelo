"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import {
  emptyResponses,
  emptyEvent,
  emptyTier,
  formatDateRange,
  MARKETING_ASSET_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  ONBOARDING_AGREEMENT_TEXT,
  ONBOARDING_AGREEMENT_SUMMARY,
  ONBOARDING_AGREEMENT_VERSION,
  RAMEELO_WELCOME,
  RAMEELO_MISSION,
  RAMEELO_BENEFITS,
  RAMEELO_FEE_POINTS,
  RAMEELO_PROMO_NOTE,
  achFeeLine,
  ONBOARDING_AGREEMENT_SECTIONS,
  ONBOARDING_AGREEMENT_PREAMBLE,
  ONBOARDING_SCAN_TIP,
  ONBOARDING_SUPPORT_EMAIL,
  ONBOARDING_SUPPORT_NOTE,
  type OnboardingResponses,
  type OnboardingEvent,
  type OnboardingTier,
  type OnboardingContact,
  type OnboardingDocument,
  type OnboardingOffer,
  type OnboardingConfig,
} from "@/lib/onboarding";

const STEPS = [
  { n: 1, label: "Welcome", sub: "Why Rameelo" },
  { n: 2, label: "Rules & Tips", sub: "Good to know" },
  { n: 3, label: "Your Details", sub: "The form" },
];

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// text-base on mobile (16px) avoids iOS Safari's auto-zoom on input focus; text-sm on ≥sm.
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-base sm:text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-marigold/30 focus:border-marigold/50 transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5";
const DOC_CATEGORIES = [...MARKETING_ASSET_OPTIONS, "Other"];

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ step, eyebrow, title, subtitle, children }: {
  step: number; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-7 space-y-5">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-aubergine text-white font-display font-bold text-sm flex items-center justify-center mt-0.5">{step}</span>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-marigold">{eyebrow}</p>
          <h2 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>{title}</h2>
          {subtitle && <p className="font-ui text-sm text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [offer, setOffer] = useState<OnboardingOffer | null>(null);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [form, setForm] = useState<OnboardingResponses>(emptyResponses());
  const [docs, setDocs] = useState<OnboardingDocument[]>([]);
  const [resumedAt, setResumedAt] = useState<string | null>(null);

  // 3-step flow: 1 Welcome & Offer · 2 Rules & Tips · 3 The form
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  function goStep(n: number) {
    setStep(n);
    setMaxStep(m => Math.max(m, n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { document.title = "Event Onboarding · Rameelo"; }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_onboarding", { p_token: token });
      const res = data as Record<string, unknown> | null;
      if (error || !res || res.found !== true) { setInvalid(true); setLoading(false); return; }

      const org = (res.org ?? {}) as Record<string, string | null>;
      setOrgName(org.name ?? "");

      if (res.status === "submitted") { setAlreadyDone(true); setLoading(false); return; }

      setOffer((res.offer ?? {}) as OnboardingOffer);
      setConfig((res.config ?? {}) as OnboardingConfig);

      // Always start at step 1, for everyone, on every visit. A saved draft's
      // data still loads below; the "welcome back" banner shows once they reach
      // the form — we just never auto-advance past the beginning.
      setStep(1);
      setMaxStep(1);
      if (typeof res.draft_saved_at === "string" && res.draft_saved_at) {
        setResumedAt(res.draft_saved_at);
      }
      const savedDocs = (res.documents ?? []) as OnboardingDocument[];
      if (savedDocs.length) setDocs(savedDocs);

      // Merge: empty defaults → org prefill → any saved draft responses.
      const saved = (res.responses ?? {}) as Partial<OnboardingResponses>;
      const base = emptyResponses();
      const seededEvents = saved.events?.length
        ? saved.events
        : [{ ...emptyEvent(), city: org.city ?? "", state: org.state ?? "" }];
      setForm({
        ...base,
        organizationName:        saved.organizationName        ?? org.name ?? "",
        organizationDescription: saved.organizationDescription ?? org.description ?? "",
        foundedYear:             saved.foundedYear             ?? (org.founded_year != null ? String(org.founded_year) : ""),
        email:                   saved.email                  ?? org.email ?? "",
        phone:                   saved.phone                  ?? org.phone ?? "",
        website:                 saved.website                ?? org.website ?? "",
        instagram:               saved.instagram              ?? org.instagram ?? "",
        facebook:                saved.facebook               ?? org.facebook ?? "",
        ...saved,
        events: seededEvents,
      });
      setLoading(false);
    })();
  }, [token, supabase]);

  const set = useCallback(<K extends keyof OnboardingResponses>(key: K, value: OnboardingResponses[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  // ── Events (accordion — one open at a time) ──
  const [openEvent, setOpenEvent] = useState(0);

  function setEvent<K extends keyof OnboardingEvent>(ei: number, key: K, value: OnboardingEvent[K]) {
    setForm(f => ({ ...f, events: f.events.map((ev, idx) => idx === ei ? { ...ev, [key]: value } : ev) }));
  }
  function addEvent() {
    setOpenEvent(form.events.length); // open the one we're about to add
    setForm(f => ({ ...f, events: [...f.events, emptyEvent()] }));
  }
  function removeEvent(ei: number) {
    setForm(f => ({ ...f, events: f.events.filter((_, idx) => idx !== ei) }));
    setOpenEvent(o => Math.max(0, o > ei ? o - 1 : o === ei ? 0 : o));
  }

  // ── Ticket tiers (scoped to an event) ──
  function setTier(ei: number, ti: number, key: keyof OnboardingTier, value: string) {
    setForm(f => ({ ...f, events: f.events.map((ev, idx) => idx === ei
      ? { ...ev, tiers: ev.tiers.map((t, tIdx) => tIdx === ti ? { ...t, [key]: value } : t) }
      : ev) }));
  }
  function addTier(ei: number) {
    setForm(f => ({ ...f, events: f.events.map((ev, idx) => idx === ei ? { ...ev, tiers: [...ev.tiers, emptyTier()] } : ev) }));
  }
  function removeTier(ei: number, ti: number) {
    setForm(f => ({ ...f, events: f.events.map((ev, idx) => idx === ei ? { ...ev, tiers: ev.tiers.filter((_, tIdx) => tIdx !== ti) } : ev) }));
  }

  // ── Contacts ──
  function addContact() {
    setForm(f => ({ ...f, contacts: [...f.contacts, { firstName: "", lastName: "", role: "", email: "", phone: "" }] }));
  }
  function setContact(i: number, key: keyof OnboardingContact, value: string) {
    setForm(f => ({ ...f, contacts: f.contacts.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));
  }
  function removeContact(i: number) {
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }));
  }

  // ── Marketing checkbox toggle ──
  function toggleAsset(asset: string) {
    setForm(f => ({
      ...f,
      marketingAssets: f.marketingAssets.includes(asset)
        ? f.marketingAssets.filter(a => a !== asset)
        : [...f.marketingAssets, asset],
    }));
  }

  async function saveDraft() {
    setSavingDraft(true);
    setDraftMsg("");
    const { error } = await supabase.rpc("save_onboarding_draft", {
      p_token: token,
      p_responses: form,
      p_documents: docs,
    });
    setSavingDraft(false);
    if (error) { setDraftMsg("error:Couldn't save your draft — please try again."); return; }
    setResumedAt(new Date().toISOString());
    setDraftMsg("ok:Draft saved! You can close this tab and return anytime with the same link.");
    setTimeout(() => setDraftMsg(""), 7000);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    const { error } = await supabase.rpc("submit_onboarding", {
      p_token: token,
      p_responses: form,
      p_documents: docs,
      p_agreement_name: signature.trim(),
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      p_agreement_version: ONBOARDING_AGREEMENT_VERSION,
      p_agreement_text: ONBOARDING_AGREEMENT_TEXT,
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message || "Something went wrong. Please try again."); return; }
    setShowConfirm(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Minimal gate before showing the confirmation modal.
  const canReview = form.organizationName.trim() && form.primaryContactName.trim() && form.email.trim();

  // Save + submit action row, reused at the top and bottom of the form (step 3).
  function renderActions(placement: "top" | "bottom") {
    const draftNote = draftMsg && (
      <p className={`font-ui text-xs text-center ${draftMsg.startsWith("error:") ? "text-durga" : "text-peacock"}`}>
        {draftMsg.replace(/^(error|ok):/, "")}
      </p>
    );
    const saveBtn = (
      <button type="button" onClick={saveDraft} disabled={savingDraft}
        className={placement === "top"
          ? "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm font-semibold text-ink-muted hover:text-aubergine hover:border-aubergine/30 transition-all disabled:opacity-50 shrink-0"
          : "inline-flex items-center gap-2 font-ui text-sm font-semibold text-ink-muted hover:text-aubergine transition-colors disabled:opacity-50"}>
        {savingDraft
          ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-ink-muted/30 border-t-aubergine animate-spin" />Saving…</>
          : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-4-4v8m0 0l-3-3m3 3l3-3M9 3h6" /></svg>{placement === "top" ? "Save" : "Save & finish later"}</>}
      </button>
    );
    const submitBtn = (
      <button type="button" disabled={!canReview}
        onClick={() => { setSignature(form.submittedBy || form.primaryContactName || ""); setShowConfirm(true); }}
        className={placement === "top"
          ? "flex-1 bg-aubergine text-white font-display font-bold text-sm py-2.5 rounded-xl hover:bg-aubergine-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          : "w-full bg-aubergine text-white font-display font-bold text-base py-4 rounded-2xl hover:bg-aubergine-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"}>
        Review &amp; Submit →
      </button>
    );

    if (placement === "top") {
      return (
        <div className="sticky top-3 z-20 space-y-1.5">
          <div className="flex items-center gap-2 rounded-2xl border border-ivory-200 bg-white/90 backdrop-blur-sm p-2 shadow-sm">
            {saveBtn}
            {submitBtn}
          </div>
          {draftNote}
        </div>
      );
    }
    return (
      <div className="pt-2 space-y-3">
        {submitBtn}
        <div className="flex flex-col items-center gap-2">
          {saveBtn}
          {draftNote}
          {!canReview && (
            <p className="font-ui text-xs text-ink-muted text-center">Add your organization name, primary contact, and email to submit — or save your progress and finish later.</p>
          )}
        </div>
      </div>
    );
  }

  // ── States ───────────────────────────────────────────────────────────────
  if (loading) {
    return <Shell><div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div></Shell>;
  }

  if (invalid) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <p className="text-5xl mb-4">🪔</p>
          <h1 className="font-display font-bold text-ink text-2xl mb-2">This link isn&apos;t valid</h1>
          <p className="font-ui text-ink-muted">This onboarding link is incorrect or has expired. Please reach out to your Rameelo contact for a fresh link.</p>
        </div>
      </Shell>
    );
  }

  if (alreadyDone || submitted) {
    return (
      <Shell>
        <div className="max-w-lg mx-auto text-center py-20 px-6">
          <div className="w-16 h-16 rounded-full bg-peacock/12 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="font-display font-bold text-ink text-3xl mb-3" style={{ letterSpacing: "-0.02em" }}>
            {submitted ? "You're all set! 🎉" : "We've got your details ✨"}
          </h1>
          <p className="font-ui text-ink-muted text-lg leading-relaxed">
            {submitted
              ? `Thank you${orgName ? `, ${orgName}` : ""}! Your onboarding details are in. The Rameelo team will review everything and reach out shortly to bring your event${orgName ? "" : "s"} to life.`
              : "This questionnaire has already been submitted. If you need to update anything, just reach out to your Rameelo contact and we'll take care of it."}
          </p>
          <p className="font-mono text-[11px] text-ink-muted/60 mt-8 uppercase tracking-widest">Garbe ki raat, Rameelo ke saath</p>
        </div>
      </Shell>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Stepper */}
        <Stepper step={step} maxStep={maxStep} onJump={(n) => { if (n <= maxStep) goStep(n); }} />

        {/* Step 1 — Welcome & Offer */}
        {step === 1 && <WelcomeStep orgName={orgName} offer={offer} config={config} onContinue={() => goStep(2)} />}

        {/* Step 2 — Rules & Tips */}
        {step === 2 && <TermsStep onBack={() => goStep(1)} onContinue={() => goStep(3)} />}

        {/* Step 3 — The form */}
        {step === 3 && (
        <div className="space-y-5">
          <div className="text-center mb-1">
            <h1 className="font-display font-bold text-ink text-2xl sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
              Tell us about {orgName ? <span className="text-aubergine">{orgName}</span> : "your event"} 🎉
            </h1>
            <p className="font-ui text-ink-muted text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
              Fill in what you can — you can save and finish later anytime, and we&apos;ll handle the rest.
            </p>
            {resumedAt && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-peacock/10 px-3.5 py-1.5">
                <svg className="w-3.5 h-3.5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="font-ui text-xs text-peacock">Welcome back — we saved your progress. Pick up right where you left off.</span>
              </div>
            )}
          </div>

          {/* Top actions */}
          {renderActions("top")}

          {/* 1 — Organizer Information */}
          <Section step={1} eyebrow="About you" title="Organizer Information" subtitle="Some of this may already be filled in — just confirm or tweak.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Organization Name *"><input value={form.organizationName} onChange={e => set("organizationName", e.target.value)} className={inputCls} placeholder="Garba Nights LLC" /></Field>
              <Field label="Year Founded"><input type="number" min="1900" max={new Date().getFullYear()} value={form.foundedYear} onChange={e => set("foundedYear", e.target.value)} className={inputCls} placeholder="2010" /></Field>
              <Field label="Organization Description" className="sm:col-span-2"><textarea rows={3} value={form.organizationDescription} onChange={e => set("organizationDescription", e.target.value)} className={`${inputCls} resize-none`} placeholder="Tell us about your organization — who you are and what you're about." /></Field>
              <Field label="Primary Contact Name *"><input value={form.primaryContactName} onChange={e => set("primaryContactName", e.target.value)} className={inputCls} placeholder="Your name" /></Field>
              <Field label="Email Address *"><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="you@org.com" /></Field>
              <Field label="Phone Number"><input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls} placeholder="(555) 000-0000" /></Field>
              <Field label="Website"><input type="url" value={form.website} onChange={e => set("website", e.target.value)} className={inputCls} placeholder="https://…" /></Field>
              <Field label="Instagram Handle">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">@</span>
                  <input value={form.instagram} onChange={e => set("instagram", e.target.value.replace("@", ""))} className={`${inputCls} pl-8`} placeholder="handle" />
                </div>
              </Field>
              <Field label="Facebook Page" className="sm:col-span-2"><input value={form.facebook} onChange={e => set("facebook", e.target.value)} className={inputCls} placeholder="facebook.com/yourpage" /></Field>
            </div>
          </Section>

          {/* 2 — Event(s) */}
          <Section step={2} eyebrow="The nights" title="Your Event(s)" subtitle="Add every event you'd like on Rameelo — each one gets its own venue, schedule, tickets, and discounts.">
            <div className="space-y-3">
              {form.events.map((ev, ei) => {
                const open = openEvent === ei;
                const ticketCount = ev.tiers.filter(t => t.name || t.price || t.quantity).length;
                const dateLabel = formatDateRange(ev.startDate, ev.endDate);
                return (
                  <div key={ei} className="rounded-xl border border-ivory-200 overflow-hidden">
                    {/* Accordion header */}
                    <div
                      onClick={() => setOpenEvent(open ? -1 : ei)}
                      className="flex items-center gap-3 px-4 py-3.5 bg-ivory/40 hover:bg-ivory/70 transition-colors cursor-pointer select-none"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-aubergine text-white font-display font-bold text-xs flex items-center justify-center">{ei + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-ui text-sm font-semibold text-ink truncate">{ev.eventName || `Event ${ei + 1}`}</p>
                        {(dateLabel || ev.venueName || ticketCount > 0) && (
                          <p className="font-mono text-[10px] text-ink-muted truncate">
                            {[dateLabel, ev.venueName, ticketCount > 0 ? `${ticketCount} ticket${ticketCount !== 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      {form.events.length > 1 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeEvent(ei); }}
                          className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-durga transition-colors px-1 shrink-0">Remove</button>
                      )}
                      <svg className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {open && (
                      <div className="p-4 sm:p-5 space-y-6 border-t border-ivory-200">
                        {/* Event details */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Event Name" className="sm:col-span-2"><input value={ev.eventName} onChange={e => setEvent(ei, "eventName", e.target.value)} className={inputCls} placeholder="Navratri Garba Night 2026" /></Field>
                          <div className="sm:col-span-2 space-y-1.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <Field label="Start Date"><input type="date" value={ev.startDate} onChange={e => setEvent(ei, "startDate", e.target.value)} className={inputCls} /></Field>
                              <Field label="End Date"><input type="date" value={ev.endDate} min={ev.startDate || undefined} onChange={e => setEvent(ei, "endDate", e.target.value)} className={inputCls} /></Field>
                            </div>
                            <p className="font-mono text-[10px] text-ink-muted/60">Multi-night event like Navratri? Pick the first and last night. Single day? Just set the start date.</p>
                          </div>
                          <Field label="Doors Open"><input type="time" value={ev.doorsOpen} onChange={e => setEvent(ei, "doorsOpen", e.target.value)} className={inputCls} /></Field>
                          <Field label="Event Start"><input type="time" value={ev.eventStart} onChange={e => setEvent(ei, "eventStart", e.target.value)} className={inputCls} /></Field>
                          <Field label="Event End"><input type="time" value={ev.eventEnd} onChange={e => setEvent(ei, "eventEnd", e.target.value)} className={inputCls} /></Field>
                          <Field label="Venue Capacity"><input type="number" min="0" value={ev.venueCapacity} onChange={e => setEvent(ei, "venueCapacity", e.target.value)} className={inputCls} placeholder="1500" /></Field>
                          <Field label="Expected Attendance" className="sm:col-span-2"><input type="number" min="0" value={ev.expectedAttendance} onChange={e => setEvent(ei, "expectedAttendance", e.target.value)} className={inputCls} placeholder="1200" /></Field>
                          <Field label="Venue Name" className="sm:col-span-2"><input value={ev.venueName} onChange={e => setEvent(ei, "venueName", e.target.value)} className={inputCls} placeholder="Community Convention Center" /></Field>
                          <Field label="Street Address" className="sm:col-span-2"><input value={ev.streetAddress} onChange={e => setEvent(ei, "streetAddress", e.target.value)} className={inputCls} placeholder="123 Main St" /></Field>
                          <Field label="City"><input value={ev.city} onChange={e => setEvent(ei, "city", e.target.value)} className={inputCls} placeholder="Edison" /></Field>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="State">
                              <select value={ev.state} onChange={e => setEvent(ei, "state", e.target.value)} className={inputCls}>
                                <option value="">—</option>
                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </Field>
                            <Field label="Zip"><input value={ev.zip} onChange={e => setEvent(ei, "zip", e.target.value)} className={inputCls} placeholder="08820" /></Field>
                          </div>
                          <Field label="Featured Artist(s)" className="sm:col-span-2"><input value={ev.featuredArtists} onChange={e => setEvent(ei, "featuredArtists", e.target.value)} className={inputCls} placeholder="e.g. Atul Purohit, DJ Rink" /></Field>
                        </div>

                        {/* Tickets */}
                        <div className="space-y-3">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine">Ticket Configuration</p>
                          {ev.tiers.map((t, ti) => (
                            <div key={ti} className="rounded-xl border border-ivory-200 bg-white p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Ticket {ti + 1}</p>
                                {ev.tiers.length > 1 && (
                                  <button type="button" onClick={() => removeTier(ei, ti)} className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-durga transition-colors">Remove</button>
                                )}
                              </div>
                              <div className="grid sm:grid-cols-2 gap-3">
                                <Field label="Ticket Name"><input value={t.name} onChange={e => setTier(ei, ti, "name", e.target.value)} className={inputCls} placeholder="General Admission" /></Field>
                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Price ($)"><input type="number" min="0" step="0.01" value={t.price} onChange={e => setTier(ei, ti, "price", e.target.value)} className={inputCls} placeholder="40" /></Field>
                                  <Field label="Quantity"><input type="number" min="0" value={t.quantity} onChange={e => setTier(ei, ti, "quantity", e.target.value)} className={inputCls} placeholder="500" /></Field>
                                </div>
                                <Field label="Sale Start Date"><input type="date" value={t.saleStart} onChange={e => setTier(ei, ti, "saleStart", e.target.value)} className={inputCls} /></Field>
                                <Field label="Sale End Date"><input type="date" value={t.saleEnd} onChange={e => setTier(ei, ti, "saleEnd", e.target.value)} className={inputCls} /></Field>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addTier(ei)} className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add another ticket type
                          </button>
                        </div>

                        {/* Group discounts */}
                        <div className="space-y-3">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine">Group Discounts</p>
                          <div className="flex gap-3">
                            {(["yes", "no"] as const).map(v => (
                              <button key={v} type="button" onClick={() => setEvent(ei, "groupDiscounts", v)}
                                className={`flex-1 py-3 rounded-xl border font-ui text-sm font-semibold transition-all ${ev.groupDiscounts === v ? "border-marigold bg-marigold/10 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-marigold/40"}`}>
                                {v === "yes" ? "Yes, we will 🎟️" : "No, not this time"}
                              </button>
                            ))}
                          </div>
                          {ev.groupDiscounts === "yes" && (
                            <Field label="Tell us the details">
                              <textarea rows={3} value={ev.groupDiscountsDetails} onChange={e => setEvent(ei, "groupDiscountsDetails", e.target.value)} className={`${inputCls} resize-none`} placeholder="e.g. 10% off groups of 10+, 15% off groups of 20+" />
                            </Field>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={addEvent}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-aubergine/25 text-aubergine font-ui text-sm font-semibold hover:border-aubergine/50 hover:bg-aubergine/5 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add another event
              </button>
            </div>
          </Section>

          {/* 3 — Additional Team Members */}
          <Section step={3} eyebrow="Your crew" title="Additional Team Members" subtitle="Anyone else on your team we should know about? (No accounts created yet — just so we have the full picture.)">
            <div className="space-y-4">
              {form.contacts.map((c, i) => (
                <div key={i} className="rounded-xl border border-ivory-200 bg-ivory/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Team member {i + 1}</p>
                    <button type="button" onClick={() => removeContact(i)} className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/50 hover:text-durga transition-colors">Remove</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="First Name"><input value={c.firstName} onChange={e => setContact(i, "firstName", e.target.value)} className={inputCls} placeholder="First name" /></Field>
                    <Field label="Last Name"><input value={c.lastName} onChange={e => setContact(i, "lastName", e.target.value)} className={inputCls} placeholder="Last name" /></Field>
                    <Field label="Role" className="sm:col-span-2"><input value={c.role} onChange={e => setContact(i, "role", e.target.value)} className={inputCls} placeholder="e.g. Marketing lead" /></Field>
                    <Field label="Email"><input type="email" value={c.email} onChange={e => setContact(i, "email", e.target.value)} className={inputCls} placeholder="email@org.com" /></Field>
                    <Field label="Phone"><input type="tel" value={c.phone} onChange={e => setContact(i, "phone", e.target.value)} className={inputCls} placeholder="(555) 000-0000" /></Field>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addContact} className="inline-flex items-center gap-2 font-ui text-sm font-semibold text-aubergine hover:text-aubergine-light transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add a team member
              </button>
            </div>
          </Section>

          {/* 4 — Marketing Assets */}
          <Section step={4} eyebrow="Make it shine" title="Marketing Assets" subtitle="Check what you can provide, and upload anything you have ready. You can always send more later.">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {MARKETING_ASSET_OPTIONS.map(a => {
                const on = form.marketingAssets.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAsset(a)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${on ? "border-marigold bg-marigold/10" : "border-ivory-200 hover:border-marigold/40"}`}>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-marigold border-marigold" : "border-ink-muted/40"}`}>
                      {on && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="font-ui text-xs font-medium text-ink">{a}</span>
                  </button>
                );
              })}
            </div>
            <FileUploader token={token} docs={docs} setDocs={setDocs} categories={DOC_CATEGORIES} />
            <p className="font-ui text-xs text-ink-muted/80 leading-relaxed">Rameelo isn&apos;t obligated to run marketing, but we&apos;ll promote your event in good faith as much as we reasonably can. Special marketing requests can be arranged for an additional cost — just ask, and we&apos;ll discuss it separately.</p>
          </Section>

          {/* 5 — Financial Information */}
          <Section step={5} eyebrow="The money" title="Financial Information" subtitle="Just the basics — we'll collect secure banking details separately, never on this form.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Payout Recipient Name"><input value={form.payoutRecipientName} onChange={e => set("payoutRecipientName", e.target.value)} className={inputCls} placeholder="Legal name or org" /></Field>
              <Field label="Payout Email Address"><input type="email" value={form.payoutEmail} onChange={e => set("payoutEmail", e.target.value)} className={inputCls} placeholder="finance@org.com" /></Field>
              <Field label="Preferred Payment Method">
                <select value={form.preferredPaymentMethod} onChange={e => set("preferredPaymentMethod", e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Estimated Gross Ticket Revenue"><input value={form.estimatedGrossRevenue} onChange={e => set("estimatedGrossRevenue", e.target.value)} className={inputCls} placeholder="$50,000" /></Field>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-peacock/8 border border-peacock/20 px-4 py-3">
              <svg className="w-4 h-4 text-peacock shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <p className="font-ui text-xs text-ink-muted leading-relaxed">We never ask for bank account or routing numbers here. Banking details are collected later through a secure, encrypted channel.</p>
            </div>
          </Section>

          {/* 6 — Additional Notes */}
          <Section step={6} eyebrow="Anything else" title="Additional Notes" subtitle="Special requests, sponsors, accessibility, parking — anything we should know.">
            <Field label="Notes">
              <textarea rows={4} value={form.additionalNotes} onChange={e => set("additionalNotes", e.target.value)} className={`${inputCls} resize-none`} placeholder="Tell us anything that'll help us make your event a hit…" />
            </Field>
            <Field label="Submitted By"><input value={form.submittedBy} onChange={e => set("submittedBy", e.target.value)} className={inputCls} placeholder="Your name" /></Field>
          </Section>

          {/* Bottom actions */}
          {renderActions("bottom")}
        </div>
        )}
      </div>

      {/* Confirmation + agreement modal */}
      {showConfirm && (
        <ConfirmModal
          orgName={form.organizationName || orgName}
          signature={signature}
          setSignature={setSignature}
          agreed={agreed}
          setAgreed={setAgreed}
          submitting={submitting}
          error={submitError}
          onClose={() => !submitting && setShowConfirm(false)}
          onConfirm={handleSubmit}
        />
      )}
    </Shell>
  );
}

// ── Field label + control wrapper ─────────────────────────────────────────────
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// ── Stepper (mobile-responsive) ───────────────────────────────────────────────
function Stepper({ step, maxStep, onJump }: { step: number; maxStep: number; onJump: (n: number) => void }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          const reachable = s.n <= maxStep;
          return (
            <div key={s.n} className={i < STEPS.length - 1 ? "flex items-center flex-1" : "flex items-center"}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(s.n)}
                className={`flex items-center gap-2.5 ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all ${
                  active ? "bg-aubergine text-white ring-4 ring-aubergine/15"
                  : done ? "bg-peacock text-white"
                  : "bg-white text-ink-muted border border-ivory-200"}`}>
                  {done ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : s.n}
                </span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className={`block font-mono text-[9px] uppercase tracking-widest ${active ? "text-aubergine" : "text-ink-muted/60"}`}>Step {s.n}</span>
                  <span className={`block font-ui text-sm font-semibold ${active ? "text-ink" : done ? "text-ink/70" : "text-ink-muted"}`}>{s.label}</span>
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 sm:mx-3 rounded-full bg-ivory-200 overflow-hidden">
                  <div className={`h-full bg-peacock transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile current-step label */}
      <p className="sm:hidden mt-3 text-center font-ui text-sm font-semibold text-ink">
        <span className="font-mono text-[10px] uppercase tracking-widest text-aubergine mr-1.5">Step {step}/3</span>
        {STEPS[step - 1]?.label}
      </p>
    </div>
  );
}

// ── Step navigation buttons ───────────────────────────────────────────────────
function StepNav({ onBack, onContinue, continueLabel = "Continue →" }: { onBack?: () => void; onContinue: () => void; continueLabel?: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {onBack && (
        <button type="button" onClick={onBack} className="px-5 py-3.5 rounded-2xl font-ui font-semibold text-sm text-ink-muted hover:bg-ivory-200/60 transition-all">← Back</button>
      )}
      <button type="button" onClick={onContinue} className="flex-1 bg-aubergine text-white font-display font-bold text-base py-3.5 rounded-2xl hover:bg-aubergine-light transition-all">{continueLabel}</button>
    </div>
  );
}

const StarIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const CheckIcon = ({ className = "" }: { className?: string }) => <svg className={`w-4 h-4 shrink-0 mt-0.5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;

// ── Step 1 — Welcome, mission, offer, benefits, fees ──────────────────────────
function WelcomeStep({ orgName, offer, config, onContinue }: { orgName: string; offer: OnboardingOffer | null; config: OnboardingConfig | null; onContinue: () => void }) {
  const hasOffer = !!offer && !!(offer.headline || offer.details || offer.bonuses?.length || offer.requirements?.length);
  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="bg-white rounded-2xl border border-ivory-200 p-6 sm:p-8 text-center">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-marigold bg-marigold/10 px-3 py-1 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" /> Welcome to Rameelo
        </span>
        <h1 className="font-display font-bold text-ink text-3xl sm:text-4xl" style={{ letterSpacing: "-0.025em" }}>{RAMEELO_WELCOME}</h1>
        <p className="font-ui text-ink text-lg mt-2">
          {orgName ? <>We&apos;re thrilled to partner with <span className="text-aubergine font-semibold">{orgName}</span>.</> : "We're thrilled to partner with you."}
        </p>
        <p className="font-editorial italic text-ink-muted text-base sm:text-lg mt-4 max-w-xl mx-auto leading-relaxed">{RAMEELO_MISSION}</p>
      </section>

      {/* Admin-designed offer */}
      {hasOffer && offer && (
        <section className="bg-aubergine rounded-2xl p-6 sm:p-7 text-white">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold mb-2">Your special offer</p>
          {offer.headline && <h2 className="font-display font-bold text-2xl" style={{ letterSpacing: "-0.02em" }}>{offer.headline}</h2>}
          {offer.details && <p className="font-ui text-white/85 mt-2 leading-relaxed whitespace-pre-wrap">{offer.details}</p>}
          {offer.bonuses?.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-2">Special bonuses</p>
              <ul className="space-y-1.5">
                {offer.bonuses.map((b, i) => <li key={i} className="flex items-start gap-2 font-ui text-sm text-white/90"><span>🎁</span><span>{b}</span></li>)}
              </ul>
            </div>
          )}
          {offer.requirements?.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-2">What we ask of you</p>
              <ul className="space-y-1.5">
                {offer.requirements.map((rq, i) => <li key={i} className="flex items-start gap-2 font-ui text-sm text-white/90"><CheckIcon className="text-marigold" /><span>{rq}</span></li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Benefits */}
      <section className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-7">
        <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-1">Why Rameelo</p>
        <h2 className="font-display font-bold text-ink text-lg mb-4" style={{ letterSpacing: "-0.015em" }}>Everything you need to fill the floor</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {RAMEELO_BENEFITS.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-marigold/12 text-marigold flex items-center justify-center mt-0.5"><StarIcon /></span>
              <div>
                <p className="font-ui text-sm font-semibold text-ink">{b.title}</p>
                <p className="font-ui text-xs text-ink-muted leading-relaxed mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fee structure */}
      <section className="bg-peacock/8 rounded-2xl border border-peacock/20 p-5 sm:p-7">
        <p className="font-mono text-[9px] uppercase tracking-widest text-peacock mb-1">Simple, fair pricing</p>
        <h2 className="font-display font-bold text-ink text-lg mb-3" style={{ letterSpacing: "-0.015em" }}>You keep your ticket revenue</h2>
        <ul className="space-y-2">
          {RAMEELO_FEE_POINTS.map((p, i) => <li key={i} className="flex items-start gap-2.5 font-ui text-sm text-ink"><CheckIcon className="text-peacock" /><span className="leading-relaxed">{p}</span></li>)}
          <li className="flex items-start gap-2.5 font-ui text-sm text-ink"><CheckIcon className="text-peacock" /><span className="leading-relaxed">{achFeeLine(config?.achFreeTickets)}</span></li>
        </ul>
        <p className="font-ui text-xs text-ink-muted/80 italic mt-3 leading-relaxed">{RAMEELO_PROMO_NOTE}</p>
      </section>

      <StepNav onContinue={onContinue} continueLabel="Let's go →" />
    </div>
  );
}

// ── Step 2 — Rules of engagement, device tips, support ────────────────────────
function TermsStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-7">
        <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-1">Rules of engagement</p>
        <h2 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Onboarding Acknowledgments &amp; Agreements</h2>
        <p className="font-ui text-sm text-ink-muted mt-1.5 mb-4 leading-relaxed">{ONBOARDING_AGREEMENT_PREAMBLE}</p>
        <div className="space-y-4">
          {ONBOARDING_AGREEMENT_SECTIONS.map((s) => (
            <div key={s.n} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-aubergine/10 text-aubergine font-mono text-[10px] font-bold flex items-center justify-center mt-0.5">{s.n}</span>
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-ink">{s.title}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {s.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 font-ui text-[13px] text-ink-muted leading-relaxed">
                      <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-ink-muted/40" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="font-ui text-xs text-ink-muted mt-5 pt-4 border-t border-ivory-200">You&apos;ll formally accept these by typing your signature when you submit in the final step.</p>
      </section>

      <section className="bg-white rounded-2xl border border-ivory-200 p-5 sm:p-7">
        <p className="font-mono text-[9px] uppercase tracking-widest text-marigold mb-1">Door &amp; check-in</p>
        <h2 className="font-display font-bold text-ink text-lg mb-3" style={{ letterSpacing: "-0.015em" }}>Devices you&apos;ll need</h2>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-full bg-marigold/12 text-marigold flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" /></svg>
          </span>
          <p className="font-ui text-sm text-ink-muted leading-relaxed">{ONBOARDING_SCAN_TIP}</p>
        </div>
      </section>

      <section className="bg-aubergine/5 rounded-2xl border border-aubergine/15 p-5 sm:p-7">
        <p className="font-mono text-[9px] uppercase tracking-widest text-aubergine mb-1">We&apos;ve got your back</p>
        <h2 className="font-display font-bold text-ink text-lg mb-2" style={{ letterSpacing: "-0.015em" }}>Support whenever you need it</h2>
        <p className="font-ui text-sm text-ink-muted leading-relaxed">{ONBOARDING_SUPPORT_NOTE}</p>
        <a href={`mailto:${ONBOARDING_SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 mt-3 font-ui text-sm font-semibold text-aubergine hover:underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          {ONBOARDING_SUPPORT_EMAIL}
        </a>
      </section>

      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue to the form →" />
    </div>
  );
}

// ── Standalone shell (clean header + footer, no app nav) ──────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FCF9F2" }}>
      <header className="border-b border-ivory-200 bg-white/70 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo height={26} href="" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hidden sm:inline">Organizer Onboarding</span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-ivory-200 py-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/60">© Rameelo · The home for Garba in America</p>
      </footer>
    </div>
  );
}

// ── Document uploader ─────────────────────────────────────────────────────────
function FileUploader({ token, docs, setDocs, categories }: {
  token: string; docs: OnboardingDocument[]; setDocs: React.Dispatch<React.SetStateAction<OnboardingDocument[]>>; categories: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const supabase = useRef(createClient()).current;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError("");
    setUploading(true);

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) { setError(`"${file.name}" is over 25 MB and was skipped.`); continue; }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${token}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("onboarding-docs").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) { setError(upErr.message); continue; }
      const { data } = supabase.storage.from("onboarding-docs").getPublicUrl(path);
      setDocs(prev => [...prev, { name: file.name, url: data.publicUrl, size: file.size, type: file.type, category: "Other" }]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function setCategory(i: number, category: string) {
    setDocs(prev => prev.map((d, idx) => idx === i ? { ...d, category } : d));
  }
  function remove(i: number) {
    setDocs(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed border-ink-muted/20 hover:border-marigold/50 hover:bg-marigold/5 transition-all cursor-pointer px-4 py-6 text-center ${uploading ? "cursor-wait opacity-70" : ""}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
            <span className="font-ui text-sm text-ink-muted">Uploading…</span>
          </div>
        ) : (
          <>
            <svg className="w-6 h-6 text-ink-muted/40 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <p className="font-ui text-sm font-semibold text-ink">Upload flyers, logos, photos, videos…</p>
            <p className="font-mono text-[10px] text-ink-muted/60 mt-1">PDF, images, or video · up to 25 MB each</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" multiple onChange={handleFiles} className="hidden" accept="image/*,application/pdf,video/*" />
      {error && <p className="font-ui text-xs text-durga">{error}</p>}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ivory-200 bg-white px-3 py-2.5">
              <svg className="w-4 h-4 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="flex-1 min-w-[40%]">
                <p className="font-ui text-sm text-ink truncate">{d.name}</p>
                <p className="font-mono text-[10px] text-ink-muted/60">{(d.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <select value={d.category} onChange={e => setCategory(i, e.target.value)} className="font-mono text-[10px] uppercase tracking-wide rounded-lg border border-ivory-200 bg-ivory/50 px-2 py-1.5 text-ink-muted focus:outline-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => remove(i)} className="text-ink-muted/40 hover:text-durga transition-colors shrink-0 p-1 -m-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confirmation + binding agreement modal ────────────────────────────────────
function ConfirmModal({ orgName, signature, setSignature, agreed, setAgreed, submitting, error, onClose, onConfirm }: {
  orgName: string;
  signature: string; setSignature: (v: string) => void;
  agreed: boolean; setAgreed: (v: boolean) => void;
  submitting: boolean; error: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const canSubmit = agreed && signature.trim().length >= 2 && !submitting;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-ivory-200">
          <h3 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Almost there! 🪔</h3>
          <p className="font-ui text-sm text-ink-muted mt-1">Please confirm everything looks right and agree to partner with Rameelo.</p>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="rounded-xl bg-marigold/8 border border-marigold/25 px-4 py-3">
            <p className="font-ui text-sm text-ink leading-relaxed">
              <span className="font-semibold">I confirm</span> that the information I&apos;ve provided for{" "}
              <span className="font-semibold text-aubergine">{orgName || "my organization"}</span> is complete and accurate to the best of my knowledge.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">Onboarding Acknowledgments &amp; Agreements · v{ONBOARDING_AGREEMENT_VERSION}</p>
            <div className="rounded-xl border border-ivory-200 bg-ivory/40 px-4 py-3 max-h-44 overflow-y-auto">
              <pre className="font-ui text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap">{ONBOARDING_AGREEMENT_TEXT}</pre>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-aubergine shrink-0" />
            <span className="font-ui text-sm text-ink leading-relaxed">{ONBOARDING_AGREEMENT_SUMMARY} I understand this is a binding acknowledgment.</span>
          </label>

          <div className="rounded-xl border border-ivory-200 bg-ivory/40 p-4 space-y-3">
            <p className="font-ui text-sm text-ink leading-relaxed">
              By typing my name and today&apos;s date below, I am <span className="font-semibold">electronically signing</span> this agreement and confirm that I agree to <span className="font-semibold">all of the terms and conditions</span> above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Signature — type your full name *</label>
                <input value={signature} onChange={e => setSignature(e.target.value)} className={`${inputCls} font-editorial italic`} placeholder="Your full name" />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input readOnly value={today} className={`${inputCls} bg-ivory/60 text-ink-muted cursor-default`} />
              </div>
            </div>
          </div>

          {error && <p className="font-ui text-sm text-durga">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-ivory-200 flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="px-5 py-3 rounded-2xl font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-all disabled:opacity-50">
            Back
          </button>
          <button type="button" onClick={onConfirm} disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2 bg-aubergine text-white font-display font-bold text-sm py-3 rounded-2xl hover:bg-aubergine-light transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting…</> : "Agree & Submit 🎉"}
          </button>
        </div>
      </div>
    </div>
  );
}
