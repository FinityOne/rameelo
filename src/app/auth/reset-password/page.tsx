"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";

  // Supabase writes the recovery session from the URL hash automatically.
  // Listen for the PASSWORD_RECOVERY event to confirm the session is active.
  useEffect(() => {
    const supabase = createClient();

    // Check if there's already an active session (e.g. user revisits the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Timeout: if no session after 5s, the link is likely expired
    const timeout = setTimeout(() => {
      if (!sessionReady) setSessionError(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;
  const valid = password.length >= 8 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/portal"), 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#2E1B30" }}>
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #F5A623 0%, transparent 55%), radial-gradient(circle at 80% 20%, #7C1F2C 0%, transparent 50%)" }}
      />

      <div className="relative w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
            <span className="font-display font-bold text-aubergine text-lg">R</span>
          </div>
          <span className="font-display font-bold text-white text-xl">Rameelo</span>
        </Link>

        {done ? (
          /* ── Success ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-peacock/20 border border-peacock/30 flex items-center justify-center mx-auto mb-5 text-3xl">
              ✅
            </div>
            <h1 className="font-display font-bold text-white text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              Password updated!
            </h1>
            <p className="font-ui text-white/50 text-sm">
              Redirecting you to your portal…
            </p>
            <div className="mt-4 flex justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-marigold animate-spin" />
            </div>
          </div>
        ) : sessionError && !sessionReady ? (
          /* ── Link expired ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-durga/20 border border-durga/30 flex items-center justify-center mx-auto mb-5 text-3xl">
              ⏰
            </div>
            <h1 className="font-display font-bold text-white text-2xl mb-3" style={{ letterSpacing: "-0.02em" }}>
              Link expired
            </h1>
            <p className="font-ui text-white/50 text-sm leading-relaxed mb-6">
              This password reset link has expired or already been used. Request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="block w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark transition-all text-center"
            >
              Request new link →
            </Link>
            <Link href="/auth/signin" className="block mt-4 text-center font-ui text-sm text-white/40 hover:text-white/60 transition-colors">
              ← Back to sign in
            </Link>
          </div>
        ) : !sessionReady ? (
          /* ── Loading session ── */
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-marigold animate-spin mx-auto mb-4" />
            <p className="font-ui text-white/50 text-sm">Verifying your reset link…</p>
          </div>
        ) : (
          /* ── Password form ── */
          <>
            <div className="mb-8">
              <h1 className="font-display font-bold text-white text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>
                New password
              </h1>
              <p className="font-ui text-white/50 text-sm">
                Choose a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">
                  New password
                </label>
                <input
                  type="password"
                  autoFocus
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8+ characters"
                  className={inputCls}
                  required
                  minLength={8}
                />
                {tooShort && (
                  <p className="font-mono text-[10px] text-durga/80 mt-1.5">Must be at least 8 characters</p>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">
                  Confirm password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Same password again"
                  className={`${inputCls} ${mismatch ? "border-durga/50 focus:ring-durga/30" : ""}`}
                  required
                />
                {mismatch && (
                  <p className="font-mono text-[10px] text-durga/80 mt-1.5">Passwords don&apos;t match</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                  <p className="font-ui text-sm text-white/80">{error}</p>
                </div>
              )}

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[0-9]/.test(password),
                      /[^A-Za-z0-9]/.test(password),
                    ].map((met, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${met ? "bg-peacock" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-white/30">
                    {password.length < 8 ? "Too short" :
                      [/[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length === 0 ? "Weak" :
                      [/[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length === 1 ? "Fair" :
                      [/[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length === 2 ? "Good" : "Strong"}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !valid}
                className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Updating…</>
                ) : (
                  "Set new password →"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
