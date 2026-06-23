"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import QRCode from "@/components/QRCode";
import { loadMyOrders, type PortalOrderRow, type GroupMember } from "@/lib/group-orders";
import {
  lookupUserByEmail,
  initiateTransfer,
  cancelTransfer,
  loadIncomingTransfers,
  loadReceivedTickets,
  acceptTransfer,
  type IncomingTransfer,
  type ReceivedTicket,
  type TicketTransfer,
} from "@/lib/transfers";

// ── QR Code ───────────────────────────────────────────────────────────────────
// Real scannable QR lives in @/components/QRCode (imported above). The scanner +
// Apple Wallet pass both read the `RAMEELO:<orderId>` payload.
function ticketQrValue(orderId: string) {
  return `RAMEELO:${orderId}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

// Resolve an event's cover into a CSS background for the ticket panel.
// Prefers the uploaded cover image; otherwise falls back to the saved gradient id.
function coverBackground(coverImageUrl: string | null, coverGradient: string): string {
  if (coverImageUrl) {
    return `linear-gradient(135deg, rgba(20,8,22,0.35) 0%, rgba(20,8,22,0.55) 100%), url(${coverImageUrl}) center/cover no-repeat`;
  }
  const g = GRADIENTS.find(x => x.id === coverGradient);
  return g?.css ?? "linear-gradient(135deg, #7C1F2C 0%, #B84A22 50%, #F5A623 100%)";
}

function fmtTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// Short ticket reference shown on the ticket face, e.g. #RMZ-2207-A3
function ticketRef(orderId: string, seat: number) {
  const tail = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase().padStart(6, "0");
  return `#RMZ-${tail.slice(0, 4)}-${tail.slice(4)}${seat}`;
}

type SeatTransfer = PortalOrderRow["transfers"] extends (infer T)[] | undefined ? T : never;

// Given a ticket number and order's transfers, find if that ticket is in a transfer
function getTransferForSeat(seat: number, transfers: SeatTransfer[]): SeatTransfer | undefined {
  return transfers.find(t => {
    if (t.seatNumbers.length === 0) return true; // legacy: covers all seats
    return t.seatNumbers.includes(seat);
  });
}

// ── Transfer Modal ─────────────────────────────────────────────────────────────
type TransferStep = "tickets" | "email" | "confirm" | "done";

function TransferModal({
  order,
  userId,
  userEmail,
  preselectedSeats,
  onClose,
  onTransferred,
}: {
  order: PortalOrderRow;
  userId: string;
  userEmail: string;
  preselectedSeats?: number[]; // set when triggered from a specific TicketCard
  onClose: () => void;
  onTransferred: () => void;
}) {
  const transfers = order.transfers ?? [];
  const takenSeats = new Set(transfers.flatMap(t => t.seatNumbers.length > 0 ? t.seatNumbers : Array.from({ length: order.qty }, (_, i) => i + 1)));
  const freeSeats = Array.from({ length: order.qty }, (_, i) => i + 1).filter(s => !takenSeats.has(s));

  const initialSeats = preselectedSeats ?? (freeSeats.length === 1 ? freeSeats : []);
  const skipSeatStep = order.qty === 1 || (preselectedSeats !== undefined && preselectedSeats.length > 0);

  const [step, setStep] = useState<TransferStep>(skipSeatStep ? "email" : "tickets");
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSeats);
  const [email, setEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<{ exists: boolean; name?: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [claimLink, setClaimLink] = useState("");
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function toggleSeat(seat: number) {
    setSelectedSeats(prev => prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat].sort((a, b) => a - b));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    const { transferId, token, error: err } = await initiateTransfer({
      orderId: order.orderId,
      fromUserId: userId,
      toEmail: email,
      toName: lookupResult?.name,
      seatNumbers: selectedSeats,
      qty: selectedSeats.length,
    });
    setSubmitting(false);
    if (err) { setError(err); return; }
    if (token) setClaimLink(`${location.origin}/tickets/claim/${token}`);
    // Email the recipient their claim link (branded, personal, with account
    // instructions). Best-effort — the copy-link fallback in the Done step still
    // works if the email send fails, so we don't block or surface an error here.
    if (transferId) {
      fetch("/api/transfer-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId }),
      }).catch(() => {});
    }
    onTransferred();
    setStep("done");
  }

  const emailValid = email.includes("@") && email !== userEmail;
  const seatsValid = selectedSeats.length > 0;
  const displayName = lookupResult?.name || email;

  return (
    /* Bottom-sheet on mobile, centred dialog on desktop */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink-muted/20" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-4 flex items-start justify-between gap-3 border-b border-ivory-200 shrink-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Send a ticket</p>
            <p className="font-display font-bold text-ink text-lg mt-0.5" style={{ letterSpacing: "-0.015em" }}>{order.eventTitle}</p>
            <p className="font-ui text-xs text-ink-muted">{fmtDate(order.eventDate)} · {order.tierName}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ivory flex items-center justify-center text-ink-muted hover:text-ink transition-colors shrink-0" style={{ minHeight: 40 }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-6 pt-4 shrink-0">
          {(skipSeatStep ? ["email", "confirm"] : ["tickets", "email", "confirm"]).map(s => (
            <div key={s} className={`h-1 rounded-full flex-1 transition-all ${step === s || (step === "done" && s === "confirm") ? "bg-aubergine" : ["done"].includes(step) || (step === "confirm" && s === "email") || (step === "confirm" && s === "tickets") || (step === "email" && s === "tickets") ? "bg-peacock" : "bg-ivory-200"}`} />
          ))}
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* ── Step: Ticket selection ── */}
          {step === "tickets" && (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Which tickets do you want to transfer?</p>
                <div className="space-y-2">
                  {Array.from({ length: order.qty }, (_, i) => i + 1).map(seat => {
                    const existing = getTransferForSeat(seat, transfers);
                    const isTaken = !!existing;
                    const isSelected = selectedSeats.includes(seat);
                    return (
                      <button
                        key={seat}
                        disabled={isTaken}
                        onClick={() => toggleSeat(seat)}
                        className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all text-left ${
                          isTaken ? "bg-ivory border-ivory-200 opacity-60 cursor-not-allowed" :
                          isSelected ? "bg-aubergine/8 border-aubergine/30" : "bg-white border-ivory-200 hover:border-aubergine/20 active:bg-ivory"
                        }`}
                        style={{ minHeight: 56 }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isTaken ? "border-ivory-200 bg-ivory" :
                          isSelected ? "border-aubergine bg-aubergine" : "border-ink-muted/30"
                        }`}>
                          {isSelected && !isTaken && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: isTaken ? "#E8E3D5" : isSelected ? "#2E1B30" : "#EBE6DB", color: isTaken ? "#9999AA" : isSelected ? "#fff" : "#2E1B30" }}>
                          T{seat}
                        </div>
                        <div className="flex-1">
                          <p className={`font-ui text-sm font-semibold ${isTaken ? "text-ink-muted" : "text-ink"}`}>
                            Ticket {seat} of {order.qty} in this order
                          </p>
                          {isTaken && existing && (
                            <p className="font-mono text-[9px] text-ink-muted/60">
                              {existing.status === "pending" ? `Pending → ${existing.toName || existing.toEmail}` : `Transferred to ${existing.toName || existing.toEmail}`}
                            </p>
                          )}
                        </div>
                        {!isTaken && (
                          <span className="font-mono text-[9px] text-peacock uppercase tracking-wide">Available</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                disabled={!seatsValid}
                onClick={() => setStep("email")}
                className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${seatsValid ? "bg-aubergine text-white hover:bg-aubergine-light active:scale-[0.98]" : "bg-ivory text-ink-muted/50 cursor-not-allowed"}`}
                style={{ minHeight: 56 }}
              >
                {seatsValid ? `Send ${selectedSeats.length} ticket${selectedSeats.length !== 1 ? "s" : ""} →` : "Select at least one ticket"}
              </button>
            </div>
          )}

          {/* ── Step: Email ── */}
          {step === "email" && (
            <div className="space-y-4">
              {selectedSeats.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selectedSeats.map(s => (
                    <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-lg bg-aubergine/8 text-aubergine border border-aubergine/15">T{s}</span>
                  ))}
                  {!skipSeatStep && (
                    <button onClick={() => setStep("tickets")} className="font-mono text-[9px] px-2 py-1 rounded-lg border border-ivory-200 text-ink-muted hover:text-ink transition-colors">
                      Edit
                    </button>
                  )}
                </div>
              )}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted block mb-2">Who should get {selectedSeats.length === 1 ? "this ticket" : "these tickets"}?</label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="their@email.com"
                  className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
                />
                {email === userEmail && <p className="font-mono text-[10px] text-durga mt-1.5">That&apos;s your own email.</p>}
              </div>

              {emailValid && (
                <div className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                  lookupLoading ? "bg-ivory border border-ivory-200" :
                  lookupResult?.exists ? "bg-peacock/8 border border-peacock/20" :
                  lookupResult !== null ? "bg-marigold/8 border border-marigold/20" : "bg-ivory border border-ivory-200"
                }`}>
                  {lookupLoading ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-ink-muted animate-spin shrink-0" /><p className="font-ui text-xs text-ink-muted">Looking up…</p></>
                  ) : lookupResult?.exists ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-peacock flex items-center justify-center text-white font-bold text-xs shrink-0">{(lookupResult.name ?? email).charAt(0).toUpperCase()}</div>
                      <div><p className="font-ui text-sm font-semibold text-ink">{lookupResult.name}</p><p className="font-mono text-[10px] text-peacock">Rameelo member · They&apos;ll see it instantly in their portal</p></div>
                    </>
                  ) : lookupResult !== null ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-marigold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div><p className="font-ui text-sm font-semibold text-ink">Not on Rameelo yet</p><p className="font-mono text-[10px] text-marigold-dark">We&apos;ll give you a link to share so they can claim it</p></div>
                    </>
                  ) : null}
                </div>
              )}

              <button disabled={!emailValid || lookupLoading} onClick={() => setStep("confirm")}
                className={`w-full py-4 rounded-2xl font-display font-bold text-base transition-all ${emailValid && !lookupLoading ? "bg-aubergine text-white hover:bg-aubergine-light active:scale-[0.98]" : "bg-ivory text-ink-muted/50 cursor-not-allowed"}`}
                style={{ minHeight: 56 }}>
                Continue →
              </button>
              {!skipSeatStep && order.qty > 1 && (
                <button onClick={() => setStep("tickets")} className="w-full py-2 text-ink-muted font-ui text-sm hover:text-ink transition-colors">← Change selection</button>
              )}
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
                    { label: "Tickets", value: selectedSeats.length === order.qty ? `All ${order.qty} tickets` : `${selectedSeats.length} ticket${selectedSeats.length !== 1 ? "s" : ""}` },
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
                <svg className="w-4 h-4 text-durga shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="font-ui text-xs text-ink-muted leading-relaxed">The QR code{selectedSeats.length !== 1 ? "s" : ""} for {selectedSeats.length !== 1 ? "these tickets" : "this ticket"} will be hidden until the transfer is accepted or cancelled. Once accepted, {selectedSeats.length !== 1 ? "they belong" : "it belongs"} to the recipient.</p>
              </div>
              {error && <p className="font-ui text-xs text-durga">{error}</p>}
              <div className="space-y-2">
                <button disabled={submitting} onClick={handleConfirm}
                  className="w-full py-4 rounded-2xl bg-aubergine text-white font-display font-bold text-base hover:bg-aubergine-light active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{ minHeight: 56 }}>
                  {submitting ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</> : "Confirm & Send →"}
                </button>
                <button onClick={() => setStep("email")} className="w-full py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">
                  ← Change recipient
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-peacock/10 border border-peacock/20 flex items-center justify-center mx-auto text-2xl">✈️</div>
              <div>
                <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.015em" }}>Transfer sent!</p>
                <p className="font-ui text-sm text-ink-muted mt-1">
                  {lookupResult?.exists
                    ? `We emailed ${displayName} a claim link — they'll also see it in their Rameelo portal.`
                    : `We emailed ${email} a link to claim their ticket${selectedSeats.length !== 1 ? "s" : ""}. You can also share it directly below.`}
                </p>
              </div>
              {!lookupResult?.exists && claimLink && (
                <div className="rounded-xl border border-ivory-200 bg-ivory p-3 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Claim link</p>
                  <p className="font-mono text-[10px] text-ink break-all mb-2">{claimLink}</p>
                  <button onClick={() => { navigator.clipboard.writeText(claimLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="w-full py-2 rounded-xl bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-colors">
                    {copied ? "Copied ✓" : "Copy link"}
                  </button>
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 rounded-2xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Incoming Transfer Card ─────────────────────────────────────────────────────
function IncomingTransferCard({ transfer, onAccepted, onDeclined }: {
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
    // Decline via the route so the sender gets notified (tickets back in their
    // wallet). The RPC persists the decline even if the email send fails.
    const res = await fetch("/api/transfer-declined", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: transfer.token }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const msg = res ? (await res.json().catch(() => ({}))).error : null;
      setError(msg || "Couldn't decline this transfer. Please try again.");
      setStep("idle");
      return;
    }
    onDeclined(transfer.id);
  }

  const seatLabel = transfer.seatNumbers.length > 0 ? transfer.seatNumbers.map(s => `T${s}`).join(", ") : `${transfer.qty} ticket${transfer.qty !== 1 ? "s" : ""}`;

  return (
    <div className="rounded-2xl border-2 border-marigold/30 bg-gradient-to-br from-marigold/5 to-transparent overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-marigold/15 flex items-center justify-center shrink-0 text-lg">🎟️</div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/15 text-marigold-dark font-bold">Ticket Sent to You</span>
            <p className="font-display font-bold text-ink text-base leading-tight mt-1" style={{ letterSpacing: "-0.015em" }}>{transfer.eventTitle}</p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">{seatLabel} · {transfer.tierName} · {fmtDate(transfer.eventDate)}</p>
            <p className="font-ui text-xs text-ink-muted">From <span className="font-semibold text-ink">{transfer.fromName || transfer.fromEmail}</span></p>
          </div>
        </div>
        {error && <p className="font-ui text-xs text-durga mb-3">{error}</p>}
        {step === "idle" && (
          <div className="flex gap-2">
            <button onClick={() => setStep("confirm_decline")} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm font-semibold text-ink-muted hover:text-ink transition-colors">Decline</button>
            <button onClick={() => setStep("confirm_accept")} className="flex-1 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all active:scale-[0.98]">Accept →</button>
          </div>
        )}
        {step === "confirm_accept" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-peacock/8 border border-peacock/20 px-4 py-3"><p className="font-ui text-xs text-ink">Accepting adds {seatLabel} to your wallet. This cannot be undone.</p></div>
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink-muted">Cancel</button>
              <button onClick={handleAccept} className="flex-1 py-2.5 rounded-xl bg-peacock text-white font-display font-bold text-sm">Yes, accept</button>
            </div>
          </div>
        )}
        {step === "confirm_decline" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-durga/8 border border-durga/15 px-4 py-3"><p className="font-ui text-xs text-ink-muted">Declining will notify the sender their transfer was not accepted.</p></div>
            <div className="flex gap-2">
              <button onClick={() => setStep("idle")} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink-muted">Cancel</button>
              <button onClick={handleDecline} className="flex-1 py-2.5 rounded-xl bg-durga/80 text-white font-ui text-sm font-semibold">Decline</button>
            </div>
          </div>
        )}
        {step === "loading" && <div className="flex justify-center py-2"><div className="w-5 h-5 rounded-full border-2 border-ivory-200 border-t-aubergine animate-spin" /></div>}
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
              <span className="font-ui text-sm text-ink">{m.name}{m.isOrganizer && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-marigold-dark bg-marigold/10 px-1.5 py-0.5 rounded-full">Organizer</span>}</span>
            </div>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
              {m.paid && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>
        ))}
      </div>
      <Link href={`/group/${groupId}`} className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 transition-all">View Group Page →</Link>
    </div>
  );
}

// ── Apple Wallet button ────────────────────────────────────────────────────────
// Apple Wallet isn't fully built yet — keep the button, but surface "Coming soon"
// on hover (desktop) and on tap (mobile), with no navigation.
function AppleWalletButton({ full = false }: { orderId: string; seat: number; full?: boolean }) {
  const [soon, setSoon] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function tap(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setSoon(true); // mobile feedback — briefly show "Coming soon"
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSoon(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={tap}
      onMouseEnter={() => setSoon(true)}
      onMouseLeave={() => setSoon(false)}
      title="Coming soon"
      aria-label="Add to Apple Wallet — coming soon"
      className={`flex items-center justify-center gap-1.5 rounded-xl bg-aubergine text-white font-ui font-semibold transition-all ${soon ? "opacity-90" : "hover:bg-aubergine-light"} ${full ? "w-full py-3 text-sm" : "px-3.5 py-2.5 text-[13px]"}`}
      style={{ minHeight: 44 }}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      {soon ? "Coming soon" : "Apple Wallet"}
    </button>
  );
}

// ── Fullscreen QR (enlarge + brighten for scanning) ─────────────────────────────
function QREnlargeModal({ ticketId, eventTitle, tierName, onClose }: {
  ticketId: string; eventTitle: string; tierName: string; onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center px-6" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-ink/5 flex items-center justify-center text-ink/60 hover:text-ink transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <p className="font-display font-bold text-ink text-lg leading-tight" style={{ letterSpacing: "-0.015em" }}>{eventTitle}</p>
          <p className="font-ui text-sm text-ink-muted">{tierName}</p>
        </div>
        <div className="p-5 rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-ivory-200">
          <QRCode value={ticketQrValue(ticketId.replace(/-T\d+$/, ""))} size={Math.min(320, typeof window !== "undefined" ? window.innerWidth - 96 : 320)} />
        </div>
        <p className="font-mono text-[11px] text-ink/40">{ticketRef(ticketId.split("-T")[0], Number(ticketId.split("-T")[1] || 1))}</p>
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peacock/10 border border-peacock/20">
          <span className="w-1.5 h-1.5 rounded-full bg-peacock animate-pulse" />
          <p className="font-mono text-[11px] text-peacock font-bold uppercase tracking-widest">Screen brightened · show at entry</p>
        </div>
      </div>
    </div>
  );
}

// ── A single ticket slide (one seat) ────────────────────────────────────────────
type Slide = { order: PortalOrderRow; seat: number; transfer?: SeatTransfer; globalIndex: number };

function seasonLabel(order: PortalOrderRow) {
  const cat = (order.category || "Garba").trim();
  const catUpper = cat.charAt(0).toUpperCase() + cat.slice(1);
  const yr = order.eventDate ? `'${order.eventDate.slice(2, 4)}` : "";
  return `${catUpper} · Navratri ${yr}`.trim();
}

function TicketSlide({ slide, total, onEnlarge, onTransfer, onCancelTransfer }: {
  slide: Slide;
  total: number;
  onEnlarge: (ticketId: string, eventTitle: string, tierName: string) => void;
  onTransfer: (order: PortalOrderRow, seat: number) => void;
  onCancelTransfer: () => void;
}) {
  const { order, seat, transfer, globalIndex } = slide;
  const ticketId = `${order.orderId}-T${seat}`;
  const paymentPending = order.paymentPending; // ACH order awaiting clearance — no valid QR yet
  const isPending = transfer?.status === "pending";
  const isTransferred = transfer?.status === "accepted";
  const isGroup = !!order.groupId; // group allocations use "claim" wording
  const isUpcoming = order.eventDate >= new Date().toISOString().slice(0, 10);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!transfer) return;
    setCancelling(true);
    await cancelTransfer(transfer.id);
    setCancelling(false);
    onCancelTransfer();
  }

  const statusBadge = paymentPending
    ? { label: "Pending payment", cls: "text-marigold-dark" }
    : isTransferred
      ? { label: isGroup ? "Claimed" : "Sent", cls: "text-ink-muted" }
      : isPending
        ? { label: isGroup ? "To claim" : "Pending", cls: "text-marigold-dark" }
        : { label: "Valid", cls: "text-peacock" };

  return (
    <div className="relative">
      {/* Ticket-stub perforation notches (desktop seam at 42%) */}
      <div className="hidden lg:block absolute w-4 h-4 rounded-full bg-ivory z-20" style={{ left: "42%", top: -8, transform: "translateX(-50%)" }} />
      <div className="hidden lg:block absolute w-4 h-4 rounded-full bg-ivory z-20" style={{ left: "42%", bottom: -8, transform: "translateX(-50%)" }} />
    <div className="rounded-[28px] border border-ivory-200 bg-white shadow-sm flex flex-col lg:flex-row overflow-hidden">
      {/* ── Gradient event panel ── */}
      <div
        className="relative lg:w-[42%] shrink-0 p-6 sm:p-7 flex flex-col text-white min-h-[230px] lg:min-h-[420px]"
        style={{ background: coverBackground(order.coverImageUrl, order.coverGradient) }}
      >
        {/* texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.18]" style={{ backgroundImage: "radial-gradient(circle at 75% 15%, rgba(255,255,255,0.5) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(0,0,0,0.25) 0%, transparent 50%)" }} />
        <div className="relative flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {seasonLabel(order)}
            </span>
            <div className="flex items-center gap-1.5">
              {order.isCombo && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest font-bold bg-marigold text-aubergine px-2 py-1 rounded-full">✨ Combo</span>
              )}
              {order.isTest && (
                <span className="inline-flex items-center font-mono text-[9px] uppercase tracking-widest font-bold bg-white/20 text-white px-2 py-1 rounded-full">Test</span>
              )}
            </div>
          </div>

          <div className="mt-auto pt-8">
            <h3 className="font-editorial italic leading-[0.98] mb-1.5" style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)", letterSpacing: "-0.01em" }}>
              {order.eventTitle}
            </h3>
            {order.artistName && (
              <p className="font-ui text-white/75 text-sm mb-4">
                {order.artistName}{isUpcoming ? " · live" : ""}
              </p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-white/85">
                <svg className="w-3.5 h-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="font-ui text-[13px]">{fmtDate(order.eventDate)}</span>
              </div>
              {order.eventTime && (
                <div className="flex items-center gap-2 text-white/85">
                  <svg className="w-3.5 h-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-ui text-[13px]">Doors {fmtTime(order.eventTime)}</span>
                </div>
              )}
              {(order.venue || order.city) && (
                <div className="flex items-center gap-2 text-white/85">
                  <svg className="w-3.5 h-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-ui text-[13px] truncate">{[order.venue, [order.city, order.state].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail + QR panel ── */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch">
        {/* QR / status block */}
        <div className="flex flex-col items-center justify-center gap-2.5 p-6 sm:p-7 lg:border-r border-dashed border-ivory-200">
          {paymentPending ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-6 max-w-[220px]">
              <div className="w-14 h-14 rounded-2xl bg-marigold/15 flex items-center justify-center text-2xl">⏳</div>
              <p className="font-display font-bold text-ink text-sm">Payment pending</p>
              <p className="font-ui text-xs text-ink-muted leading-snug">
                Your bank transfer is clearing. Your QR code appears here as soon as payment settles — usually 2–5 business days.
              </p>
            </div>
          ) : isPending || isTransferred ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-6 max-w-[220px]">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isPending ? "bg-marigold/15" : "bg-ivory-200"}`}>
                {isPending ? "✈️" : "✓"}
              </div>
              <p className="font-display font-bold text-ink text-sm">
                {isPending ? (isGroup ? "Pending claim" : "Transfer pending") : (isGroup ? "Claimed" : "Transferred")}
              </p>
              <p className="font-ui text-xs text-ink-muted leading-snug">
                {isPending
                  ? `Waiting for ${transfer!.toName || transfer!.toEmail} to ${isGroup ? "claim" : "accept"}.`
                  : `${isGroup ? "Claimed by" : "Now belongs to"} ${transfer!.toName || transfer!.toEmail}.`}
              </p>
              {isPending && !isGroup && (
                <button disabled={cancelling} onClick={handleCancel} className="font-mono text-[10px] text-durga/70 hover:text-durga transition-colors flex items-center gap-1">
                  {cancelling ? "Cancelling…" : "Cancel transfer"}
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => onEnlarge(ticketId, order.eventTitle, order.tierName)}
                className="relative group p-3.5 rounded-2xl bg-white border border-ivory-200 hover:border-aubergine/30 transition-colors"
                aria-label="Enlarge QR code"
              >
                <QRCode value={ticketQrValue(order.orderId)} size={150} />
                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-lg bg-aubergine/90 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </span>
              </button>
              <p className="font-mono text-[10px] text-ink-muted flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                Tap to enlarge &amp; brighten
              </p>
            </>
          )}
        </div>

        {/* Details + actions */}
        <div className="flex-1 p-6 sm:p-7 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-marigold-dark font-bold">{order.tierName}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${paymentPending ? "bg-marigold" : isTransferred ? "bg-ink-muted/40" : isPending ? "bg-marigold" : "bg-peacock"}`} />
              <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${statusBadge.cls}`}>{statusBadge.label}</span>
            </span>
          </div>

          <h4 className="font-display font-bold text-ink leading-none mb-1" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.025em" }}>
            Ticket {globalIndex + 1} <span className="text-ink-muted/50 font-normal">of {total}</span>
          </h4>
          <p className={`font-mono text-[11px] text-ink-muted ${order.receivedFrom ? "mb-2" : "mb-5"}`}>{ticketRef(order.orderId, seat)}</p>

          {/* Combo — one ticket, multiple events */}
          {order.isCombo && (order.comboEvents?.length ?? 0) > 0 && (
            <div className="mb-5 inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-marigold/10 border border-marigold/30 self-start">
              <span className="text-sm leading-none mt-0.5">✨</span>
              <span className="font-ui text-[11px] text-[#a06b00] font-semibold">
                Combo ticket · valid for {order.comboEvents!.map(e => e.title).join(" · ")}
              </span>
            </div>
          )}

          {/* Provenance — small note when this ticket was received from someone */}
          {order.receivedFrom && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-peacock/8 border border-peacock/20 self-start">
              <svg className="w-3.5 h-3.5 text-peacock shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              <span className="font-ui text-[11px] text-peacock font-semibold">
                {order.receivedFromGroup ? `Group order · from ${order.receivedFrom}` : `Received from ${order.receivedFrom}`}
              </span>
            </div>
          )}

          {!paymentPending && !isPending && !isTransferred && (
            <div className="space-y-2.5">
              <button
                onClick={() => onEnlarge(ticketId, order.eventTitle, order.tierName)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light active:scale-[0.98] transition-all"
                style={{ minHeight: 48 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a2 2 0 012-2h2M4 17v2a2 2 0 002 2h2m8-18h2a2 2 0 012 2v2m-4 14h2a2 2 0 002-2v-2M9 12h6" /></svg>
                Show at entry
              </button>
              {order.receivedFrom ? (
                /* Received tickets can be shown/added to wallet, but not re-transferred here. */
                <AppleWalletButton orderId={order.orderId} seat={seat} />
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <AppleWalletButton orderId={order.orderId} seat={seat} />
                  <button
                    onClick={() => onTransfer(order, seat)}
                    disabled={!isUpcoming}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-ink/12 text-ink font-ui font-semibold text-[13px] hover:bg-ivory active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ minHeight: 44 }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Transfer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Tickets carousel ────────────────────────────────────────────────────────────
function TicketsCarousel({ eventTitle, orders, userId, userEmail, onRefresh }: {
  eventTitle?: string;
  orders: PortalOrderRow[];
  userId: string;
  userEmail: string;
  onRefresh: () => void;
}) {
  // Flatten every order into per-seat slides
  const slides: Slide[] = [];
  orders.forEach(order => {
    const transfers = order.transfers ?? [];
    for (let seat = 1; seat <= order.qty; seat++) {
      slides.push({ order, seat, transfer: getTransferForSeat(seat, transfers), globalIndex: slides.length });
    }
  });
  const total = slides.length;

  const [current, setCurrent] = useState(0);
  const [enlarge, setEnlarge] = useState<{ ticketId: string; eventTitle: string; tierName: string } | null>(null);
  const [transferModal, setTransferModal] = useState<{ order: PortalOrderRow; seats: number[] } | null>(null);
  const touchX = useRef<number | null>(null);

  const safeCurrent = Math.min(current, Math.max(0, total - 1));
  const slide = slides[safeCurrent];

  function go(dir: -1 | 1) {
    setCurrent(c => Math.max(0, Math.min(total - 1, c + dir)));
  }

  if (total === 0) return null;

  return (
    <div>
      {enlarge && (
        <QREnlargeModal {...enlarge} onClose={() => setEnlarge(null)} />
      )}
      {transferModal && (
        <TransferModal
          order={transferModal.order}
          userId={userId}
          userEmail={userEmail}
          preselectedSeats={transferModal.seats}
          onClose={() => setTransferModal(null)}
          onTransferred={() => { setTransferModal(null); onRefresh(); }}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-ink text-lg truncate" style={{ letterSpacing: "-0.015em" }}>
            {eventTitle ? eventTitle : "Your tickets"}
          </h2>
          <p className="font-ui text-xs text-ink-muted">{total} ticket{total !== 1 ? "s" : ""} for this event</p>
        </div>
        <p className="font-mono text-sm text-ink-muted tabular-nums shrink-0">
          <span className="text-ink font-bold">{String(safeCurrent + 1).padStart(2, "0")}</span> / {total}
        </p>
      </div>

      {/* Carousel */}
      <div
        className="relative"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <TicketSlide
          slide={slide}
          total={total}
          onEnlarge={(ticketId, eventTitle, tierName) => setEnlarge({ ticketId, eventTitle, tierName })}
          onTransfer={(order, seat) => setTransferModal({ order, seats: [seat] })}
          onCancelTransfer={onRefresh}
        />

        {/* Arrows (desktop) */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              disabled={safeCurrent === 0}
              aria-label="Previous ticket"
              className="hidden sm:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-ivory-200 shadow-md items-center justify-center text-ink hover:bg-ivory active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => go(1)}
              disabled={safeCurrent === total - 1}
              aria-label="Next ticket"
              className="hidden sm:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-ivory-200 shadow-md items-center justify-center text-ink hover:bg-ivory active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Group panel for current slide's order */}
      {slide.order.groupId && slide.order.groupMembers && slide.order.groupMembers.length > 0 && (
        <GroupMembersPanel members={slide.order.groupMembers} groupId={slide.order.groupId} />
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-5 flex-wrap">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to ticket ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === safeCurrent ? 22 : 7,
                height: 7,
                backgroundColor: i === safeCurrent ? "#2E1B30" : "rgba(46,27,48,0.18)",
              }}
            />
          ))}
        </div>
      )}

      {/* Helper hint */}
      {total > 1 && (
        <p className="text-center font-ui text-xs text-ink-muted mt-3 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Swipe or use arrows to see your other tickets
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </p>
      )}

      {/* Receipt links per order for this event */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {orders.map((o, i) => (
          <Link key={o.orderId} href={`/portal/tickets/${o.orderId}`} className="font-mono text-[10px] text-aubergine/70 hover:text-aubergine hover:underline flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {orders.length > 1 ? `Receipt · Order ${i + 1}` : "View receipt"}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Featured upcoming summary card ──────────────────────────────────────────────
function SummaryCard({ order }: { order: PortalOrderRow }) {
  const days = Math.ceil((new Date(order.eventDate + "T00:00:00").getTime() - Date.now()) / 86400000);
  const d = new Date(order.eventDate + "T00:00:00");
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();

  return (
    <div className="rounded-[24px] overflow-hidden border border-ivory-200 bg-white shadow-sm flex flex-col sm:flex-row">
      {/* Date gradient chip panel */}
      <div
        className="relative shrink-0 sm:w-[148px] p-5 flex flex-col justify-end text-white min-h-[110px]"
        style={{ background: coverBackground(order.coverImageUrl, order.coverGradient) }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.16]" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.6) 0%, transparent 50%)" }} />
        <p className="relative font-editorial italic leading-[0.9]" style={{ fontSize: "1.9rem" }}>
          {mon}<br />{day}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 p-5 sm:p-6 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-mono text-[9px] uppercase tracking-widest font-bold bg-peacock/12 text-peacock px-2 py-1 rounded-md">Upcoming</span>
          {days >= 0 && <span className="font-ui text-[13px] text-ink-muted">in {days} day{days !== 1 ? "s" : ""}</span>}
        </div>
        <h3 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "clamp(1.4rem, 3vw, 1.75rem)", letterSpacing: "-0.025em" }}>
          {order.eventTitle}
        </h3>
        {order.artistName && <p className="font-ui text-sm text-ink-muted mb-3">{order.artistName}</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
          <span className="font-ui text-[13px] text-ink-muted flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-ink/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {fmtDate(order.eventDate)}
          </span>
          {(order.city || order.state) && (
            <span className="font-ui text-[13px] text-ink-muted flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-ink/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {[order.city, order.state].filter(Boolean).join(", ")}
            </span>
          )}
          {order.eventTime && (
            <span className="font-ui text-[13px] text-ink-muted flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-ink/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Doors {fmtTime(order.eventTime)}
            </span>
          )}
          <span className="font-ui text-[13px] text-ink font-semibold">{order.qty} × {order.tierName}</span>
        </div>
      </div>
    </div>
  );
}

// ── Event group (one card per event) ────────────────────────────────────────────
type EventGroup = {
  eventId: string; eventTitle: string; eventDate: string; eventTime: string;
  city: string; state: string; coverGradient: string; coverImageUrl: string | null;
  orders: PortalOrderRow[]; tickets: number;
};

function groupOrdersByEvent(orders: PortalOrderRow[]): EventGroup[] {
  const map = new Map<string, EventGroup>();
  for (const o of orders) {
    const g = map.get(o.eventId) ?? {
      eventId: o.eventId, eventTitle: o.eventTitle, eventDate: o.eventDate, eventTime: o.eventTime,
      city: o.city, state: o.state, coverGradient: o.coverGradient, coverImageUrl: o.coverImageUrl,
      orders: [], tickets: 0,
    };
    g.orders.push(o);
    g.tickets += o.qty;
    map.set(o.eventId, g);
  }
  return Array.from(map.values()).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

// Render a received ticket (transfer / group allocation) through the same large
// ticket carousel as owned tickets — its QR lives there, tagged with where it
// came from. groupId is intentionally left undefined so the group-members panel
// doesn't trigger; provenance is carried on receivedFrom/receivedFromGroup.
function receivedToOrder(t: ReceivedTicket): PortalOrderRow {
  return {
    orderId: t.orderId,
    groupId: undefined,
    eventId: t.eventId,
    eventTitle: t.eventTitle,
    eventDate: t.eventDate,
    eventTime: t.eventTime,
    city: t.city,
    state: t.state,
    venue: t.venue,
    category: "",
    coverGradient: t.coverGradient,
    coverImageUrl: t.coverImageUrl,
    artistName: t.artistName,
    tierName: t.tierName,
    qty: t.seatNumbers.length || 1,
    unitPrice: 0,
    grandTotal: 0,
    isTest: t.isTest,
    purchasedAt: t.acceptedAt,
    status: "confirmed",
    paymentMethod: "",
    paymentPending: false,
    receivedFrom: t.fromName,
    receivedFromGroup: !!t.groupId,
    transfers: [],
  };
}

function EventSelector({ groups, selectedId, onSelect }: {
  groups: EventGroup[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2.5">
        Pick an event · {groups.length} with tickets
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {groups.map(g => {
          const active = g.eventId === selectedId;
          return (
            <button
              key={g.eventId}
              onClick={() => onSelect(g.eventId)}
              className={`flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all ${
                active ? "border-aubergine bg-aubergine/[0.04] ring-1 ring-aubergine/30" : "border-ivory-200 bg-white hover:border-aubergine/30"
              }`}
            >
              <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-lg overflow-hidden" style={{ background: coverBackground(g.coverImageUrl, g.coverGradient) }}>
                {!g.coverImageUrl && <span>🪔</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-display font-bold text-sm leading-tight truncate ${active ? "text-aubergine" : "text-ink"}`}>{g.eventTitle}</p>
                <p className="font-ui text-xs text-ink-muted truncate">
                  {fmtDate(g.eventDate)}{(g.city || g.state) && ` · ${[g.city, g.state].filter(Boolean).join(", ")}`}
                </p>
              </div>
              <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${active ? "bg-aubergine text-white" : "bg-ivory text-ink-muted border border-ivory-200"}`}>
                {g.tickets} ticket{g.tickets !== 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [orders, setOrders] = useState<PortalOrderRow[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [receivedTickets, setReceivedTickets] = useState<ReceivedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "test">("upcoming");
  const [isAdmin, setIsAdmin] = useState(false); // test orders are only visible to admins
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function loadAll(uid: string, email: string) {
    const [ordersData, incoming, received] = await Promise.all([
      loadMyOrders(uid),
      email ? loadIncomingTransfers(email) : Promise.resolve([]),
      loadReceivedTickets(uid),
    ]);

    // Auto-expire pending transfers older than 24 hours (checked from sender's view).
    // Group-order allocations are excluded — those are claimable indefinitely.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = ordersData.flatMap(o =>
      o.groupId ? [] : (o.transfers ?? []).filter(t => t.status === "pending" && new Date(t.createdAt).getTime() < cutoff)
    );
    if (stale.length > 0) {
      await Promise.all(stale.map(t => cancelTransfer(t.id)));
      // Reload orders after auto-cancellation
      const refreshed = await loadMyOrders(uid);
      setOrders(refreshed);
    } else {
      setOrders(ordersData);
    }

    setIncomingTransfers(incoming);
    setReceivedTickets(received);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      // Only admins see test orders (and the Test tab); everyone else has them hidden.
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(prof?.role === "admin");
      await loadAll(user.id, user.email ?? "");
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleIncomingAccepted(transferId: string) {
    setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));
    if (userId) loadAll(userId, userEmail);
  }
  function handleIncomingDeclined(transferId: string) {
    setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));
  }

  // Received tickets (accepted transfers / group allocations) flow through the
  // same carousel as owned tickets, tagged with where they came from.
  const allOrders = [...orders, ...receivedTickets.map(receivedToOrder)];

  // Test orders are hidden from all normal views; admins get a dedicated Test tab.
  const realOrders = orders.filter(o => !o.isTest); // owned purchases — drives counts/featured
  const testOrders = allOrders.filter(o => o.isTest);
  const liveTicketCount = allOrders.filter(o => !o.isTest).length;

  const filtered = allOrders.filter(o => {
    if (filter === "test")     return o.isTest;       // admin-only tab
    if (o.isTest)              return false;          // never in upcoming/past/all
    if (filter === "upcoming") return o.eventDate >= today;
    if (filter === "past")     return o.eventDate < today;
    return true;
  });

  const totalTransferredSeats = realOrders.reduce((sum, o) => {
    const transfers = o.transfers ?? [];
    const accepted = transfers.filter(t => t.status === "accepted");
    return sum + accepted.reduce((s, t) => s + (t.seatNumbers.length || o.qty), 0);
  }, 0);
  const totalPendingSeats = realOrders.reduce((sum, o) => {
    const transfers = o.transfers ?? [];
    const pending = transfers.filter(t => t.status === "pending");
    return sum + pending.reduce((s, t) => s + (t.seatNumbers.length || o.qty), 0);
  }, 0);

  const nextUpcoming = realOrders
    .filter(o => o.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0] ?? null;
  // Group the member's tickets by event so they can pick which event to view.
  const eventGroups = groupOrdersByEvent(filtered);
  const activeGroup = eventGroups.find(g => g.eventId === selectedEventId) ?? eventGroups[0] ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted/70 mb-1.5">My Portal · Tickets</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", letterSpacing: "-0.03em" }}>Your tickets</h1>
          {!loading && (
            <p className="font-ui text-ink-muted text-sm mt-1">
              {realOrders.length} order{realOrders.length !== 1 ? "s" : ""}
              {totalTransferredSeats > 0 && <span className="text-ink-muted/60"> · {totalTransferredSeats} transferred</span>}
              {totalPendingSeats > 0 && <span className="text-marigold-dark"> · {totalPendingSeats} pending</span>}
            </p>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06]">
          {(["upcoming", "past", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>{f}</button>
          ))}
          {/* Test orders are admin-only and tucked away in their own tab. */}
          {isAdmin && testOrders.length > 0 && (
            <button onClick={() => setFilter("test")} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === "test" ? "bg-white text-marigold-dark shadow-sm" : "text-ink-muted/70 hover:text-marigold-dark"}`}>
              Test <span className="font-mono">({testOrders.length})</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <>
          {/* Admin-only test orders notice */}
          {filter === "test" && (
            <div className="rounded-xl bg-marigold/8 border border-marigold/25 px-4 py-3 flex items-start gap-2">
              <svg className="w-4 h-4 text-marigold-dark shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-ui text-xs text-ink-muted"><strong className="text-ink">Admin view.</strong> Test orders are hidden from members and don&rsquo;t count toward real sales or revenue.</p>
            </div>
          )}

          {/* Featured upcoming order */}
          {filter !== "test" && nextUpcoming && <SummaryCard order={nextUpcoming} />}

          {/* Incoming pending transfers */}
          {filter !== "test" && incomingTransfers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Tickets Sent to You</p>
                <span className="w-5 h-5 rounded-full bg-marigold flex items-center justify-center font-bold text-aubergine text-[10px]">{incomingTransfers.length}</span>
              </div>
              {incomingTransfers.map(t => <IncomingTransferCard key={t.id} transfer={t} onAccepted={handleIncomingAccepted} onDeclined={handleIncomingDeclined} />)}
            </div>
          )}

          {/* Received tickets now flow into the per-event carousel below, tagged
              with where they came from — no separate QR cards. */}

          {/* My tickets — grouped by event */}
          {filtered.length === 0 || !activeGroup ? (
            <div className="text-center py-16">
              <p className="font-display text-xl font-bold text-ink mb-2">{liveTicketCount === 0 ? "No tickets yet" : `No ${filter} tickets`}</p>
              <p className="font-ui text-ink-muted text-sm mb-6">{liveTicketCount === 0 ? "Your tickets will appear here after purchase." : "Adjust the filter to see other tickets."}</p>
              <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Event picker — only when tickets span multiple events */}
              {eventGroups.length > 1 && (
                <EventSelector groups={eventGroups} selectedId={activeGroup.eventId} onSelect={setSelectedEventId} />
              )}

              {/* Tickets for the selected event (remounts per event to reset position) */}
              <TicketsCarousel
                key={activeGroup.eventId}
                eventTitle={activeGroup.eventTitle}
                orders={activeGroup.orders}
                userId={userId}
                userEmail={userEmail}
                onRefresh={() => loadAll(userId, userEmail)}
              />
            </div>
          )}
        </>
      )}

      {!loading && (
        <div className="rounded-2xl p-6 text-center border-2 border-dashed border-ivory-200">
          <p className="font-display font-bold text-ink text-lg mb-1">Find your next night</p>
          <p className="font-ui text-ink-muted text-sm mb-4">100+ events this Navratri season across the US.</p>
          <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
        </div>
      )}
    </div>
  );
}
