"use client";

import { useState } from "react";

// The exact request template support needs to correct a guest-checkout email.
// Kept as one string so the on-screen copy and the prefilled mailto stay identical.
const SUPPORT_EMAIL = "support@rameelo.com";
const SUBJECT = "Guest Checkout — Wrong Email Correction Request";
const TEMPLATE = `Hello Rameelo Support,

I entered the wrong email address when purchasing tickets through Guest Checkout and would like my order updated.

Event Name:
Number of Tickets:
Purchaser Name:
Incorrect Email:
Correct Email:
Purchase Date (Approx.):
Total Amount Charged:
Last 4 Digits of Card:

Attached:

Screenshot of the transaction/charge confirmation

I confirm that I am the purchaser of this order and request that the email on my order be updated to the correct email listed above.

Thank you,
Name:
Phone Number:`;

export default function EmailTemplate() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the visible text can still be selected manually */
    }
  }

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(TEMPLATE)}`;

  return (
    <div className="rounded-2xl border border-ivory-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ivory-200 bg-ivory">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          Email to {SUPPORT_EMAIL}
        </p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs text-aubergine hover:text-aubergine/70 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy template
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-4 font-mono text-[12px] leading-relaxed text-ink whitespace-pre-wrap break-words">
{TEMPLATE}
      </pre>
      <div className="px-4 py-3 border-t border-ivory-200">
        <a
          href={mailto}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm text-aubergine hover:opacity-90 transition-all"
          style={{ backgroundColor: "#F5A623" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Open a pre-filled email
        </a>
        <p className="font-ui text-[11px] text-ink-muted mt-2">
          This opens your email app with the subject and template ready — just fill in your details and attach your charge screenshot.
        </p>
      </div>
    </div>
  );
}
