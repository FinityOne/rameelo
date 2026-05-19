"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

interface Props {
  teamId: string;
  teamName: string;
  donateTitle: string;
  donateDescription: string;
  goal: number | null;
  raised: number;
}

export default function DonateSection({ teamId, teamName, donateTitle, donateDescription, goal, raised }: Props) {
  const [amount, setAmount]     = useState<number | "">(25);
  const [custom, setCustom]     = useState("");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [anon, setAnon]         = useState(false);
  const [step, setStep]         = useState<"pick" | "info" | "done">("pick");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [totalRaised, setTotalRaised] = useState(raised);

  const finalAmount = custom ? parseFloat(custom) : (amount as number);
  const pct = goal ? Math.min(100, Math.round((totalRaised / goal) * 100)) : null;

  async function submit() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (!finalAmount || finalAmount < 1) { setError("Minimum donation is $1."); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { error: dbErr } = await supabase.from("team_donations").insert({
      team_id: teamId,
      donor_name: anon ? "Anonymous" : name.trim(),
      donor_email: email.trim(),
      amount: finalAmount,
      message: message.trim() || null,
      is_anonymous: anon,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });
    if (dbErr) { setError("Something went wrong. Please try again."); setLoading(false); return; }
    setTotalRaised(prev => prev + finalAmount);
    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-peacock/30 bg-peacock/8 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-peacock/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎉</span>
        </div>
        <p className="font-display font-bold text-ink text-lg mb-1" style={{ letterSpacing: "-0.02em" }}>
          Thank you, {anon ? "friend" : name.split(" ")[0]}!
        </p>
        <p className="font-ui text-sm text-ink-muted mb-4">
          Your ${finalAmount.toFixed(0)} donation to {teamName} means the world to them.
        </p>
        <button
          onClick={() => { setStep("pick"); setName(""); setEmail(""); setMessage(""); setCustom(""); setAmount(25); }}
          className="font-ui text-xs font-semibold text-peacock hover:text-peacock/70 transition-colors"
        >
          Donate again →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-marigold/25 overflow-hidden" style={{ background: "linear-gradient(135deg,#1e0f20 0%,#2E1B30 100%)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏆</span>
          <p className="font-mono text-[9px] uppercase tracking-widest text-marigold font-bold">Support the Team</p>
        </div>
        <h3 className="font-display font-bold text-white text-base leading-snug" style={{ letterSpacing: "-0.02em" }}>
          {donateTitle || `Help ${teamName} compete`}
        </h3>
        {donateDescription && (
          <p className="font-ui text-white/50 text-xs mt-1 leading-relaxed">{donateDescription}</p>
        )}
      </div>

      {/* Progress */}
      {goal && (
        <div className="px-5 py-3 border-b border-white/8">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="font-display font-bold text-marigold text-xl">${totalRaised.toLocaleString()}</span>
            <span className="font-mono text-[9px] text-white/30">of ${goal.toLocaleString()} goal</span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-marigold transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-mono text-[9px] text-white/25 mt-1">{pct}% funded · be part of it</p>
        </div>
      )}

      <div className="px-5 py-4">
        {step === "pick" && (
          <>
            {/* Preset amounts */}
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 mb-2">Choose amount</p>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PRESET_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustom(""); }}
                  className={`py-2.5 rounded-xl font-display font-bold text-sm transition-all ${
                    amount === a && !custom
                      ? "bg-marigold text-aubergine"
                      : "bg-white/8 text-white hover:bg-white/15"
                  }`}
                >
                  ${a}
                </button>
              ))}
              <input
                type="number"
                min="1"
                placeholder="Custom"
                value={custom}
                onChange={e => { setCustom(e.target.value); setAmount(""); }}
                className="col-span-3 py-2.5 px-3 rounded-xl bg-white/8 text-white placeholder-white/25 font-display font-bold text-sm border border-transparent focus:border-marigold/50 focus:outline-none transition-colors text-center"
              />
            </div>

            <button
              onClick={() => { if (!finalAmount || finalAmount < 1) return; setStep("info"); }}
              disabled={!finalAmount || finalAmount < 1}
              className="w-full py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              Donate ${finalAmount || "—"} →
            </button>
          </>
        )}

        {step === "info" && (
          <>
            <button onClick={() => setStep("pick")} className="flex items-center gap-1 font-mono text-[9px] text-white/40 hover:text-white/70 mb-3 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Change amount
            </button>

            <div className="bg-marigold/15 border border-marigold/30 rounded-xl px-3 py-2 mb-4 text-center">
              <span className="font-display font-bold text-marigold text-lg">${finalAmount} donation</span>
            </div>

            <div className="space-y-2 mb-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                className="w-full px-3 py-2.5 rounded-xl bg-white/8 text-white placeholder-white/25 font-ui text-sm border border-transparent focus:border-marigold/50 focus:outline-none transition-colors" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email"
                className="w-full px-3 py-2.5 rounded-xl bg-white/8 text-white placeholder-white/25 font-ui text-sm border border-transparent focus:border-marigold/50 focus:outline-none transition-colors" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Leave a message of support (optional)" rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/8 text-white placeholder-white/25 font-ui text-sm border border-transparent focus:border-marigold/50 focus:outline-none transition-colors resize-none" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)}
                className="w-3.5 h-3.5 accent-marigold" />
              <span className="font-ui text-xs text-white/40">Donate anonymously</span>
            </label>

            {error && <p className="font-ui text-xs text-durga mb-2">{error}</p>}

            <button onClick={submit} disabled={loading}
              className="w-full py-3 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all disabled:opacity-60">
              {loading ? "Processing…" : `Confirm $${finalAmount} Donation`}
            </button>
            <p className="font-mono text-[8px] text-white/20 text-center mt-2">Processed securely by Rameelo</p>
          </>
        )}
      </div>
    </div>
  );
}
