"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createUser, saveUser, type UserRole } from "@/lib/auth";
import OtpVerify, { type VerifyResult } from "../OtpVerify";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const STATE_NAME_TO_ABBR: Record<string, string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
};

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => { document.title = "Create Account | Rameelo"; }, []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NJ");
  const stateEditedByUser = useRef(false);
  const cityEditedByUser = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [nextDest, setNextDest] = useState<string>("");

  // Prefill email from a link (org invite or group-ticket flow), remember an org
  // invite token, and capture a same-site `next` destination to return to.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedEmail = params.get("email");
    const invite = params.get("invite");
    const next = params.get("next");
    if (invitedEmail) setEmail(invitedEmail);
    if (invite) setInviteToken(invite);
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextDest(next);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
          { headers: { "User-Agent": "Rameelo/1.0 (heran@finityone.com)" } }
        );
        const data = await res.json();
        const addr = data.address ?? {};
        const stateName: string = addr.state ?? "";
        const cityName: string = addr.city || addr.town || addr.village || addr.suburb || "";
        const abbr = STATE_NAME_TO_ABBR[stateName];
        if (abbr && !stateEditedByUser.current) setState(abbr);
        if (cityName && !cityEditedByUser.current) setCity(cityName);
      } catch { /* silent — user can set manually */ }
    });
  }, []);

  function formatPhone(digits: string): string {
    const d = digits.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  const step1Valid = firstName && lastName && email.includes("@") && phone.length === 10;

  // Step 1 → request a 6-digit code (creates the passwordless account; confirmed on verify).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 1 || !step1Valid) return;
    setLoading(true);
    setError("");
    setAccountExists(false);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "signup", firstName, lastName, phone, city, state }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send a code. Please try again.");
        if (data.code === "account_exists") setAccountExists(true);
        return;
      }
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Code verified → session is set server-side (guest orders + invites claimed there).
  // Fire the welcome + admin-alert emails (cookie-authed, best-effort), then route.
  function onSignupVerified(data: VerifyResult) {
    saveUser(createUser({ firstName, lastName, email, phone, city, state, role: (data.role ?? "user") as UserRole }));
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
    router.push(nextDest || (inviteToken ? "/organizer" : "/portal"));
    router.refresh();
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#2E1B30" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 40% 60%, #F5A623 0%, transparent 55%), radial-gradient(circle at 75% 25%, #0E8C7A 0%, transparent 50%)" }} />
        <Logo variant="white" height={32} />

        <div className="relative">
          <p className="font-mono text-[10px] uppercase tracking-widest text-marigold mb-4">Join the community</p>
          <h2 className="font-display font-bold text-white text-3xl leading-snug mb-6">
            The home of<br /><span className="text-marigold">Raas Garba</span><br />in America.
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "80K+", label: "Members" },
              { value: "500+", label: "Events" },
              { value: "120+", label: "Cities" },
              { value: "2M+", label: "Tickets sold" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                <p className="font-display font-bold text-white text-xl">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-ui text-white/30 text-xs">Already have an account?{" "}
          <Link href="/auth/signin" className="text-marigold hover:text-marigold-dark transition-colors">Sign in →</Link>
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <Logo variant="white" height={28} />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                {s > 1 && <div className="w-8 h-px bg-white/15" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > s ? "bg-peacock text-white" : step === s ? "bg-marigold text-aubergine" : "bg-white/10 text-white/30"}`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-wide ${step === s ? "text-white/60" : "text-white/25"}`}>
                  {s === 1 ? "Your info" : "Verify"}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="font-display font-bold text-white text-3xl mb-1">
              {step === 1 ? "Create account" : "Almost there"}
            </h1>
            <p className="font-ui text-white/50 text-sm">
              {step === 1 ? (
                <>Already a member? <Link href="/auth/signin" className="text-marigold font-semibold hover:text-marigold-dark">Sign in →</Link></>
              ) : (
                "Enter the 6-digit code we emailed to confirm your account."
              )}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First name</label>
                    <input type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Priya" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Patel" className={inputCls} required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com"
                    className={`${inputCls} ${inviteToken ? "bg-ivory/60 cursor-not-allowed" : ""}`} required readOnly={!!inviteToken} />
                  {inviteToken && <p className="mt-1 font-mono text-[10px] text-peacock uppercase tracking-widest">Team invite · sign up with this email to join</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="flex items-center">
                    <div className="flex items-center gap-1.5 px-3 py-3.5 rounded-l-xl border border-r-0 border-white/15 bg-white/8 shrink-0">
                      <span className="text-base leading-none">🇺🇸</span>
                      <span className="font-ui text-sm text-white/60 font-medium">+1</span>
                    </div>
                    <input
                      type="tel"
                      autoComplete="tel-national"
                      value={formatPhone(phone)}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="(555) 867-5309"
                      maxLength={14}
                      className="flex-1 rounded-r-xl rounded-l-none border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all"
                      required
                    />
                  </div>
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="font-mono text-[9px] text-marigold/70 mt-1">{10 - phone.length} more digits needed</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input type="text" autoComplete="address-level2" value={city} onChange={(e) => { cityEditedByUser.current = true; setCity(e.target.value); }} placeholder="Edison" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <select value={state} onChange={(e) => { stateEditedByUser.current = true; setState(e.target.value); }} className={`${inputCls} cursor-pointer`}>
                      {US_STATES.map((s) => <option key={s} value={s} style={{ backgroundColor: "#2E1B30" }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                    <p className="font-ui text-sm text-white/80">{error}</p>
                    {accountExists && (
                      <Link href={nextDest ? `/auth/signin?next=${encodeURIComponent(nextDest)}` : "/auth/signin"} className="font-ui text-sm text-marigold hover:text-marigold-dark font-semibold">Sign in instead →</Link>
                    )}
                  </div>
                )}

                <button type="submit" disabled={!step1Valid || loading} className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all mt-2 flex items-center justify-center gap-2 ${step1Valid && !loading ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-lg" : "bg-white/10 text-white/30 cursor-not-allowed"}`}>
                  {loading ? <><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending code…</> : "Send me a code →"}
                </button>
            </form>
          ) : (
            <OtpVerify
              email={email.trim()}
              purpose="signup"
              requestPayload={{ email: email.trim(), purpose: "signup", firstName, lastName, phone, city, state }}
              onVerified={onSignupVerified}
              onBack={() => { setStep(1); setError(""); }}
            />
          )}
          <p className="mt-6 text-center font-mono text-[10px] text-white/25">By creating an account you agree to our Terms & Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
