"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BUDGET_OPTIONS = [
  "Under $500",
  "$500 – $1,000",
  "$1,000 – $5,000",
  "$5,000 – $10,000",
  "$10,000+",
  "Not sure yet",
];

const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 block";

export default function SponsorPage() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName]   = useState("");
  const [email, setEmail]               = useState("");
  const [phone, setPhone]               = useState("");
  const [website, setWebsite]           = useState("");
  const [category, setCategory]         = useState("");
  const [goals, setGoals]               = useState("");
  const [budget, setBudget]             = useState("");
  const [message, setMessage]           = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState("");

  const valid = businessName.trim() && contactName.trim() && email.includes("@");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    // Generate the id client-side: anon can't SELECT the row back under RLS, and
    // we need the id to fire the admin-notification email.
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const { error: err } = await supabase.from("sponsorship_inquiries").insert({
      id,
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      website: website.trim() || null,
      category: category.trim() || null,
      goals: goals.trim() || null,
      budget: budget || null,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (err) { setError("Something went wrong. Please try again."); return; }
    setSubmitted(true);
    // Email all platform admins the inquiry (non-blocking).
    fetch("/api/sponsorship-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId: id }),
    }).catch(() => { /* silent — notification shouldn't block the thank-you */ });
  }

  return (
    <div className="bg-ivory min-h-screen">
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #2E1B30 0%, #3D2543 100%)" }} className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/70 mb-3">Advertise with Rameelo</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-4" style={{ letterSpacing: "-0.03em" }}>
            Put your brand in front of thousands
          </h1>
          <p className="font-ui text-white/60 text-base max-w-xl mx-auto leading-relaxed">
            Rameelo reaches an engaged Gujarati-diaspora community at Garba &amp; Navratri events across the US. Reach them on member dashboards, event pages, and emails. Tell us what you&rsquo;re after and we&rsquo;ll build a package that fits.
          </p>
          {/* Reach stats */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-8">
            {[
              { v: "80K+", l: "Members" },
              { v: "100s", l: "Events / yr" },
              { v: "Nationwide", l: "US reach" },
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-3">
                <p className="font-display font-bold text-white text-lg">{s.v}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {submitted ? (
          <div className="rounded-2xl bg-white border border-ivory-200 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-peacock/10 border border-peacock/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="font-display font-bold text-ink text-2xl mb-2">Thanks — we&rsquo;ll be in touch!</h2>
            <p className="font-ui text-ink-muted text-sm mb-6 max-w-md mx-auto">
              We&rsquo;ve got your details and our team will reach out to <strong className="text-ink">{email}</strong> to build a sponsorship that fits your goals.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
              Back to Rameelo →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-ivory-200">
              <h2 className="font-display font-bold text-ink text-xl">Become a sponsor</h2>
              <p className="font-ui text-ink-muted text-sm mt-0.5">Tell us about your business and what you&rsquo;re looking for.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Business name *</label>
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Patel Family Dentistry" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Your name *</label>
                  <input type="text" autoComplete="name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Priya Patel" className={inputCls} required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Phone <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
                  <input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 867-5309" className={inputCls} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Website <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
                  <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="yourbusiness.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Industry / category <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Real estate, food, retail" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>What are you looking for?</label>
                <textarea rows={3} value={goals} onChange={e => setGoals(e.target.value)}
                  placeholder="e.g. Reach families in NJ & NY, promote a grand opening, sponsor a specific event or city…"
                  className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Budget range</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map(b => (
                    <button key={b} type="button" onClick={() => setBudget(b)}
                      className={`px-3 py-2.5 rounded-xl border-2 font-ui font-semibold text-xs transition-all ${budget === b ? "border-aubergine bg-aubergine/5 text-aubergine" : "border-ivory-200 text-ink-muted hover:border-aubergine/30"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Anything else? <span className="text-ink-muted/50 normal-case font-ui font-normal">(optional)</span></label>
                <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Questions, timing, ideas…" className={`${inputCls} resize-none`} />
              </div>

              {error && (
                <div className="rounded-xl bg-durga/8 border border-durga/20 px-4 py-3">
                  <p className="font-ui text-sm text-durga">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!valid || submitting}
                className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${valid && !submitting ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-sm" : "bg-ivory-200 text-ink-muted cursor-not-allowed"}`}
              >
                {submitting ? "Sending…" : "Submit sponsorship inquiry →"}
              </button>
              <p className="text-center font-mono text-[10px] text-ink-muted">No commitment — we&rsquo;ll reach out to talk options.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
