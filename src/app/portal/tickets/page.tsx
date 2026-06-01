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
  loadReceivedTickets,
  acceptTransfer,
  type IncomingTransfer,
  type ReceivedTicket,
  type TicketTransfer,
} from "@/lib/transfers";

// ── QR Code ───────────────────────────────────────────────────────────────────
function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  const grid = 21;
  let seed = value.split("").reduce((a, c) => (a * 1664525 + c.charCodeAt(0)) & 0x7fffffff, 1013904223);
  function next() { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; }
  const cells = Array.from({ length: grid }, (_, r) =>
    Array.from({ length: grid }, (__, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7)) {
        const lr = r < 7 ? r : r - (grid - 7); const lc = c < 7 ? c : c >= grid - 7 ? c - (grid - 7) : c;
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      }
      return next() > 0.42;
    })
  );
  const cs = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", imageRendering: "pixelated" }}>
      <rect width={size} height={size} fill="white" rx={3} />
      {cells.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c * cs + 0.5} y={r * cs + 0.5} width={cs - 1} height={cs - 1} fill="#2E1B30" rx={0.5} /> : null))}
    </svg>
  );
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

const AVATAR_COLORS = ["#2E1B30", "#0E8C7A", "#7C1F2C", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

type SeatTransfer = PortalOrderRow["transfers"] extends (infer T)[] | undefined ? T : never;

// Given a seat number and order's transfers, find if that seat is in a transfer
function getTransferForSeat(seat: number, transfers: SeatTransfer[]): SeatTransfer | undefined {
  return transfers.find(t => {
    if (t.seatNumbers.length === 0) return true; // legacy: covers all seats
    return t.seatNumbers.includes(seat);
  });
}

// ── Transfer Modal ─────────────────────────────────────────────────────────────
type TransferStep = "seats" | "email" | "confirm" | "done";

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

  const [step, setStep] = useState<TransferStep>(skipSeatStep ? "email" : "seats");
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
    const { token, error: err } = await initiateTransfer({
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
          {(skipSeatStep ? ["email", "confirm"] : ["seats", "email", "confirm"]).map(s => (
            <div key={s} className={`h-1 rounded-full flex-1 transition-all ${step === s || (step === "done" && s === "confirm") ? "bg-aubergine" : ["done"].includes(step) || (step === "confirm" && s === "email") || (step === "confirm" && s === "seats") || (step === "email" && s === "seats") ? "bg-peacock" : "bg-ivory-200"}`} />
          ))}
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* ── Step: Seat selection ── */}
          {step === "seats" && (
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
                            Ticket {seat} of {order.qty}
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
                    <button onClick={() => setStep("seats")} className="font-mono text-[9px] px-2 py-1 rounded-lg border border-ivory-200 text-ink-muted hover:text-ink transition-colors">
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
                <button onClick={() => setStep("seats")} className="w-full py-2 text-ink-muted font-ui text-sm hover:text-ink transition-colors">← Change seats</button>
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
                <p className="font-ui text-xs text-ink-muted leading-relaxed">QR codes for the selected seat{selectedSeats.length !== 1 ? "s" : ""} will be hidden until the transfer is accepted or cancelled. Once accepted, these seats permanently belong to the recipient.</p>
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
                  {lookupResult?.exists ? `${displayName} will see it in their Rameelo portal.` : `Share the link below so ${email} can claim their ticket${selectedSeats.length !== 1 ? "s" : ""}.`}
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
    const supabase = createClient();
    await supabase.from("ticket_transfers").update({ status: "cancelled" }).eq("id", transfer.id);
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

// ── Received Ticket Card (accepted transfer — recipient view) ──────────────────
function ReceivedTicketCard({ ticket }: { ticket: ReceivedTicket }) {
  const [expanded, setExpanded] = useState(ticket.eventDate >= new Date().toISOString().slice(0, 10));
  const isUpcoming = ticket.eventDate >= new Date().toISOString().slice(0, 10);
  const seatLabel = ticket.seatNumbers.length > 0 ? ticket.seatNumbers.map(s => `T${s}`).join(", ") : `${ticket.seatNumbers.length} ticket(s)`;

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${expanded ? "border-peacock/30 shadow-md" : "border-ivory-200"} bg-white`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-stretch">
          <div className="w-1.5 shrink-0 rounded-l-2xl bg-peacock" />
          <div className="flex-1 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-peacock/10 text-peacock">Received</span>
                  {isUpcoming && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-ivory-200 text-ink-muted">Upcoming</span>}
                </div>
                <h3 className="font-display font-bold text-ink leading-snug mb-0.5">{ticket.eventTitle}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span className="font-ui text-xs text-ink-muted">📅 {fmtDate(ticket.eventDate)}</span>
                  {ticket.venue && <span className="font-ui text-xs text-ink-muted">📍 {ticket.venue}, {ticket.city}</span>}
                  <span className="font-ui text-xs text-ink-muted">🎟️ {seatLabel} · {ticket.tierName}</span>
                </div>
                <p className="font-mono text-[9px] text-ink-muted/60 mt-1">From {ticket.fromName} · Accepted {fmtDateTime(ticket.acceptedAt)}</p>
              </div>
              <svg className={`w-4 h-4 text-ink-muted mt-1 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </button>
      {expanded && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-5" />
          <div className="px-5 py-4 space-y-2">
            {(ticket.seatNumbers.length > 0 ? ticket.seatNumbers : [1]).map((seat, i) => {
              const ticketId = `${ticket.orderId}-T${seat}`;
              return (
                <div key={i} className="rounded-2xl border border-ivory-200 overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-peacock flex items-center justify-center text-white text-[10px] font-bold shrink-0">T{seat}</div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-ink text-sm">{ticketId}</p>
                      <p className="font-ui text-xs text-ink-muted">{ticket.tierName}</p>
                    </div>
                    <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-peacock/10 text-peacock border border-peacock/20 font-bold">In Wallet</span>
                  </div>
                  <div className="border-t-2 border-dashed border-ivory-200 mx-4" />
                  <div className="px-4 pb-4 pt-3 flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-2xl border-2 border-peacock/20 bg-white shadow-sm"><QRCode value={ticketId} size={140} /></div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-peacock/10 border border-peacock/20">
                        <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
                        <p className="font-mono text-[10px] text-peacock font-bold uppercase tracking-wide">Valid</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Ticket Details</p>
                      {[{ label: "Event", value: ticket.eventTitle }, { label: "Type", value: ticket.tierName }, { label: "Ticket ID", value: ticketId }].map(row => (
                        <div key={row.label} className="flex gap-2 py-1.5 border-b border-ivory-200 last:border-0">
                          <span className="font-ui text-xs text-ink-muted w-16 shrink-0">{row.label}</span>
                          <span className="font-ui text-xs font-semibold text-ink">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
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

// ── Individual Ticket Card (per seat, with per-seat transfer state) ─────────────
function WalletButton({ orderId, seat, size = "sm" }: { orderId: string; seat: number; size?: "sm" | "lg" }) {
  return (
    <a
      href={`/api/wallet/pass/${orderId}?seat=${seat}`}
      onClick={e => e.stopPropagation()}
      className={size === "lg"
        ? "flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-black text-white font-ui text-sm font-medium hover:bg-zinc-800 active:scale-95 transition-all"
        : "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black text-white font-ui font-semibold text-[11px] hover:bg-zinc-800 active:scale-95 transition-all"
      }
    >
      <svg className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      {size === "lg" ? "Add to Apple Wallet" : "Wallet"}
    </a>
  );
}

function TicketCard({ orderId, seat, total, eventTitle, tierName, transfer, onTransfer, onCancelTransfer }: {
  orderId: string; seat: number; total: number; eventTitle: string; tierName: string;
  transfer?: SeatTransfer;
  onTransfer?: (seat: number) => void;
  onCancelTransfer?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const ticketId = `${orderId}-T${seat}`;
  const isPending = transfer?.status === "pending";
  const isTransferred = transfer?.status === "accepted";

  async function handleCancel() {
    if (!transfer) return;
    setCancelling(true);
    await cancelTransfer(transfer.id);
    setCancelling(false);
    onCancelTransfer?.();
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isTransferred ? "border-ivory-200 opacity-60" :
      isPending ? "border-marigold/30" :
      expanded ? "border-marigold/30 shadow-md" : "border-ivory-200"
    } bg-white`}>
      {/* Collapsed row — full-width tap target, actions stack below on mobile */}
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Seat badge */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: isTransferred ? "#E8E3D5" : isPending ? "#F5A623" : "#2E1B30", color: isTransferred ? "#9999AA" : isPending ? "#2E1B30" : "#fff" }}>
            T{seat}
          </div>

          {/* Text — tap to expand */}
          <button
            onClick={() => !isPending && !isTransferred && setExpanded(!expanded)}
            className="flex-1 text-left min-w-0"
            disabled={isPending || isTransferred}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-display font-bold text-sm ${isTransferred ? "text-ink-muted" : "text-ink"}`}>
                {isPending || isTransferred ? tierName : `${tierName} — Seat ${seat} of ${total}`}
              </p>
              <span className={`font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-bold ${
                isTransferred ? "bg-ivory border-ivory-200 text-ink-muted" :
                isPending ? "bg-marigold/15 border-marigold/20 text-marigold-dark" :
                "bg-peacock/10 border-peacock/20 text-peacock"
              }`}>
                {isTransferred ? "Sent" : isPending ? "Transfer pending" : "Valid"}
              </span>
            </div>
            {(isPending || isTransferred) && (
              <p className="font-ui text-xs mt-0.5 text-ink-muted/70">
                → {transfer!.toName || transfer!.toEmail}
              </p>
            )}
          </button>

          {/* Chevron for free seats */}
          {!isPending && !isTransferred && (
            <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1" aria-label="Expand ticket">
              <svg className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Action buttons — below text, full-width on mobile, easy thumb targets */}
        {!isPending && !isTransferred && (
          <div className="flex items-center gap-2 mt-3 ml-13">
            <WalletButton orderId={orderId} seat={seat} size="sm" />
            {onTransfer && (
              <button
                onClick={() => onTransfer(seat)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 active:bg-aubergine/10 transition-all"
                style={{ minHeight: 36 }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Transfer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transferred/pending indicator (collapsed) */}
      {(isPending || isTransferred) && (
        <div className={`mx-4 mb-3 rounded-xl overflow-hidden ${isPending ? "bg-marigold/8 border border-marigold/15" : "bg-ivory border border-ivory-200"}`}>
          <p className={`px-3 pt-2 text-xs font-ui ${isPending ? "text-marigold-dark" : "text-ink-muted"}`}>
            {isPending
              ? `Waiting for ${transfer!.toName || transfer!.toEmail} to accept · Sent ${fmtDateTime(transfer!.createdAt)}`
              : `Accepted by ${transfer!.toName || transfer!.toEmail} · ${transfer!.acceptedAt ? fmtDateTime(transfer!.acceptedAt) : ""}`}
          </p>
          {isPending && (
            <div className="px-3 pb-2 mt-1.5">
              <button
                disabled={cancelling}
                onClick={handleCancel}
                className="flex items-center gap-1 font-mono text-[10px] text-durga/70 hover:text-durga transition-colors"
              >
                {cancelling
                  ? <><div className="w-3 h-3 rounded-full border border-durga/40 border-t-durga animate-spin" />Cancelling…</>
                  : <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Cancel transfer
                    </>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded QR view */}
      {expanded && !isPending && !isTransferred && (
        <>
          <div className="border-t-2 border-dashed border-ivory-200 mx-4" />
          <div className="px-4 pb-5 pt-4">
            {/* QR centred — big enough to scan easily on mobile */}
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="p-4 rounded-2xl border-2 border-marigold/20 bg-white shadow-sm">
                <QRCode value={ticketId} size={180} />
              </div>
              <p className="font-display font-bold text-ink text-base">{tierName}</p>
              <p className="font-mono text-[10px] text-ink-muted">Seat {seat} of {total}</p>
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-peacock/10 border border-peacock/20">
                <div className="w-1.5 h-1.5 bg-peacock rounded-full animate-pulse" />
                <p className="font-mono text-[10px] text-peacock font-bold uppercase tracking-wide">Valid · Show at entry</p>
              </div>
            </div>

            {/* Details + Wallet — stacked, full-width */}
            <div className="rounded-xl bg-ivory border border-ivory-200 divide-y divide-ivory-200 mb-3">
              {[{ label: "Event", value: eventTitle }, { label: "Ticket type", value: tierName }, { label: "Seat", value: `${seat} of ${total}` }].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0">{row.label}</span>
                  <span className="font-ui text-sm font-semibold text-ink text-right truncate">{row.value}</span>
                </div>
              ))}
            </div>

            <WalletButton orderId={orderId} seat={seat} size="lg" />
          </div>
        </>
      )}
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, userId, userEmail, isIOS, onRefresh }: {
  order: PortalOrderRow;
  userId: string;
  userEmail: string;
  isIOS: boolean;
  onRefresh: () => void;
}) {
  const dateISO = order.eventDate;
  const isUpcoming = dateISO >= new Date().toISOString().slice(0, 10);
  const transfers = order.transfers ?? [];

  // How many seats are in a pending/accepted transfer?
  const transferredSeats = new Set(transfers.flatMap(t =>
    t.seatNumbers.length > 0 ? t.seatNumbers : Array.from({ length: order.qty }, (_, i) => i + 1)
  ));
  const freeCount = order.qty - transferredSeats.size;
  const pendingCount = transfers.filter(t => t.status === "pending").flatMap(t => t.seatNumbers.length > 0 ? t.seatNumbers : Array.from({ length: order.qty }, (_, i) => i + 1)).length;
  const acceptedCount = order.qty - freeCount - pendingCount;

  const hasAnyTransfer = transfers.length > 0;
  const allTransferred = freeCount === 0 && pendingCount === 0;

  const [expanded, setExpanded] = useState(isUpcoming && freeCount > 0);
  const [transferModal, setTransferModal] = useState<{ seats?: number[] } | null>(null);

  const daysUntil = isUpcoming ? Math.ceil((new Date(dateISO + "T00:00:00").getTime() - Date.now()) / 86400000) : null;
  const colorIndex = (order.artistName.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const artistColor = AVATAR_COLORS[colorIndex];

  return (
    <>
      {transferModal !== null && (
        <TransferModal
          order={order}
          userId={userId}
          userEmail={userEmail}
          preselectedSeats={transferModal.seats}
          onClose={() => setTransferModal(null)}
          onTransferred={() => { setTransferModal(null); onRefresh(); }}
        />
      )}

      <div className={`rounded-2xl overflow-hidden border transition-all ${
        allTransferred ? "border-ivory-200 opacity-70" :
        pendingCount > 0 ? "border-marigold/30 shadow-sm" :
        expanded ? "border-marigold/30 shadow-md" : "border-ivory-200 hover:border-marigold/20"
      } bg-white`}>
        {/* Header — tap to expand */}
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-stretch">
            {/* Colour accent bar */}
            <div className="w-1 shrink-0" style={{ backgroundColor: allTransferred ? "#B0B0C0" : artistColor }} />

            <div className="flex-1 px-4 py-4 min-w-0">
              {/* Status pills */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {allTransferred && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-ivory-200 text-ink-muted">All Transferred</span>}
                {!allTransferred && pendingCount > 0 && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-marigold/15 text-marigold-dark">{pendingCount} Pending Transfer</span>}
                {!allTransferred && !pendingCount && isUpcoming && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-peacock/10 text-peacock">Upcoming</span>}
                {!isUpcoming && !allTransferred && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-ivory-200 text-ink-muted">Past</span>}
                {order.groupId && <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-marigold/15 text-marigold-dark">Group</span>}
              </div>

              {/* Title + chevron on same row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-display font-bold text-base leading-snug ${allTransferred ? "text-ink-muted" : "text-ink"}`}>{order.eventTitle}</h3>
                  {order.artistName && <p className="font-ui text-xs text-ink-muted mt-0.5">{order.artistName}</p>}
                </div>
                {/* Countdown or chevron */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {daysUntil !== null && !allTransferred && (
                    <div className="text-right">
                      <p className="font-display font-bold text-aubergine text-xl leading-none">{daysUntil}d</p>
                    </div>
                  )}
                  <svg className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Meta row — wraps cleanly on mobile */}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-mono text-[10px] text-ink-muted">📅 {fmtDateShort(order.eventDate)}</span>
                {(order.city || order.state) && (
                  <span className="font-mono text-[10px] text-ink-muted">📍 {[order.city, order.state].filter(Boolean).join(", ")}</span>
                )}
                <span className="font-mono text-[10px] text-ink-muted">
                  🎟️ {order.qty} × {order.tierName}
                  {hasAnyTransfer && (
                    <span className="text-ink-muted/60">
                      {freeCount > 0 ? ` · ${freeCount} yours` : ""}
                      {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
                      {acceptedCount > 0 ? ` · ${acceptedCount} sent` : ""}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </button>

        {expanded && (
          <>
            <div className="border-t-2 border-dashed border-ivory-200 mx-5" />
            <div className="px-5 py-4 space-y-3">
              {freeCount > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-aubergine/5 border border-aubergine/10">
                  <svg className="w-3.5 h-3.5 text-aubergine mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p className="font-ui text-xs text-ink-muted">Tap a ticket to show its QR at entry. Use the Transfer button to send individual seats.</p>
                </div>
              )}

              {/* Individual ticket cards with per-seat transfer state */}
              <div className="space-y-2">
                {Array.from({ length: order.qty }, (_, i) => i + 1).map(seat => (
                  <TicketCard
                    key={seat}
                    orderId={order.orderId}
                    seat={seat}
                    total={order.qty}
                    eventTitle={order.eventTitle}
                    tierName={order.tierName}
                    transfer={getTransferForSeat(seat, transfers)}
                    onTransfer={isUpcoming ? (s) => setTransferModal({ seats: [s] }) : undefined}
                    onCancelTransfer={onRefresh}
                  />
                ))}
              </div>

              {/* Multi-seat transfer button (only if 2+ free seats remain) */}
              {isUpcoming && freeCount >= 2 && (
                <button
                  onClick={() => setTransferModal({ seats: undefined })}
                  className="w-full py-2.5 rounded-xl border border-aubergine/20 text-aubergine font-ui font-semibold text-xs hover:bg-aubergine/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  Transfer multiple seats…
                </button>
              )}

              {order.groupId && order.groupMembers && order.groupMembers.length > 0 && (
                <GroupMembersPanel members={order.groupMembers} groupId={order.groupId} />
              )}

              {/* Footer — receipt link + total + wallet */}
              <div className="pt-3 border-t border-ivory-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-ink">${order.grandTotal.toFixed(2)} paid</p>
                    <Link href={`/portal/tickets/${order.orderId}`} className="font-mono text-[9px] text-aubergine hover:underline flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      View receipt
                    </Link>
                  </div>
                  <a
                    href={`/api/wallet/pass/${order.orderId}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black text-white font-ui text-sm font-medium hover:bg-zinc-800 active:scale-95 transition-all"
                    style={{ minHeight: 44 }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Apple Wallet
                  </a>
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
  const [receivedTickets, setReceivedTickets] = useState<ReceivedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isIOS, setIsIOS] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);

  async function loadAll(uid: string, email: string) {
    const [ordersData, incoming, received] = await Promise.all([
      loadMyOrders(uid),
      email ? loadIncomingTransfers(email) : Promise.resolve([]),
      loadReceivedTickets(uid),
    ]);

    // Auto-expire pending transfers older than 24 hours (checked from sender's view)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = ordersData.flatMap(o =>
      (o.transfers ?? []).filter(t => t.status === "pending" && new Date(t.createdAt).getTime() < cutoff)
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

  const filtered = orders.filter(o => {
    if (filter === "upcoming") return o.eventDate >= today;
    if (filter === "past")     return o.eventDate < today;
    return true;
  });

  const totalTransferredSeats = orders.reduce((sum, o) => {
    const transfers = o.transfers ?? [];
    const accepted = transfers.filter(t => t.status === "accepted");
    return sum + accepted.reduce((s, t) => s + (t.seatNumbers.length || o.qty), 0);
  }, 0);
  const totalPendingSeats = orders.reduce((sum, o) => {
    const transfers = o.transfers ?? [];
    const pending = transfers.filter(t => t.status === "pending");
    return sum + pending.reduce((s, t) => s + (t.seatNumbers.length || o.qty), 0);
  }, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-ink text-2xl">My Tickets</h1>
          <p className="font-ui text-ink-muted text-sm">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
            {totalTransferredSeats > 0 && <span className="text-ink-muted/60"> · {totalTransferredSeats} transferred</span>}
            {totalPendingSeats > 0 && <span className="text-marigold-dark"> · {totalPendingSeats} pending</span>}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "past", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? "bg-aubergine text-white" : "bg-white border border-ivory-200 text-ink-muted hover:text-ink"}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <>
          {/* Incoming pending transfers */}
          {incomingTransfers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Tickets Sent to You</p>
                <span className="w-5 h-5 rounded-full bg-marigold flex items-center justify-center font-bold text-aubergine text-[10px]">{incomingTransfers.length}</span>
              </div>
              {incomingTransfers.map(t => <IncomingTransferCard key={t.id} transfer={t} onAccepted={handleIncomingAccepted} onDeclined={handleIncomingDeclined} />)}
              <div className="h-px bg-ivory-200" />
            </div>
          )}

          {/* Received tickets (accepted transfers) */}
          {receivedTickets.filter(t => filter === "all" || (filter === "upcoming" ? t.eventDate >= today : t.eventDate < today)).length > 0 && (
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Received Tickets</p>
              {receivedTickets
                .filter(t => filter === "all" || (filter === "upcoming" ? t.eventDate >= today : t.eventDate < today))
                .map(t => <ReceivedTicketCard key={t.transferId} ticket={t} />)}
              <div className="h-px bg-ivory-200" />
            </div>
          )}

          {/* My purchased orders */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-xl font-bold text-ink mb-2">{orders.length === 0 ? "No tickets yet" : `No ${filter} tickets`}</p>
              <p className="font-ui text-ink-muted text-sm mb-6">{orders.length === 0 ? "Your tickets will appear here after purchase." : "Adjust the filter to see other tickets."}</p>
              <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-semibold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(order => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  userId={userId}
                  userEmail={userEmail}
                  isIOS={isIOS}
                  onRefresh={() => loadAll(userId, userEmail)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl p-6 text-center border-2 border-dashed border-ivory-200">
        <p className="font-display font-bold text-ink text-lg mb-1">Find your next night</p>
        <p className="font-ui text-ink-muted text-sm mb-4">100+ events this Navratri season across the US.</p>
        <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark transition-all">Browse events →</Link>
      </div>
    </div>
  );
}
