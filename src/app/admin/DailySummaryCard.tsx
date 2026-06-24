"use client";

import { useState } from "react";

// Yesterday (Pacific) as YYYY-MM-DD — the default + max for the date picker.
function priorPacificDay(): string {
  const p = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  p.setDate(p.getDate() - 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
}
function todayPacific(): string {
  const p = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
}

type Result = { sent: number; total: number; summary?: { ticket_revenue: number; online_orders: number; online_tickets: number; new_users: number } } | null;

export default function DailySummaryCard() {
  const [day, setDay] = useState(priorPacificDay());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  async function send() {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Could not send the summary."); return; }
      setResult({ sent: data.sent, total: data.total, summary: data.summary });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const money = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(14,140,122,0.12)" }}>
          <svg className="w-4.5 h-4.5 text-peacock" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-ink/80 text-sm" style={{ letterSpacing: "-0.01em" }}>Daily summary email</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">
            Auto-sent to all admins each midnight Pacific for the prior day. Send any day manually below.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="date"
          value={day}
          max={todayPacific()}
          onChange={(e) => setDay(e.target.value)}
          className="rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine transition-all"
        />
        <button
          onClick={send}
          disabled={sending || !day}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-60"
        >
          {sending ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</> : "Send to admins"}
        </button>
      </div>

      {result && (
        <div className="mt-3.5 rounded-xl bg-peacock/8 border border-peacock/20 px-4 py-3">
          <p className="font-ui text-sm text-ink">
            ✓ Sent to <strong>{result.sent}</strong> of {result.total} admin{result.total === 1 ? "" : "s"}.
          </p>
          {result.summary && (
            <p className="font-mono text-[11px] text-ink-muted mt-1">
              {money(result.summary.ticket_revenue)} · {result.summary.online_orders} orders · {result.summary.online_tickets} tickets · {result.summary.new_users} new users
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-3 font-ui text-xs text-durga">{error}</p>}
    </div>
  );
}
