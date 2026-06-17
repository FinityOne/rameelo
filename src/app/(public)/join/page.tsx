"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createUser, saveUser, type UserRole } from "@/lib/auth";
import OtpVerify, { type VerifyResult } from "@/app/auth/OtpVerify";

function JoinPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const ref          = searchParams.get("ref") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [step,      setStep]      = useState<"form" | "code">("form");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => { document.title = "Join Rameelo"; }, []);

  // Submit info → email a 6-digit code (passwordless account created server-side).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccountExists(false);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "signup", firstName, lastName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send a code. Please try again.");
        if (data.code === "account_exists") setAccountExists(true);
        return;
      }
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Code verified → session set server-side. Fire welcome + admin alert, then route.
  function onVerified(data: VerifyResult) {
    saveUser(createUser({ firstName, lastName, email, phone: "", city: "", state: "", role: (data.role ?? "user") as UserRole }));
    fetch("/api/send-welcome", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email }),
    }).catch(() => {});
    if (data.userId) {
      fetch("/api/new-user-notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.userId }),
      }).catch(() => {});
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10" style={{ backgroundColor: "#2E1B30" }}>
      <div className="mb-8">
        <Link href="/" className="font-display font-bold text-white text-xl" style={{ letterSpacing: "-0.01em" }}>
          Rameelo
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">

        {/* Ref badge */}
        {ref && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-marigold/12 border border-marigold/20 mb-5 w-fit">
            <span>🪈</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-marigold">Invite: {ref}</span>
          </div>
        )}

        <h1 className="font-display font-bold text-white text-3xl mb-1" style={{ letterSpacing: "-0.02em" }}>
          Join Rameelo
        </h1>
        <p className="font-ui text-white/45 text-sm mb-7">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-marigold font-semibold hover:text-marigold-dark">Sign in →</Link>
        </p>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-1.5 block">First name</label>
                <input type="text" autoComplete="given-name" value={firstName}
                  onChange={e => setFirstName(e.target.value)} placeholder="Priya" required
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-1.5 block">Last name</label>
                <input type="text" autoComplete="family-name" value={lastName}
                  onChange={e => setLastName(e.target.value)} placeholder="Patel" required
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all" />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-1.5 block">Email</label>
              <input type="email" autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all" />
              <p className="font-ui text-xs text-white/30 mt-2">No password — we&rsquo;ll email you a 6-digit code to confirm your account.</p>
            </div>

            {error && (
              <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3 space-y-1">
                <p className="font-ui text-sm text-white/80">{error}</p>
                {accountExists && (
                  <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}
                    className="inline-block font-ui text-xs text-marigold font-semibold hover:text-marigold-dark">
                    Sign in instead →
                  </Link>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !firstName || !lastName || !email}
              className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all mt-1 bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending code…</> : "Send me a code →"}
            </button>
          </form>
        ) : (
          <OtpVerify
            email={email.trim()}
            purpose="signup"
            requestPayload={{ email: email.trim(), purpose: "signup", firstName, lastName }}
            onVerified={onVerified}
            onBack={() => { setStep("form"); setError(""); }}
          />
        )}

        <p className="mt-6 text-center font-mono text-[9px] text-white/20">
          By joining you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#2E1B30" }}>
        <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-marigold animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
