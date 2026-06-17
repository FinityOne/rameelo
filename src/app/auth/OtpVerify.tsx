"use client";

import { useState } from "react";

export type VerifyResult = {
  ok: boolean; role: string; isNewUser: boolean;
  userId: string; firstName: string | null; lastName: string | null; email: string;
};

// Shared 6-digit code entry for the passwordless signup/login flows. The parent
// already requested the first code; this handles entry, verification, and resend.
export default function OtpVerify({ email, purpose, requestPayload, onVerified, onBack }: {
  email: string;
  purpose: "login" | "signup";
  requestPayload: Record<string, unknown>;
  onVerified: (data: VerifyResult) => Promise<void> | void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState("");

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not verify the code."); setVerifying(false); return; }
      await onVerified(data as VerifyResult);
      // Leave the spinner on — the parent redirects.
    } catch {
      setError("Something went wrong. Please try again.");
      setVerifying(false);
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    setResentMsg("");
    setError("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not resend the code."); }
      else { setResentMsg("A new code is on its way."); setTimeout(() => setResentMsg(""), 4000); }
    } finally {
      setResending(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-4 font-display font-bold text-2xl text-center text-white tracking-[0.5em] placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <p className="font-ui text-sm text-white/70">
          We emailed a 6-digit code to <span className="text-white font-semibold">{email}</span>.
        </p>
        <button type="button" onClick={onBack} className="font-ui text-xs text-marigold hover:text-marigold-dark transition-colors mt-1">
          Use a different email
        </button>
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">Enter code</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          className={inputCls}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
          <p className="font-ui text-sm text-white/80">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={verifying || code.length !== 6}
        className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {verifying ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Verifying…</> : (purpose === "signup" ? "Create account →" : "Sign in →")}
      </button>

      <div className="text-center">
        <button type="button" onClick={resend} disabled={resending} className="font-ui text-xs text-white/50 hover:text-white/80 transition-colors">
          {resending ? "Sending…" : resentMsg || "Didn't get it? Resend code"}
        </button>
      </div>
    </form>
  );
}
