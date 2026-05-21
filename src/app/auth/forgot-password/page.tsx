"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Forgot Password | Rameelo"; }, []);

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#2E1B30" }}>
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #F5A623 0%, transparent 55%), radial-gradient(circle at 80% 20%, #7C1F2C 0%, transparent 50%)" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo variant="white" height={32} />
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-peacock/20 border border-peacock/30 flex items-center justify-center mx-auto mb-5 text-3xl">
              📬
            </div>
            <h1 className="font-display font-bold text-white text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              Check your inbox
            </h1>
            <p className="font-ui text-white/50 text-sm leading-relaxed mb-2">
              We sent a password reset link to
            </p>
            <p className="font-mono text-marigold text-sm mb-6">{email}</p>
            <p className="font-ui text-white/40 text-xs leading-relaxed mb-8">
              The link expires in 1 hour. If you don&apos;t see it, check your spam folder.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="w-full py-3 rounded-2xl border border-white/15 bg-white/5 text-white font-ui font-semibold text-sm hover:bg-white/10 transition-all"
              >
                Send to a different email
              </button>
              <Link
                href="/auth/signin"
                className="block w-full py-3 rounded-2xl text-center font-ui text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="mb-8">
              <h1 className="font-display font-bold text-white text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>
                Reset password
              </h1>
              <p className="font-ui text-white/50 text-sm leading-relaxed">
                Enter your email and we&apos;ll send you a link to create a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">
                  Email address
                </label>
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className={inputCls}
                  required
                />
              </div>

              {error && (
                <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                  <p className="font-ui text-sm text-white/80">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending…</>
                ) : (
                  "Send reset link →"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/auth/signin"
                className="font-ui text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
