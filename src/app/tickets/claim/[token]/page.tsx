"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadTransferByToken, acceptTransfer } from "@/lib/transfers";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

type PageState = "loading" | "found" | "not_found" | "already_claimed" | "wrong_account" | "accepting" | "accepted";

export default function ClaimTicketPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>("loading");
  const [transferData, setTransferData] = useState<Awaited<ReturnType<typeof loadTransferByToken>> | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      const data = await loadTransferByToken(token);
      if (!data || !data.transfer) { setState("not_found"); return; }

      if (data.transfer.status === "accepted") { setState("already_claimed"); return; }
      if (data.transfer.status === "cancelled") { setState("not_found"); return; }

      setTransferData(data);

      if (user?.email) {
        if (user.email.toLowerCase() !== data.transfer.toEmail.toLowerCase()) {
          setState("wrong_account");
        } else {
          setState("found");
        }
      } else {
        setState("found");
      }
    }
    init();
  }, [token]);

  async function handleAccept() {
    setShowConfirm(false);
    setState("accepting");
    const { error: err } = await acceptTransfer(token);
    if (err) {
      setError(err);
      setState("found");
      return;
    }
    setState("accepted");
    setTimeout(() => router.push("/portal/tickets"), 2500);
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-ui text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-marigold/50 focus:border-marigold/50 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#2E1B30" }}>
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F5A623" }}>
            <span className="font-display font-bold text-aubergine text-lg">R</span>
          </div>
          <span className="font-display font-bold text-white text-xl">Rameelo</span>
        </Link>

        {/* ── Loading ── */}
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-marigold animate-spin" />
            <p className="font-ui text-white/50 text-sm">Loading your ticket…</p>
          </div>
        )}

        {/* ── Accepting ── */}
        {state === "accepting" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-marigold animate-spin" />
            <p className="font-ui text-white/50 text-sm">Claiming your ticket…</p>
          </div>
        )}

        {/* ── Accepted ── */}
        {state === "accepted" && (
          <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto text-4xl">🎉</div>
            <div>
              <p className="font-display font-bold text-white text-2xl mb-2">Tickets claimed!</p>
              <p className="font-ui text-white/60 text-sm">They&apos;re in your Rameelo wallet. Taking you there now…</p>
            </div>
            <Link href="/portal/tickets" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
              View My Tickets →
            </Link>
          </div>
        )}

        {/* ── Not found / cancelled ── */}
        {state === "not_found" && (
          <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center mx-auto text-3xl">🎟️</div>
            <div>
              <p className="font-display font-bold text-white text-xl mb-2">Link not found</p>
              <p className="font-ui text-white/50 text-sm">This transfer link is invalid, expired, or has already been used.</p>
            </div>
            <Link href="/" className="inline-block font-ui text-sm text-white/40 hover:text-white/60 transition-colors">← Back to Rameelo</Link>
          </div>
        )}

        {/* ── Already claimed ── */}
        {state === "already_claimed" && (
          <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-peacock/15 border border-peacock/30 flex items-center justify-center mx-auto text-3xl">✅</div>
            <div>
              <p className="font-display font-bold text-white text-xl mb-2">Already claimed</p>
              <p className="font-ui text-white/50 text-sm">These tickets have already been accepted by their new owner.</p>
            </div>
            <Link href="/auth/signin" className="inline-block font-ui text-sm text-marigold hover:text-marigold-dark transition-colors">Sign in to your account →</Link>
          </div>
        )}

        {/* ── Wrong account ── */}
        {state === "wrong_account" && transferData && (
          <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-marigold/15 border border-marigold/30 flex items-center justify-center mx-auto text-3xl">🔒</div>
            <div>
              <p className="font-display font-bold text-white text-xl mb-2">Wrong account</p>
              <p className="font-ui text-white/50 text-sm">
                This ticket is addressed to <span className="text-marigold font-medium">{transferData.transfer!.toEmail}</span>.
                You&apos;re signed in as <span className="text-white/70">{userEmail}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/auth/signin" className="w-full py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm text-center hover:bg-marigold-dark transition-all">
                Sign in with the right account
              </Link>
              <Link href="/" className="block font-ui text-sm text-white/40 hover:text-white/60 transition-colors">← Back to Rameelo</Link>
            </div>
          </div>
        )}

        {/* ── Ticket found ── */}
        {state === "found" && transferData && (
          <div className="space-y-4">
            {/* Ticket preview */}
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
              {/* Header band */}
              <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #2E1B30 0%, #3d2440 100%)" }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-3">
                  {transferData.fromName} sent you {transferData.qty} ticket{transferData.qty !== 1 ? "s" : ""}
                </p>
                <p className="font-display font-bold text-white text-2xl leading-tight mb-1" style={{ letterSpacing: "-0.02em" }}>
                  {transferData.eventTitle}
                </p>
                <p className="font-ui text-white/60 text-sm">{transferData.tierName}</p>
              </div>

              {/* Dashed separator */}
              <div className="border-t-2 border-dashed border-white/10 mx-6" />

              {/* Details */}
              <div className="px-6 py-4 space-y-3">
                {[
                  { label: "Date", value: fmtDate(transferData.eventDate) },
                  { label: "Venue", value: `${transferData.venue}${transferData.city ? `, ${transferData.city}` : ""}` },
                  { label: "Qty", value: `${transferData.qty} ticket${transferData.qty !== 1 ? "s" : ""}` },
                  { label: "Type", value: transferData.tierName },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex gap-3">
                    <span className="font-mono text-[10px] text-white/30 w-12 uppercase tracking-wide pt-0.5">{row.label}</span>
                    <span className="font-ui text-sm text-white/80">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Ticket count dots */}
              <div className="px-6 pb-6 flex gap-2">
                {Array.from({ length: Math.min(transferData.qty, 8) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-lg bg-marigold/20 border border-marigold/30 flex items-center justify-center">
                    <span className="font-mono text-[9px] text-marigold font-bold">T{i + 1}</span>
                  </div>
                ))}
                {transferData.qty > 8 && <span className="font-mono text-[10px] text-white/40 self-center">+{transferData.qty - 8}</span>}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-durga/20 border border-durga/30 px-4 py-3">
                <p className="font-ui text-sm text-white/80">{error}</p>
              </div>
            )}

            {/* CTA: logged in with matching email */}
            {userEmail && userEmail.toLowerCase() === transferData.transfer!.toEmail.toLowerCase() ? (
              <>
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg"
                  >
                    Accept tickets →
                  </button>
                ) : (
                  <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3">
                    <p className="font-ui text-white/80 text-sm text-center">
                      Add {transferData.qty} ticket{transferData.qty !== 1 ? "s" : ""} to your wallet?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirm(false)} className={`${inputCls} flex-1 py-3 text-center cursor-pointer`}>
                        Cancel
                      </button>
                      <button onClick={handleAccept} className="flex-1 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
                        Yes, claim them
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-center font-ui text-xs text-white/30">Signed in as {userEmail}</p>
              </>
            ) : (
              /* Not logged in or different account */
              <div className="space-y-3">
                <p className="font-ui text-white/60 text-sm text-center">
                  These tickets are waiting for <span className="text-marigold font-medium">{transferData.transfer!.toEmail}</span>. Sign in or create an account to claim.
                </p>
                <Link
                  href={`/auth/signin?next=/tickets/claim/${token}`}
                  className="block w-full py-4 rounded-2xl bg-marigold text-aubergine font-display font-bold text-base text-center hover:bg-marigold-dark active:scale-[0.98] transition-all shadow-lg"
                >
                  Sign in to claim →
                </Link>
                <Link
                  href={`/auth/signup?next=/tickets/claim/${token}`}
                  className="block w-full py-3.5 rounded-2xl border border-white/15 text-white font-display font-bold text-sm text-center hover:bg-white/5 transition-all"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
