"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ───────────────────────────────────────────────────────────────────────

type ScanOrder = {
  id: string;
  buyer_name: string;
  qty: number;
  status: string;
  is_test: boolean;
  checked_in_count: number;
  checked_in_at: string | null;
  tier_name: string | null;
  is_combo: boolean;
};

type RecentAdmit = { id: string; name: string; tier: string; n: number; at: string; combo: boolean };

type EventOpt = { id: string; title: string; start_date: string };

type Resolved =
  | { kind: "ok"; order: ScanOrder }
  | { kind: "error"; message: string };

// ── Helpers ──────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }

/** Parse a scanned/typed value into an order id + optional event id.
 *  Forms: RAMEELO:<orderId>, RAMEELO:<orderId>:<eventId> (combo per-event QR),
 *  <id>-T2, raw <id>. The event id, when present, scopes a combo ticket to one event. */
function parseScan(text: string): { orderId: string | null; eventId: string | null } {
  let t = text.trim();
  if (t.toUpperCase().startsWith("RAMEELO:")) t = t.slice(8);
  t = t.replace(/-T\d+$/i, "");
  const [orderPart, eventPart] = t.split(":");
  const orderId = orderPart && UUID_RE.test(orderPart) ? orderPart.toLowerCase() : null;
  const eventId = eventPart && UUID_RE.test(eventPart) ? eventPart.toLowerCase() : null;
  return { orderId, eventId };
}

/** Order UUID only — used by the manual box / name search. */
function parseOrderId(text: string): string | null {
  return parseScan(text).orderId;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const { activeOrg } = useOrg();

  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState("");
  const [orders, setOrders] = useState<ScanOrder[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set()); // ACH orders awaiting clearance
  const [loading, setLoading] = useState(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<Resolved | null>(null);
  const [nameResults, setNameResults] = useState<ScanOrder[] | null>(null);
  const [recentAdmits, setRecentAdmits] = useState<RecentAdmit[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [busy, setBusy] = useState(false);

  // html5-qrcode instance + scan debounce
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  // Audible + haptic scan feedback — vital at a loud, fast-moving door. A short
  // bright tone on a valid ticket, a low buzz on a rejection.
  const audioRef = useRef<AudioContext | null>(null);
  const feedback = useCallback((ok: boolean) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ok ? 40 : [60, 50, 60]);
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = ok ? "sine" : "square";
      osc.frequency.value = ok ? 880 : 220;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.16 : 0.3));
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + (ok ? 0.16 : 0.3));
    } catch { /* audio unsupported — haptics/visual still fire */ }
  }, [soundOn]);

  const ordersById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);

  // Load org events
  useEffect(() => {
    if (!activeOrg) return;
    const supabase = createClient();
    supabase
      .from("events")
      .select("id, title, start_date")
      .eq("org_id", activeOrg.id)
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        const evs = (data ?? []) as EventOpt[];
        setEvents(evs);
        // default to the event happening soonest from today, else most recent
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = [...evs].reverse().find(e => e.start_date >= today);
        setEventId(upcoming?.id ?? evs[0]?.id ?? "");
        setLoading(false);
      });
  }, [activeOrg]);

  // Load orders valid at the selected event. The RPC includes combo orders linked to
  // this event even when their anchor event_id is a different event in the org — so a
  // combo ticket scans at every event it covers. Returns confirmed + pending.
  const loadOrders = useCallback(async (evId: string) => {
    if (!evId) { setOrders([]); setPendingIds(new Set()); return; }
    const supabase = createClient();
    const { data } = await supabase.rpc("get_event_scan_orders", { p_event_id: evId });
    const rows = (data ?? []) as ScanOrder[];
    setOrders(rows.filter(o => o.status === "confirmed"));
    // Pending (ACH not yet cleared) orders — recognized so we can reject them with a
    // clear reason instead of a generic "not a valid ticket".
    setPendingIds(new Set(rows.filter(o => o.status === "pending").map(o => o.id)));
  }, []);

  useEffect(() => { loadOrders(eventId); setResult(null); setNameResults(null); setRecentAdmits([]); }, [eventId, loadOrders]);

  // Resolve a scanned/typed code against the loaded orders for this event
  const resolve = useCallback((text: string): Resolved => {
    const { orderId: oid, eventId: scannedEventId } = parseScan(text);
    let order = oid ? ordersById.get(oid) : undefined;
    if (!order) {
      const code = text.trim().toUpperCase();
      if (code.startsWith("RM-")) order = orders.find(o => receiptNum(o.id) === code);
    }
    // Combo QRs encode their event. A combo code scanned at a DIFFERENT event in
    // the bundle is rejected — the guest must show the QR for THIS event.
    if (order?.is_combo && scannedEventId && scannedEventId !== eventId) {
      return { kind: "error", message: "This combo QR is for another event. Ask the guest for the QR that matches this event." };
    }
    if (oid && !order && pendingIds.has(oid)) {
      // Real ticket, but the bank/ACH payment hasn't cleared yet — not valid.
      return { kind: "error", message: "Payment pending — this ticket isn't valid until the bank transfer clears." };
    }
    if (oid && !order) {
      // Valid order code but not in this event's confirmed orders
      return { kind: "error", message: "Not a valid ticket for this event." };
    }
    if (!order) return { kind: "error", message: "Unrecognized code. Try the QR or the RM- number." };
    return { kind: "ok", order };
  }, [ordersById, orders, pendingIds, eventId]);

  function handleCode(text: string) {
    const now = Date.now();
    if (text === lastScanRef.current.text && now - lastScanRef.current.at < 2500) return;
    lastScanRef.current = { text, at: now };
    const r = resolve(text);
    setResult(r);
    setNameResults(null);
    feedback(r.kind === "ok");
  }

  // Manual box: resolve a code (QR / RM-) OR fall back to a name search across this
  // event's confirmed orders — handy when a guest's phone is dead at the door.
  function lookup(text: string) {
    const t = text.trim();
    if (!t) return;
    if (parseOrderId(t) || t.toUpperCase().startsWith("RM-")) { handleCode(t); return; }
    const q = t.toLowerCase();
    setResult(null);
    setNameResults(orders.filter(o => o.buyer_name.toLowerCase().includes(q)).slice(0, 8));
  }

  // Camera lifecycle
  const stopCamera = useCallback(async () => {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* ignore */ }
    scannerRef.current = null;
    setCameraOn(false);
  }, []);

  async function startCamera() {
    setCameraError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const inst = new Html5Qrcode("scanner-view", { verbose: false });
      scannerRef.current = inst as unknown as { stop: () => Promise<void>; clear: () => void };
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleCode(decoded),
        () => { /* per-frame decode failure — ignore */ },
      );
      setCameraOn(true);
    } catch (e) {
      setCameraError(e instanceof Error ? e.message : "Couldn't start the camera. Use manual entry below.");
      setCameraOn(false);
    }
  }

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  // Check in N attendees on the resolved order
  async function admit(order: ScanOrder, n: number) {
    setBusy(true);
    const next = Math.min(order.qty, order.checked_in_count + n);
    const added = next - order.checked_in_count;
    const supabase = createClient();
    // scan_admit writes per-event check-in for combos (so admitting at one event
    // never marks the others), and order-level for everything else.
    const { data, error } = await supabase.rpc("scan_admit", { p_order_id: order.id, p_event_id: eventId, p_count: next });
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as { checked_in_count: number; checked_in_at: string } | null;
      const at = row?.checked_in_at ?? new Date().toISOString();
      const newCount = row?.checked_in_count ?? next;
      const updated = { ...order, checked_in_count: newCount, checked_in_at: at };
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      setResult({ kind: "ok", order: updated });
      if (added > 0) {
        setRecentAdmits(prev => [{ id: order.id + at, name: order.buyer_name, tier: order.tier_name ?? "Ticket", n: added, at, combo: order.is_combo }, ...prev].slice(0, 6));
        feedback(true);
      }
    } else {
      feedback(false);
    }
    setBusy(false);
  }

  const liveOrders = orders.filter(o => !o.is_test);
  const totalTickets = liveOrders.reduce((s, o) => s + o.qty, 0);
  const checkedIn    = liveOrders.reduce((s, o) => s + o.checked_in_count, 0);
  const selectedEvent = events.find(e => e.id === eventId);

  if (!activeOrg) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-4xl mb-3">🏷️</p>
        <p className="font-display font-bold text-ink text-lg mb-1">No organization selected</p>
        <p className="font-ui text-ink-muted text-sm">Pick an organization to scan its event tickets.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Door Scanner</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">Scan attendee QR codes to check them in.</p>
        </div>
        <button
          onClick={() => setSoundOn(s => !s)}
          title={soundOn ? "Scan sound on" : "Scan sound off"}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border font-ui font-semibold text-xs transition-colors ${soundOn ? "border-peacock/30 bg-peacock/8 text-peacock" : "border-ivory-200 bg-white text-ink-muted"}`}
        >
          <span>{soundOn ? "🔊" : "🔇"}</span>
          {soundOn ? "Sound on" : "Sound off"}
        </button>
      </div>

      {/* Event picker + stats */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-4 space-y-3">
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Event</label>
          {loading ? (
            <div className="h-10 rounded-xl bg-ivory animate-pulse" />
          ) : events.length === 0 ? (
            <p className="font-ui text-sm text-ink-muted">This organization has no events yet.</p>
          ) : (
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="w-full rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} · {new Date(ev.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedEvent && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Checked in", value: checkedIn },
              { label: "Total tickets", value: totalTickets },
              { label: "Remaining", value: Math.max(0, totalTickets - checkedIn) },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-ivory/60 px-3 py-2.5 text-center">
                <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>{s.value}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camera */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="relative bg-aubergine" style={{ aspectRatio: "1 / 1" }}>
          <div id="scanner-view" className="absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-marigold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2m10-16h2a1 1 0 011 1v2m-3 13h2a1 1 0 001-1v-2M7 12h10" />
                </svg>
              </div>
              <button
                onClick={startCamera}
                disabled={!eventId}
                className="px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-display font-bold text-sm hover:bg-marigold-dark active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Start camera
              </button>
              {cameraError && <p className="font-ui text-xs text-white/70 max-w-[80%]">{cameraError}</p>}
            </div>
          )}
          {cameraOn && (
            <button onClick={stopCamera}
              className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-black/50 text-white font-ui text-xs font-semibold backdrop-blur-sm">
              Stop
            </button>
          )}
        </div>

        {/* Manual entry — code OR name */}
        <div className="p-4 border-t border-ivory-200">
          <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Enter a code, or search by name</label>
          <form
            onSubmit={e => { e.preventDefault(); if (manual.trim()) { lookup(manual.trim()); setManual(""); } }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              placeholder="RM-XXXXXXXXXX, order ID, or attendee name"
              className="flex-1 rounded-xl border border-ivory-200 px-3 py-2.5 font-mono text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20"
            />
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine-light transition-colors">
              Look up
            </button>
          </form>
        </div>
      </div>

      {/* Name search results */}
      {nameResults && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">{nameResults.length} match{nameResults.length !== 1 ? "es" : ""}</p>
            <button onClick={() => setNameResults(null)} className="font-ui text-xs text-ink-muted hover:text-ink">Clear</button>
          </div>
          {nameResults.length === 0 ? (
            <p className="px-4 py-6 text-center font-ui text-sm text-ink-muted">No attendee found by that name.</p>
          ) : (
            <div className="divide-y divide-ivory-200">
              {nameResults.map(o => {
                const inFull = o.checked_in_count >= o.qty;
                return (
                  <button key={o.id} onClick={() => { setResult({ kind: "ok", order: o }); setNameResults(null); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ivory/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-ui text-sm font-semibold text-ink truncate">{o.buyer_name}</p>
                      <p className="font-mono text-[10px] text-ink-muted truncate">{o.tier_name ?? "Ticket"} · {o.qty} · {receiptNum(o.id)}</p>
                    </div>
                    <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${inFull ? "bg-peacock/15 text-peacock" : "bg-marigold/20 text-[#a06b00]"}`}>
                      {inFull ? "✓ In" : `${o.checked_in_count}/${o.qty}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        result.kind === "error" ? (
          <div className="rounded-2xl border-2 border-durga/30 bg-durga/5 p-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-durga/10 flex items-center justify-center text-xl shrink-0">⛔</div>
            <div>
              <p className="font-display font-bold text-durga text-base">Can&apos;t check in</p>
              <p className="font-ui text-sm text-ink-muted">{result.message}</p>
            </div>
          </div>
        ) : (() => {
          const o = result.order;
          const remaining = o.qty - o.checked_in_count;
          const fullyIn = remaining <= 0;
          return (
            <div className={`rounded-2xl border-2 p-5 ${fullyIn ? "border-peacock/40 bg-peacock/5" : "border-aubergine/25 bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${fullyIn ? "bg-peacock/15 text-peacock" : "bg-marigold/20 text-[#a06b00]"}`}>
                      {fullyIn ? "✓ All checked in" : `${o.checked_in_count} of ${o.qty} in`}
                    </span>
                    {o.is_combo && <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-aubergine/12 text-aubergine">✨ Combo</span>}
                    {o.is_test && <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/20 text-marigold-dark">Test</span>}
                  </div>
                  <p className="font-display font-bold text-ink text-lg leading-tight">{o.buyer_name}</p>
                  <p className="font-ui text-sm text-ink-muted">{o.tier_name ?? "Ticket"} · {o.qty} ticket{o.qty !== 1 ? "s" : ""} · {receiptNum(o.id)}</p>
                  {o.is_combo && <p className="font-mono text-[10px] text-aubergine mt-0.5">Combo ticket — valid for this event</p>}
                  {o.checked_in_at && o.checked_in_count > 0 && (
                    <p className="font-mono text-[10px] text-ink-muted/70 mt-1">Last admitted {fmtTime(o.checked_in_at)}</p>
                  )}
                </div>
              </div>

              {!fullyIn && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => admit(o, 1)} disabled={busy}
                    className="px-4 py-2.5 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:bg-peacock/90 active:scale-[0.98] transition-all disabled:opacity-50">
                    Admit 1
                  </button>
                  {remaining > 1 && (
                    <button onClick={() => admit(o, remaining)} disabled={busy}
                      className="px-4 py-2.5 rounded-xl border-2 border-peacock/30 text-peacock font-display font-bold text-sm hover:bg-peacock/5 active:scale-[0.98] transition-all disabled:opacity-50">
                      Admit all {remaining}
                    </button>
                  )}
                  <button onClick={() => setResult(null)} disabled={busy}
                    className="ml-auto px-4 py-2.5 rounded-xl font-ui font-semibold text-sm text-ink-muted hover:text-ink transition-colors">
                    Dismiss
                  </button>
                </div>
              )}
              {fullyIn && (
                <button onClick={() => setResult(null)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-peacock/10 text-peacock font-display font-bold text-sm hover:bg-peacock/15 transition-colors">
                  Next attendee
                </button>
              )}
            </div>
          );
        })()
      )}

      {/* Recent admits — quick situational awareness at the door */}
      {recentAdmits.length > 0 && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <p className="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-widest text-ink-muted">Just checked in</p>
          <div className="divide-y divide-ivory-200">
            {recentAdmits.map(r => (
              <div key={r.id} className="px-4 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-peacock shrink-0" />
                  <p className="font-ui text-sm text-ink truncate">{r.name}</p>
                  {r.combo && <span className="font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-aubergine/10 text-aubergine shrink-0">Combo</span>}
                </div>
                <span className="font-mono text-[10px] text-ink-muted shrink-0">+{r.n} · {fmtTime(r.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="font-mono text-[10px] text-ink-muted/70 text-center">
        Attendee QR codes live in their Rameelo tickets &amp; Apple Wallet pass.
      </p>
    </div>
  );
}
