"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createUser, saveUser } from "@/lib/auth";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NJ");
  const stateEditedByUser = useRef(false);
  const cityEditedByUser = useRef(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

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
  const step2Valid = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName, phone, city, state },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Build and save local user for portal pages
    const user = createUser({ firstName, lastName, email, phone, city, state });
    saveUser(user);

    if (data.session) {
      // Email confirmation disabled — go straight to portal
      router.push("/portal");
      router.refresh();
    } else {
      // Email confirmation enabled — show check-email screen
      setEmailSent(true);
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";
  const labelCls = "font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block";

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#2E1B30" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto text-3xl">
            📬
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-2xl mb-2">Check your email</h1>
            <p className="font-ui text-white/50 text-sm">
              We sent a confirmation link to <span className="text-marigold font-medium">{email}</span>. Click it to activate your account.
            </p>
          </div>
          <Link href="/auth/signin" className="block font-ui text-sm text-white/40 hover:text-white/60 transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

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

                {error && (
                  <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                    <p className="font-ui text-sm text-white/80">{error}</p>
                  </div>
                )}

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
