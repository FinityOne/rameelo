"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadMyOrders, type PortalOrderRow, type GroupMember } from "@/lib/group-orders";
import {
  lookupUserByEmail,
  initiateTransfer,
  cancelTransfer,
  loadIncomingTransfers,
  acceptTransfer,
  type IncomingTransfer,
} from "@/lib/transfers";

// ── QR Code ───────────────────────────────────────────────────────────────────
function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  const grid = 21;
  let seed = value.split("").reduce((a, c) => (a * 1664525 + c.charCodeAt(0)) & 0x7fffffff, 1013904223);
  function next() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const cells = Array.from({ length: grid }, (_, r) =>
    Array.from({ length: grid }, (__, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7)) {
        const lr = r < 7 ? r : r - (grid - 7);
        const lc = c < 7 ? c : c >= grid - 7 ? c - (grid - 7) : c;
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      }
      return next() > 0.42;
    })
  );
  const cellSize = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", imageRendering: "pixelated" }}>
      <rect width={size} height={size} fill="white" rx={3} />
      {cells.map((row, r) => row.map((on, c) => on ? (
        <rect key={`${r}-${c}`} x={c * cellSize + 0.5} y={r * cellSize + 0.5} width={cellSize - 1} height={cellSize - 1} fill="#2E1B30" rx={0.5} />
      ) : null))}
    </svg>
  );
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

// ── Transfer Modal ─────────────────────────────────────────────────────────────
type TransferStep = "email" | "confirm" | "done" | "cancel_confirm";

function TransferModal({
  order,
  userId,
  userEmail,
  onClose,
  onTransferred,
}: {
  order: PortalOrderRow;
  userId: string;
  userEmail: string;
  onClose: () => void;
  onTransferred: (orderId: string, toEmail: string, toName: string | null) => void;
}) {
  const [step, setStep] = useState<TransferStep>("email");
  const [email, setEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<{ exists: boolean; name?: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [claimLink, setClaimLink] = useState("");
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced email lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLookupResult(null);
    if (!email.includes("@") || email === userEmail) return;
    debounceRef.current = setTimeout(async () => {
      setLookupLoading(true);
      const result = await lookupUserByEmail(email);
      setLookupResult(result);
      setLookupLoading(false);
    }, 600);
  }, [email, userEmail]);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    const { token, error: err } = await initiateTransfer({
      orderId: order.orderId,
      fromUserId: userId,
      toEmail: email,
      toName: lookupResult?.name ?? undefined,
      toUserId: undefined,
      qty: order.qty,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    if (token) setClaimLink(`${location.origin}/tickets/claim/${token}`);
    onTransferred(order.orderId, email, lookupResult?.name ?? null);
    setStep("done");
  }

  const emailValid = email.includes("@") && email !== userEmail;
  const displayName = lookupResult?.name || email;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 border-b border-ivory-200">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Transfer Ticket</p>
            <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>
              {order.eventTitle}
            </p>
            <p className="font-ui text-xs text-ink-muted">{order.qty} ticket{order.qty !== 1 ? "s" : ""} · {order.tierName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Step: Email ── */}
          {step === "email" && (
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-2">
                  Who should get these tickets?
                </label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="their@email.com"
                  className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                />
                {email === userEmail && (
                  <p className="font-mono text-[10px] text-durga mt-1.5">That&apos;s your own email.</p>
                )}
              </div>

              {/* Lookup result */}
              {emailValid && (
                <div className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                  lookupLoading ? "bg-ivory border border-ivory-200" :
                  lookupResult?.exists ? "bg-peacock/8 border border-peacock/20" :
                  lookupResult !== null ? "bg-marigold/8 border border-marigold/20" : "bg-ivory border border-ivory-200"
                }`}>
                  {lookupLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-ink-muted animate-spin shrink-0" />
                      <p className="font-ui text-xs text-ink-muted">Looking up…</p>
                    </>
                  ) : lookupResult?.exists ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-peacock flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(lookupResult.name ?? email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-ui text-sm font-semibold text-ink">{lookupResult.name}</p>
                        <p className="font-mono text-[10px] text-peacock">Rameelo member · They&apos;ll see it instantly in their portal</p>
                      </div>
                    </>
                  ) : lookupResult !== null ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-marigold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-ui text-sm font-semibold text-ink">Not on Rameelo yet</p>
                        <p className="font-mono text-[10px] text-marigold-dark">We&apos;ll give you a link to share so they can claim it</p>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              <button
                disabled={!emailValid || lookupLoading}
                onClick={() => setStep("confirm")}
                className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all ${emailValid && !lookupLoading ? "bg-aubergine text-white hover:bg-aubergine-light active:scale-[0.98]" : "bg-ivory text-ink-muted/50 cursor-not-allowed"}`}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-ivory border border-ivory-200 p-4 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Transfer summary</p>
                <div className="space-y-2">
                  {[
                    { label: "Event", value: order.eventTitle },
                    { label: "Date", value: fmtDate(order.eventDate) },
                    { label: "Tickets", value: `${order.qty} × ${order.tierName}` },
                    { label: "To", value: lookupResult?.name ? `${lookupResult.name} (${email})` : email },
                  ].map(row => (
                    <div key={row.label} className="flex gap-2">
                      <span className="font-ui text-xs text-ink-muted w-14 shrink-0">{row.label}</span>
                      <span className="font-ui text-xs font-semibold text-ink">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-durga/8 border border-durga/15 px-4 py-3 flex gap-2.5">
                <svg className="w-4 h-4 text-durga shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">
                  Your QR codes will be hidden until the transfer is accepted or cancelled. Once accepted, these tickets permanently belong to the recipient.
                </p>
              </div>

              {error && <p className="font-ui text-xs text-durga">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("email")}
                  className="flex-1 py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors"
                >
                  ← Back
                </button>
                <button
                  disabled={submitting}
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-2xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</> : "Confirm Transfer"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-peacock/10 border border-peacock/20 flex items-center justify-center mx-auto text-2xl">
                ✈️
              </div>
              <div>
                <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Transfer sent!</p>
                <p className="font-ui text-sm text-ink-muted mt-1">
                  {lookupResult?.exists
                    ? `${displayName} will see it in their Rameelo portal.`
                    : `Share the link below so ${email} can claim their ticket.`}
                </p>
              </div>

              {!lookupResult?.exists && claimLink && (
                <div className="rounded-xl border border-ivory-200 bg-ivory p-3 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Claim link</p>
                  <p className="font-mono text-[10px] text-ink break-all mb-2">{claimLink}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(claimLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="w-full py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-colors"
                  >
                    {copied ? "Copied ✓" : "Copy link"}
                  </button>
                </div>
              )}

              <button onClick={onClose} className="w-full py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Incoming Transfer Card ─────────────────────────────────────────────────────
function IncomingTransferCard({
  transfer,
  onAccepted,
  onDeclined,
}: {
  transfer: IncomingTransfer;
  onAccepted: (id: string) => void;
  onDeclined: (id: string) => void;
}) {
  const [step, setStep] = useState<"idle" | "confirm_accept" | "confirm_decline" | "loading">("idle");
  const [error, setError] = useState("");

  async function handleAccept() {
    setStep("loading");
    const { error: err } = await acceptTransfer(transfer.token);
    if (err) { setError(err); setStep("idle"); return; }
    onAccepted(transfer.id);
  }

  async function handleDecline() {
    setStep("loading");
    const supabase = createClient();
    await supabase.from("ticket_transfers").update({ status: "cancelled" }).eq("id", transfer.id);
    onDeclined(transfer.id);
  }

  return (
    <div className="rounded-2xl border-2 border-marigold/30 bg-gradient-to-br from-marigold/5 to-transparent overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-marigold/15 flex items-center justify-center shrink-0 text-lg">🎟️</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/15 text-marigold-dark font-bold">
                Ticket Sent to You
              </span>
            </div>
            <p className="font-display font-bold text-ink text-base leading-tight" style={{ letterSpacing: "-0.015em" }}>
              {transfer.eventTitle}
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              {transfer.qty} × {transfer.tierName} · {fmtDate(transfer.eventDate)}
            </p>
            <p className="font-ui text-xs text-ink-muted">
              From <span className="font-semibold text-ink">{transfer.fromName || transfer.fromEmail}</span> · {fmtDateTime(transfer.createdAt)}
            </p>
          </div>
        </div>

        {error && <p className="font-ui text-xs text-durga mb-3">{error}</p>}

        {step === "idle" && (
          <div className="flex gap-2">
            <button
              onClick={() => setStep("confirm_decline")}
              className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => setStep("confirm_accept")}
              className="flex-1 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all active:scale-[0.98]"
            >
              Accept tickets →
            </button>
          </div>
        )}

        {step === "confirm_accept" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-peacock/8 border border-peacock/20 px-4 py-3">
              <p className="font-ui text-xs text-ink">
                Accepting will add {transfer.qty} ticket{transfer.qty !== 1 ? "s" : ""} to your Rameelo wallet. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={handleAccept} className="flex-1 py-2.5 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:opacity-90 transition-all">
                Yes, accept
              </button>
            </div>
          </div>
        )}

        {step === "confirm_decline" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-durga/8 border border-durga/15 px-4 py-3">
              <p className="font-ui text-xs text-ink-muted">
                Declining will notify the sender their transfer was not accepted.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={handleDecline} className="flex-1 py-2.5 rounded-xl bg-durga/80 text-white font-ui text-sm font-semibold hover:opacity-90 transition-all">
                Decline
              </button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex items-center justify-center py-2">
            <div className="w-5 h-5 rounded-full border-2 border-ivory-200 border-t-aubergine animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Group Members Panel ────────────────────────────────────────────────────────
function GroupMembersPanel({ members, groupId }: { members: GroupMember[]; groupId: string }) {
  const paid = members.filter(m => m.paid).length;
  return (
    <div className="mt-4 rounded-2xl border border-aubergine/15 bg-aubergine/4 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">Group · {groupId}</p>
        <span className="font-mono text-[10px] text-ink-muted">{paid}/{members.length} paid</span>
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full bg-peacock transition-all" style={{ width: `${members.length > 0 ? (paid / members.length) * 100 : 0}%` }} />
      </div>
      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="font-ui text-sm text-ink">
                {m.name}
                {m.isOrganizer && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Organizer</span>}
              </span>
            </div>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
              {m.paid && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>
        ))}
      </div>
      <Link href={`/group/${groupId}`} className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 transition-all">
        View Group Page →
      </Link>
    </div>
  );
}

// ── Ticket Card (per seat) ─────────────────────────────────────────────────────
function TicketCard({ orderId, seat, total, eventTitle, tierName }: {
  orderId: string; seat: number; total: number; eventTitle: string; tierName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const ticketId = `${orderId}-T${seat}`;
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${expanded ? "border-marigold/30 shadow-md" : "border-ivory-200"} bg-white`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: "#2E1B30" }}>
          T{seat}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-ink text-sm">{ticketId}</p>
            <span className="font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-bold bg-peacock/10 border-peacock/20 text-peacock">
              In Your Wallet
            </span>
          </div>
          <p className="font-ui text-xs text-ink-muted">{tierName} · Ticket {seat} of {total}</p>
        </div>
        <svg className={`w-4 h-4 text-ink-muted transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-4" />
          <div className="px-4 pb-4 pt-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-2xl border-2 border-marigold/20 bg-white shadow-sm">
                  <QRCode value={ticketId} size={150} />
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-ink text-sm">{ticketId}</p>
                  <p className="font-mono text-[10px] text-ink-muted">Ticket {seat} of {total}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-peacock/10 border border-peacock/20">
                  <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
                  <p className="font-mono text-[10px] text-peacock font-bold uppercase tracking-wide">Valid</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticket Details</p>
                {[
                  { label: "Event", value: eventTitle },
                  { label: "Type", value: tierName },
                  { label: "Ticket ID", value: ticketId },
                ].map(row => (
                  <div key={row.label} className="flex gap-2 py-1.5 border-b border-ivory-200 last:border-0">
                    <span className="font-ui text-xs text-ink-muted w-16 shrink-0">{row.label}</span>
                    <span className="font-ui text-xs font-semibold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Transfer State Panel (replaces QR when transferred) ───────────────────────
function TransferStatePanel({
  order,
  onCancelTransfer,
}: {
  order: PortalOrderRow;
  onCancelTransfer: (orderId: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const t = order.transfer!;

  async function handleCancel() {
    setCancelling(true);
    await cancelTransfer(t.id);
    onCancelTransfer(order.orderId);
    setCancelling(false);
  }

  const recipientLabel = t.toName ? `${t.toName} (${t.toEmail})` : t.toEmail;

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${t.status === "pending" ? "bg-marigold/5 border-marigold/25" : "bg-ivory border-ivory-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl ${t.status === "pending" ? "bg-marigold/15" : "bg-peacock/10"}`}>
            {t.status === "pending" ? "⏳" : "✅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-ui text-sm font-semibold text-ink">
              {t.status === "pending" ? "Waiting for acceptance" : "Transfer complete"}
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              {order.qty} ticket{order.qty !== 1 ? "s" : ""} sent to{" "}
              <span className="font-semibold text-ink">{recipientLabel}</span>
            </p>
            <p className="font-mono text-[10px] text-ink-muted/60 mt-1">
              {t.status === "pending" ? `Initiated ${fmtDateTime(t.createdAt)}` : `Accepted ${t.acceptedAt ? fmtDateTime(t.acceptedAt) : ""}`}
            </p>
          </div>
        </div>

        {/* Per-ticket transfer indicators */}
        <div className="mt-4 space-y-2">
          {Array.from({ length: order.qty }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 border border-ivory-200">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: "#6B6B7B" }}>
                T{i + 1}
              </div>
              <p className="font-ui text-xs text-ink-muted flex-1">
                {order.eventTitle} · {order.tierName}
              </p>
              <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${
                t.status === "pending" ? "bg-marigold/15 text-marigold-dark" : "bg-ivory-200 text-ink-muted"
              }`}>
                {t.status === "pending" ? "Pending" : "Transferred"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {t.status === "pending" && (
        <>
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full py-2.5 rounded-xl border border-ivory-200 font-ui text-xs font-semibold text-ink-muted hover:text-durga hover:border-durga/30 transition-colors"
            >
              Cancel transfer
            </button>
          ) : (
            <div className="rounded-xl border border-durga/20 bg-durga/5 p-3 space-y-2">
              <p className="font-ui text-xs text-ink text-center">Cancel this transfer? Your QR codes will return.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2 rounded-xl border border-ivory-200 font-ui text-xs text-ink-muted">Keep it</button>
                <button
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl bg-durga/80 text-white font-ui text-xs font-semibold hover:opacity-90 transition-all"
                >
                  {cancelling ? "…" : "Yes, cancel"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  userId,
  userEmail,
  onTransferInitiated,
  onTransferCancelled,
}: {
  order: PortalOrderRow;
  userId: string;
  userEmail: string;
  onTransferInitiated: (orderId: string, toEmail: string, toName: string | null) => void;
  onTransferCancelled: (orderId: string) => void;
}) {
  const dateISO = order.eventDate;
  const isUpcoming = dateISO >= new Date().toISOString().slice(0, 10);
  const [expanded, setExpanded] = useState(isUpcoming && !order.transfer);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const daysUntil = isUpcoming
    ? Math.ceil((new Date(dateISO + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;

  const colorIndex = (order.artistName.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const artistColor = AVATAR_COLORS[colorIndex];
  const hasTransfer = !!order.transfer;
  const isPending = order.transfer?.status === "pending";
  const isTransferred = order.transfer?.status === "accepted";

  return (
    <>
      {showTransferModal && (
        <TransferModal
          order={order}
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowTransferModal(false)}
          onTransferred={(orderId, toEmail, toName) => {
            onTransferInitiated(orderId, toEmail, toName);
            setShowTransferModal(false);
          }}
        />
      )}

      <div className={`rounded-2xl overflow-hidden border transition-all ${
        isTransferred ? "border-ivory-200 opacity-70" :
        isPending ? "border-marigold/30 shadow-sm" :
        expanded ? "border-marigold/30 shadow-md" : "border-ivory-200 hover:border-marigold/20"
      } bg-white`}>
        {/* Order header */}
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-stretch">
            <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: isTransferred ? "#B0B0C0" : artistColor }} />
            <div className="flex-1 px-5 py-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${
                      isTransferred ? "bg-ivory-200 text-ink-muted" :
                      isPending ? "bg-marigold/15 text-marigold-dark" :
                      isUpcoming ? "bg-peacock/10 text-peacock" : "bg-ivory-200 text-ink-muted"
                    }`}>
                      {isTransferred ? "Transferred" : isPending ? "Transfer Pending" : isUpcoming ? "Upcoming" : "Past"}
                    </span>
                    {order.groupId && !hasTransfer && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-marigold/15 text-marigold-dark">
                        Group Order
                      </span>
                    )}
                  </div>
                  <h3 className={`font-display font-bold leading-snug mb-0.5 ${isTransferred ? "text-ink-muted" : "text-ink"}`}>
                    {order.eventTitle}
                  </h3>
                  {order.artistName && <p className="font-ui text-xs text-ink-muted">{order.artistName}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="font-ui text-xs text-ink-muted">📅 {fmtDate(order.eventDate)}</span>
                    {order.venue && <span className="font-ui text-xs text-ink-muted">📍 {order.venue}, {order.city}</span>}
                    <span className="font-ui text-xs text-ink-muted">
                      🎟️ {order.qty} × {order.tierName}
                      {hasTransfer && (
                        <span className="ml-1 text-ink-muted/60">
                          → {order.transfer!.toName || order.transfer!.toEmail}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-ivory-200 pl-4 shrink-0">
                  {daysUntil !== null && !isTransferred ? (
                    <>
                      <p className="font-display font-bold text-aubergine text-2xl leading-none">{daysUntil}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">days</p>
                    </>
                  ) : (
                    <p className="font-mono text-[10px] text-ink-muted">{isTransferred ? "Gone" : "Past"}</p>
                  )}
                  <svg className={`w-4 h-4 text-ink-muted mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>

        {expanded && (
          <>
            <div className="border-t-2 border-dashed border-ivory-200 mx-5" />
            <div className="px-5 py-4 space-y-3">
              {hasTransfer ? (
                <TransferStatePanel order={order} onCancelTransfer={onTransferCancelled} />
              ) : (
                <>
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/10">
                    <svg className="w-3.5 h-3.5 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="font-ui text-xs text-ink-muted">
                      Each ticket has its own QR code. Tap to expand and show at entry.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: order.qty }).map((_, i) => (
                      <TicketCard key={i} orderId={order.orderId} seat={i + 1} total={order.qty} eventTitle={order.eventTitle} tierName={order.tierName} />
                    ))}
                  </div>
                  {order.groupId && order.groupMembers && order.groupMembers.length > 0 && (
                    <GroupMembersPanel members={order.groupMembers} groupId={order.groupId} />
                  )}
                </>
              )}

              {/* Footer: receipt + transfer button */}
              <div className="flex items-center justify-between pt-2 border-t border-ivory-200">
                <div>
                  <p className="font-mono text-[10px] text-ink-muted">
                    Total paid · #{order.orderId.slice(-6).toUpperCase()}
                  </p>
                  <Link href={`/portal/tickets/${order.orderId}`} className="font-mono text-[10px] text-aubergine hover:underline flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View receipt
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display font-bold text-ink">${order.grandTotal.toLocaleString()}</p>
                  {isUpcoming && !isTransferred && (
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-aubergine/25 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {isPending ? "Resend" : "Transfer"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [orders, setOrders] = useState<PortalOrderRow[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      const [ordersData, incoming] = await Promise.all([
        loadMyOrders(user.id),
        user.email ? loadIncomingTransfers(user.email) : Promise.resolve([]),
      ]);
      setOrders(ordersData);
      setIncomingTransfers(incoming);
      setLoading(false);
    });
  }, []);

  function handleTransferInitiated(orderId: string, toEmail: string, toName: string | null) {
    setOrders(prev => prev.map(o =>
      o.orderId === orderId
        ? { ...o, transfer: { id: "", token: "", status: "pending", toEmail, toName, createdAt: new Date().toISOString(), acceptedAt: null } }
        : o
    ));
    // Reload to get real transfer ID/token
    if (userId) loadMyOrders(userId).then(setOrders);
  }

  function handleTransferCancelled(orderId: string) {
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, transfer: undefined } : o));
  }

  function handleIncomingAccepted(transferId: string) {
    setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));
    // Reload orders to include the newly claimed ticket
    if (userId) loadMyOrders(userId).then(setOrders);
  }

  function handleIncomingDeclined(transferId: string) {
    setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));
  }

  const filtered = orders.filter(o => {
    if (filter === "upcoming") return o.eventDate >= today;
    if (filter === "past")     return o.eventDate < today;
    return true;
  });

  const transferredCount = orders.filter(o => o.transfer?.status === "accepted").length;
  const pendingCount = orders.filter(o => o.transfer?.status === "pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">My Tickets</h1>
          <p className="font-ui text-ink-muted text-sm">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
            {transferredCount > 0 && <span className="text-ink-muted/60"> · {transferredCount} transferred</span>}
            {pendingCount > 0 && <span className="text-marigold-dark"> · {pendingCount} pending transfer</span>}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "past", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? "bg-aubergine text-white" : "bg-white border border-ivory-200 text-ink-muted hover:text-ink"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Incoming transfers ── */}
          {incomingTransfers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Tickets Sent to You</p>
                <span className="w-5 h-5 rounded-full bg-marigold flex items-center justify-center font-bold text-aubergine text-[10px]">
                  {incomingTransfers.length}
                </span>
              </div>
              {incomingTransfers.map(t => (
                <IncomingTransferCard key={t.id} transfer={t} onAccepted={handleIncomingAccepted} onDeclined={handleIncomingDeclined} />
              ))}
              <div className="h-px bg-ivory-200" />
            </div>
          )}

          {/* ── My orders ── */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-xl font-bold text-ink mb-2">
                {orders.length === 0 ? "No tickets yet" : `No ${filter} tickets`}
              </p>
              <p className="font-ui text-ink-muted text-sm mb-6">
                {orders.length === 0
                  ? "Your tickets will appear here after purchase."
                  : "Adjust the filter to see other tickets."}
              </p>
              <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">
                Browse events →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(order => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  userId={userId}
                  userEmail={userEmail}
                  onTransferInitiated={handleTransferInitiated}
                  onTransferCancelled={handleTransferCancelled}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl p-6 text-center border-2 border-dashed border-ivory-200">
        <p className="font-display font-bold text-ink text-lg mb-1">Find your next night</p>
        <p className="font-ui text-ink-muted text-sm mb-4">100+ events this Navratri season across the US.</p>
        <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">
          Browse events →
        </Link>
      </div>
    </div>
  );
}
