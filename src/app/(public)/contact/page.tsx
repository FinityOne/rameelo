"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = `Name: ${name}\n\n${message}`;
    window.location.href = `mailto:support@rameelo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="bg-ivory min-h-screen">
      {/* Hero */}
      <div style={{ backgroundColor: "#2E1B30" }} className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold/70 mb-3">Get in touch</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-4" style={{ letterSpacing: "-0.03em" }}>
            We&rsquo;d love to hear from you
          </h1>
          <p className="font-ui text-white/50 text-base max-w-xl mx-auto">
            Questions about tickets, organizer inquiries, or just want to say hello — we&rsquo;re reachable by email or text.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Email form */}
          <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-ivory-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-aubergine/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Send an Email</p>
                <p className="font-mono text-[10px] text-ink-muted">support@rameelo.com</p>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Priya Shah"
                  className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ticket question / Organizer inquiry"
                  className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-display font-bold text-sm text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: "#2E1B30" }}
              >
                Open in Email App →
              </button>
              <p className="font-mono text-[9px] text-ink-muted text-center">
                Opens your default mail client pre-filled
              </p>
              <p className="font-ui text-[11px] text-ink-muted text-center leading-relaxed border-t border-ivory-200 pt-3">
                Questions, tickets &amp; order issues go to{" "}
                <a href="mailto:support@rameelo.com" className="text-aubergine font-semibold hover:underline">support@rameelo.com</a>.
                <br />
                Just saying hello or exploring a partnership?{" "}
                <a href="mailto:hello@rameelo.com" className="text-aubergine font-semibold hover:underline">hello@rameelo.com</a>
              </p>
            </form>
          </div>

          {/* Text / Phone */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-ivory-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-ivory-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-peacock/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>Text Us</p>
                  <p className="font-mono text-[10px] text-ink-muted">SMS only · (949) 867-0499</p>
                </div>
              </div>

              <div className="p-6">
                <p className="font-ui text-sm text-ink-muted leading-relaxed mb-5">
                  Prefer to text? Send us an SMS and we&rsquo;ll get back to you shortly. Please note this number is for <strong className="text-ink">text messages only</strong> — calls will not be answered.
                </p>
                <a
                  href="sms:+19498670499"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-display font-bold text-sm text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: "#0E8C7A" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Send a Text →
                </a>
                <p className="font-mono text-[9px] text-ink-muted text-center mt-2">(949) 867-0499 · Text messages only</p>
              </div>
            </div>

            {/* Response time note */}
            <div className="rounded-2xl border border-marigold/25 bg-marigold/5 p-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-marigold-dark font-bold mb-2">Response Times</p>
              <ul className="space-y-2 font-ui text-sm text-ink-muted">
                <li className="flex items-start gap-2">
                  <span className="text-marigold mt-0.5">✦</span>
                  <span>Email — typically within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-marigold mt-0.5">✦</span>
                  <span>Text — typically within a few hours</span>
                </li>
              </ul>
            </div>

            {/* Organizer shortcut */}
            <div className="rounded-2xl border border-ivory-200 bg-white p-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Organizers</p>
              <p className="font-ui text-sm text-ink-muted mb-3 leading-relaxed">
                Want to list your garba event on Rameelo? Check out our organizer hub for a faster path.
              </p>
              <Link
                href="/organizers"
                className="font-ui font-semibold text-aubergine text-sm hover:text-aubergine/70 transition-colors"
              >
                Visit Organizer Hub →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
