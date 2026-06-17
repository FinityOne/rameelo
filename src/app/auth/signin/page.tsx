"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createUser, saveUser, type UserRole } from "@/lib/auth";
import OtpVerify, { type VerifyResult } from "../OtpVerify";

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only allow same-site relative paths as a post-login destination.
  const rawNext = searchParams.get("next") ?? "";
  const nextDest = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => { document.title = "Sign In | Rameelo"; }, []);

  // Email-only → send a 6-digit code.
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNoAccount(false);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "login" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send a code. Please try again.");
        if (data.code === "no_account") setNoAccount(true);
        return;
      }
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Session cookies are already set server-side; mirror display data + route.
  function onVerified(data: VerifyResult) {
    const role = (data.role ?? "user") as UserRole;
    saveUser(createUser({
      firstName: data.firstName || email.split("@")[0],
      lastName: data.lastName || "Member",
      email: data.email || email, phone: "", city: "", state: "", role,
    }));
    const destination = nextDest || (role === "admin" ? "/admin" : role === "organizer" ? "/organizer" : "/portal");
    router.push(destination);
    router.refresh();
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#2E1B30" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 30% 70%, #F5A623 0%, transparent 60%), radial-gradient(circle at 80% 20%, #7C1F2C 0%, transparent 50%)" }}
        />
        <Logo variant="white" height={32} />

        <div className="relative space-y-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold">Welcome back</p>
          <h2 className="font-display font-bold text-white text-4xl leading-tight">
            Your garba<br />community is<br /><span className="text-marigold">waiting for you.</span>
          </h2>
          <div className="space-y-4">
            {[
              { icon: "🎟️", text: "All your tickets in one place" },
              { icon: "👥", text: "Group orders with your crew" },
              { icon: "🎶", text: "Personalized event recommendations" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="font-ui text-white/70 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex -space-x-2">
            {["PP", "RS", "MD", "KD", "AR"].map((i, idx) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-aubergine flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: ["#7C1F2C","#0E8C7A","#D4891B","#5a1e7a","#892240"][idx] }}>
                {i}
              </div>
            ))}
          </div>
          <p className="font-ui text-white/50 text-xs">80K+ members already inside</p>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Logo variant="white" height={28} />
          </div>

          <div className="mb-8">
            <h1 className="font-display font-bold text-white text-3xl mb-2">Sign in</h1>
            <p className="font-ui text-white/50 text-sm">
              New here?{" "}
              <Link href={nextDest ? `/auth/signup?next=${encodeURIComponent(nextDest)}` : "/auth/signup"} className="text-marigold hover:text-marigold-dark transition-colors font-semibold">
                Create an account →
              </Link>
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className={inputCls}
                  required
                />
                <p className="font-ui text-xs text-white/35 mt-2">No password needed — we&rsquo;ll email you a 6-digit code to sign in.</p>
              </div>

              {error && (
                <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                  <p className="font-ui text-sm text-white/80">{error}</p>
                  {noAccount && (
                    <Link href={nextDest ? `/auth/signup?next=${encodeURIComponent(nextDest)}` : "/auth/signup"} className="font-ui text-sm text-marigold hover:text-marigold-dark font-semibold">
                      Create an account →
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg mt-2 flex items-center justify-center gap-2"
              >
                {loading ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending code…</> : "Email me a code →"}
              </button>
            </form>
          ) : (
            <OtpVerify
              email={email.trim()}
              purpose="login"
              requestPayload={{ email: email.trim(), purpose: "login" }}
              onVerified={onVerified}
              onBack={() => { setStep("email"); setError(""); }}
            />
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[10px] text-white/30">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button className="mt-4 w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white font-ui font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center font-mono text-[10px] text-white/25">
            By signing in you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#2E1B30" }}>
        <div className="w-10 h-10 rounded-full border-4 border-white/15 border-t-marigold animate-spin" />
      </div>
    }>
      <SignInInner />
    </Suspense>
  );
}
