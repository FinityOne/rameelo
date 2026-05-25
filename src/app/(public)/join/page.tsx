"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Inner component (needs useSearchParams inside Suspense) ───────────────────

function JoinPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const ref          = searchParams.get("ref") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    document.title = "Join Rameelo — The Garba Community";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { firstName, lastName, referredBy: ref || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authErr) { setError(authErr.message); setLoading(false); return; }

      if (data.user) {
        // Upsert profile row — include referred_by code
        await supabase.from("profiles").upsert({
          id:         data.user.id,
          first_name: firstName,
          last_name:  lastName,
          email,
        }, { onConflict: "id" });
      }

      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl"
            style={{ backgroundColor: "#1B2F5E15" }}>🎉</div>
          <div>
            <h2 className="font-display font-bold text-2xl text-ink" style={{ letterSpacing: "-0.02em" }}>
              Welcome to Rameelo!
            </h2>
            <p className="font-ui text-sm text-ink-muted mt-2">
              Check your inbox — we sent a confirmation link to <span className="font-semibold text-ink">{email}</span>.
            </p>
          </div>
          <p className="font-ui text-xs text-ink/40">Once confirmed, you can sign in and collect your first Garba stamp.</p>
          <Link href="/auth/signin"
            className="inline-block w-full py-3.5 rounded-xl font-ui font-bold text-white text-sm text-center transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1B2F5E" }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FCF9F2" }}>

      {/* Minimal nav */}
      <div className="px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>
          Rameelo
        </Link>
        <Link href="/auth/signin" className="font-ui text-sm text-ink/50 hover:text-ink transition-colors">
          Sign in
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-sm w-full space-y-8">

          {/* Hero */}
          <div className="text-center space-y-3">
            {ref && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono"
                style={{ borderColor: "#1B2F5E25", backgroundColor: "#1B2F5E08", color: "#1B2F5E99" }}>
                <span>🪈</span>
                <span>Invited by code <span className="font-bold text-[#1B2F5E]">{ref}</span></span>
              </div>
            )}
            <h1 className="font-display font-bold text-3xl text-ink" style={{ letterSpacing: "-0.03em" }}>
              Join the garba community
            </h1>
            <p className="font-ui text-sm text-ink-muted leading-relaxed">
              Rameelo connects you with garba & navratri events across the US. Buy tickets, find your crew, and collect stamps at every event.
            </p>
          </div>

          {/* Signup form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Priya"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 rounded-xl border border-ivory-300 bg-white font-ui text-sm text-ink placeholder-ink/25 focus:outline-none focus:border-[#1B2F5E]/40 focus:ring-2 focus:ring-[#1B2F5E]/10 transition-all"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Shah"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 rounded-xl border border-ivory-300 bg-white font-ui text-sm text-ink placeholder-ink/25 focus:outline-none focus:border-[#1B2F5E]/40 focus:ring-2 focus:ring-[#1B2F5E]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-ivory-300 bg-white font-ui text-sm text-ink placeholder-ink/25 focus:outline-none focus:border-[#1B2F5E]/40 focus:ring-2 focus:ring-[#1B2F5E]/10 transition-all"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8+ characters"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-ivory-300 bg-white font-ui text-sm text-ink placeholder-ink/25 focus:outline-none focus:border-[#1B2F5E]/40 focus:ring-2 focus:ring-[#1B2F5E]/10 transition-all"
              />
            </div>

            {error && (
              <p className="font-ui text-xs text-durga bg-durga/5 border border-durga/15 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-ui font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: "#1B2F5E" }}>
              {loading ? "Creating account…" : "Create my Garba Passport →"}
            </button>

            <p className="font-ui text-[11px] text-ink/30 text-center leading-relaxed">
              By joining you agree to our{" "}
              <Link href="/help" className="underline underline-offset-2 hover:text-ink/50">Terms</Link>
              {" & "}
              <Link href="/help" className="underline underline-offset-2 hover:text-ink/50">Privacy Policy</Link>.
            </p>
          </form>

          {/* 3 value props */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: "🎟️", label: "Buy tickets to any garba event" },
              { icon: "🪪", label: "Collect stamps at every event" },
              { icon: "👯", label: "Go with your crew — group discounts" },
            ].map(({ icon, label }) => (
              <div key={label} className="text-center space-y-1.5">
                <div className="text-xl">{icon}</div>
                <p className="font-ui text-[10px] text-ink/45 leading-snug">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Export with Suspense (required for useSearchParams) ───────────────────────

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-7 h-7 rounded-full border-2 border-ivory-200 border-t-[#1B2F5E] animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
