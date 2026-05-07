"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUser, saveUser } from "@/lib/auth";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NJ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const step1Valid = firstName && lastName && email.includes("@") && phone.length >= 10;
  const step2Valid = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    const user = createUser({ firstName, lastName, email, phone, city, state });
    saveUser(user);
    router.push("/portal");
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#2E1B30" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 40% 60%, #F5A623 0%, transparent 55%), radial-gradient(circle at 75% 25%, #0E8C7A 0%, transparent 50%)" }} />
        <Link href="/" className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
            <span className="font-display font-bold text-aubergine text-lg">R</span>
          </div>
          <span className="font-display font-bold text-white text-xl">Rameelo</span>
        </Link>

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
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
              <span className="font-display font-bold text-aubergine">R</span>
            </div>
            <span className="font-display font-bold text-white text-lg">Rameelo</span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                {s > 1 && <div className="w-8 h-px bg-white/15" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > s ? "bg-peacock text-white" : step === s ? "bg-marigold text-aubergine" : "bg-white/10 text-white/30"}`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-wide ${step === s ? "text-white/60" : "text-white/25"}`}>
                  {s === 1 ? "Your info" : "Secure it"}
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
                "Choose a password to secure your account."
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
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
                  <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com" className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="4085551234" className={inputCls} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input type="text" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Edison" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <select value={state} onChange={(e) => setState(e.target.value)} className={`${inputCls} cursor-pointer`}>
                      {US_STATES.map((s) => <option key={s} value={s} style={{ backgroundColor: "#2E1B30" }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={!step1Valid} className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all mt-2 ${step1Valid ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-lg" : "bg-white/10 text-white/30 cursor-not-allowed"}`}>
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls}>Password</label>
                    {password.length > 0 && (
                      <span className={`font-mono text-[10px] ${password.length >= 8 ? "text-peacock" : "text-marigold"}`}>
                        {password.length >= 8 ? "Strong ✓" : `${8 - password.length} more chars`}
                      </span>
                    )}
                  </div>
                  <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} required />
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-2">Account summary</p>
                  <p className="font-ui text-sm text-white font-medium">{firstName} {lastName}</p>
                  <p className="font-ui text-xs text-white/50">{email}</p>
                  {city && <p className="font-ui text-xs text-white/50">{city}, {state}</p>}
                </div>

                <button type="submit" disabled={loading || !step2Valid} className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 ${step2Valid && !loading ? "bg-marigold text-aubergine hover:bg-marigold-dark active:scale-[0.98] shadow-lg" : "bg-white/10 text-white/30 cursor-not-allowed"}`}>
                  {loading ? (<><div className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Creating account…</>) : "Create My Account →"}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full py-2.5 text-white/40 font-ui text-sm hover:text-white/60 transition-colors">
                  ← Back
                </button>
              </>
            )}
          </form>
          <p className="mt-6 text-center font-mono text-[10px] text-white/25">By creating an account you agree to our Terms & Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
