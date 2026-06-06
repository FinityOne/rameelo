"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createUser, saveUser } from "@/lib/auth";

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

  useEffect(() => { document.title = "Join Rameelo"; }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName, referredBy: ref || undefined },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (authErr) {
      const msg = authErr.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email already exists.");
      } else {
        setError(authErr.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      const user = createUser({ firstName, lastName, email, phone: "", city: "", state: "" });
      saveUser(user);
      // Welcome email — pass the new user's token so the API verifies them.
      const accessToken = data.session?.access_token;
      fetch("/api/send-welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ firstName, email }),
      }).catch(() => {});
    }

    if (data.session) {
      router.push("/portal");
      router.refresh();
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#2E1B30" }}>
      <div className="text-center space-y-5 max-w-xs">
        <div className="text-4xl">📬</div>
        <div>
          <h2 className="font-display font-bold text-white text-2xl mb-2">Check your email</h2>
          <p className="font-ui text-white/50 text-sm">
            Confirmation sent to <span className="text-marigold">{email}</span>. Click the link to activate your account.
          </p>
        </div>
        <Link href="/auth/signin" className="block font-ui text-sm text-white/40 hover:text-white/60 transition-colors">
          Sign in →
        </Link>
      </div>
    </div>
  );

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
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-1.5 block">Password</label>
            <input type="password" autoComplete="new-password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="8+ characters" required
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all" />
          </div>

          {error && (
            <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3 space-y-1">
              <p className="font-ui text-sm text-white/80">{error}</p>
              {error.includes("already exists") && (
                <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}
                  className="inline-block font-ui text-xs text-marigold font-semibold hover:text-marigold-dark">
                  Sign in instead →
                </Link>
              )}
            </div>
          )}

          <button type="submit" disabled={loading || !firstName || !lastName || !email || !password}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all mt-1 bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? "Creating account…" : "Create My Account →"}
          </button>
        </form>

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
