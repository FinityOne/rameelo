"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ISSUE_TYPES, srRef } from "@/lib/support";

const MAX_FILE_MB = 10;

function RequestForm() {
  const params = useSearchParams();
  const presetType = params.get("type") ?? "";

  const [issueType, setIssueType] = useState(presetType);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill from the signed-in member (if any) so logged-in users skip retyping.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        setName([prof.first_name, prof.last_name].filter(Boolean).join(" "));
        setEmail(prof.email ?? user.email ?? "");
      } else {
        setEmail(user.email ?? "");
      }
    })();
  }, []);

  useEffect(() => { if (presetType) setIssueType(presetType); }, [presetType]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("");
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File must be under ${MAX_FILE_MB}MB.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  const valid = issueType && description.trim().length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

    // 1) Optional attachment → public bucket under an unguessable path.
    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    if (file) {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const path = `${id}/${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(16)}${ext}`;
      const { error: upErr } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setSubmitting(false);
        setError("We couldn't upload your file. Try a smaller file, or submit without it.");
        return;
      }
      const { data: urlData } = supabase.storage.from("support-attachments").getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
      attachmentName = file.name;
    }

    // 2) Insert the request (anon-insertable under RLS).
    const { error: insErr } = await supabase.from("support_requests").insert({
      id,
      user_id: userId,
      name: name.trim() || null,
      email: email.trim().toLowerCase(),
      issue_type: issueType,
      reference: reference.trim() || null,
      description: description.trim(),
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    });
    if (insErr) {
      setSubmitting(false);
      setError("Something went wrong submitting your request. Please try again.");
      return;
    }

    // 3) Fire confirmation + admin alert emails (non-blocking).
    fetch("/api/support-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id }),
    }).catch(() => { /* notification shouldn't block the thank-you */ });

    setSubmitting(false);
    setSubmittedRef(srRef(id));
  }

  // ── Success state ──
  if (submittedRef) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-peacock/10 text-peacock flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="font-display font-bold text-ink text-2xl sm:text-3xl mb-3" style={{ letterSpacing: "-0.025em" }}>
          Your request is in — we hear you
        </h1>
        <p className="font-ui text-ink-muted text-base leading-relaxed mb-2">
          We&rsquo;ve emailed a confirmation to <span className="text-ink font-medium">{email.trim().toLowerCase()}</span> and our
          support team will follow up, typically within <strong className="text-ink">1–2 business days</strong>.
        </p>
        <p className="font-mono text-xs text-ink-muted mb-8">
          Your reference: <span className="font-bold text-ink">{submittedRef}</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/help" className="px-5 py-3 rounded-2xl font-display font-bold text-sm text-aubergine" style={{ backgroundColor: "#F5A623" }}>
            Back to Help Center
          </Link>
          <Link href="/events" className="font-ui font-semibold text-ink-muted text-sm hover:text-ink transition-colors">
            Browse events →
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <nav className="flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        <Link href="/help" className="hover:text-aubergine transition-colors">Help Center</Link>
        <span>/</span>
        <span className="text-ink">Submit a request</span>
      </nav>

      <h1 className="font-display font-bold text-ink text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
        Submit a request
      </h1>
      <p className="font-ui text-ink-muted text-base mt-3 mb-8 leading-relaxed">
        Having trouble with tickets, your account, or an order? Tell us what&rsquo;s going on and we&rsquo;ll get it sorted.
        You&rsquo;ll get an email confirmation with a reference number right away.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-ivory-200 p-6 space-y-5">
        {/* Issue type */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">What do you need help with? <span className="text-durga">*</span></label>
          <select
            value={issueType}
            onChange={e => setIssueType(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
          >
            <option value="" disabled>Select an issue type…</option>
            {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Reference */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Order or receipt number <span className="text-ink-muted/60 normal-case tracking-normal font-ui">(optional)</span></label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="e.g. RM-1A2B3C4D5E"
            className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Describe the issue <span className="text-durga">*</span></label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell us what happened — include the event name, the email you used at checkout, and any other details that help us find your order."
            className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all resize-none"
          />
          <p className="font-mono text-[9px] text-ink-muted/70 mt-1">{description.trim().length < 10 ? "A little more detail helps us resolve it faster." : "Looks good."}</p>
        </div>

        {/* Name + Email */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Your name <span className="text-ink-muted/60 normal-case tracking-normal font-ui">(optional)</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Priya Shah"
              className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Your email <span className="text-durga">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 bg-ivory font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
            />
            <p className="font-mono text-[9px] text-ink-muted/70 mt-1">We&rsquo;ll send updates here. Use the email on your account if you have one.</p>
          </div>
        </div>

        {/* Attachment */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-1.5">Attach a document or proof <span className="text-ink-muted/60 normal-case tracking-normal font-ui">(optional)</span></label>
          {file ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-ivory-200 bg-ivory">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-aubergine shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="font-ui text-sm text-ink truncate">{file.name}</span>
              </div>
              <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="font-ui text-xs font-semibold text-durga hover:underline shrink-0">Remove</button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed border-ivory-200 bg-ivory cursor-pointer hover:border-aubergine/40 transition-all">
              <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span className="font-ui text-sm text-ink-muted">Choose a file (screenshot, receipt, ID) — up to {MAX_FILE_MB}MB</span>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={onPickFile} className="hidden" />
            </label>
          )}
          {fileError && <p className="font-ui text-xs text-durga font-medium mt-1.5">{fileError}</p>}
        </div>

        {error && <p className="font-ui text-sm text-durga font-medium">{error}</p>}

        <button
          type="submit"
          disabled={!valid || submitting}
          className={`w-full py-3 rounded-xl font-display font-bold text-sm transition-all inline-flex items-center justify-center gap-2 ${valid && !submitting ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}
        >
          {submitting
            ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Submitting…</>
            : "Submit request"}
        </button>
        <p className="font-mono text-[9px] text-ink-muted/70 text-center">
          You&rsquo;ll receive an email confirmation with your reference number.
        </p>
      </form>
    </div>
  );
}

export default function SupportRequestPage() {
  return (
    <div className="bg-ivory min-h-screen">
      <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" /></div>}>
        <RequestForm />
      </Suspense>
    </div>
  );
}
