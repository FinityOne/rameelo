"use client";

import { useEffect, useMemo, useState } from "react";
import { runPaymentTests, type PaymentTest } from "@/lib/payments-tests";

type StatusResp = {
  environment: "production" | "preview" | "development";
  nodeEnv: string;
  vercelEnv: string | null;
  region: string | null;
  stripeMode: "test" | "live" | "unconfigured";
  overall: "operational" | "degraded" | "down";
  checks: { key: string; label: string; status: "operational" | "degraded" | "down" | "not_configured"; detail: string }[];
  checkedAt: string;
};

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  operational:    { dot: "bg-peacock",   text: "text-peacock",     label: "Operational" },
  degraded:       { dot: "bg-marigold",  text: "text-marigold-dark", label: "Attention" },
  down:           { dot: "bg-durga",     text: "text-durga",       label: "Down" },
  not_configured: { dot: "bg-ink-muted/40", text: "text-ink-muted", label: "Not set up" },
};

function StatusTab() {
  const [data, setData] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/status", { method: "POST" });
      if (!res.ok) { setError("Couldn't load status."); setLoading(false); return; }
      setData(await res.json());
    } catch { setError("Couldn't load status."); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-aubergine animate-spin" /></div>;
  if (error || !data) return <p className="font-ui text-sm text-durga py-8">{error || "No data."}</p>;

  const isProd = data.environment === "production";
  const overall = STATUS_STYLE[data.overall];

  return (
    <div className="space-y-5">
      {/* Environment banner */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${isProd ? "border-durga/25 bg-durga/5" : "border-marigold/30 bg-marigold/8"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProd ? "bg-durga/15 text-durga" : "bg-marigold/20 text-marigold-dark"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Environment</p>
            <p className={`font-display font-bold text-lg ${isProd ? "text-durga" : "text-marigold-dark"}`}>
              {isProd ? "PRODUCTION" : data.environment === "preview" ? "PREVIEW" : "DEVELOPMENT"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-ink-muted">Stripe: <span className={data.stripeMode === "live" ? "text-durga font-bold" : "text-ink font-bold"}>{data.stripeMode.toUpperCase()}</span></p>
          <p className="font-mono text-[10px] text-ink-muted">NODE_ENV: {data.nodeEnv}{data.region ? ` · ${data.region}` : ""}</p>
        </div>
      </div>

      {/* Overall */}
      <div className="rounded-2xl border border-ivory-200 bg-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${overall.dot} ${data.overall === "operational" ? "animate-pulse" : ""}`} />
          <p className="font-display font-bold text-ink text-base">
            {data.overall === "operational" ? "All systems operational" : data.overall === "degraded" ? "Some services need attention" : "Service disruption"}
          </p>
        </div>
        <button onClick={load} className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink border border-ivory-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      {/* Service checks */}
      <div className="rounded-2xl border border-ivory-200 bg-white divide-y divide-ivory-200 overflow-hidden">
        {data.checks.map(c => {
          const s = STATUS_STYLE[c.status];
          return (
            <div key={c.key} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display font-semibold text-ink text-sm">{c.label}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">{c.detail}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${s.text}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10px] text-ink-muted text-center">Checked {new Date(data.checkedAt).toLocaleTimeString("en-US")}</p>
    </div>
  );
}

function TestsTab() {
  const tests = useMemo(() => runPaymentTests(), []);
  const [open, setOpen] = useState<string | null>(null);
  const passed = tests.filter(t => t.pass).length;
  const allPass = passed === tests.length;

  // Group by category for readability.
  const categories = Array.from(new Set(tests.map(t => t.category)));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between ${allPass ? "border-peacock/30 bg-peacock/5" : "border-durga/30 bg-durga/5"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${allPass ? "bg-peacock text-white" : "bg-durga text-white"}`}>
            {allPass
              ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" /></svg>}
          </div>
          <div>
            <p className="font-display font-bold text-ink text-lg">{passed}/{tests.length} payment tests passing</p>
            <p className="font-ui text-xs text-ink-muted">Pure calculations — no database writes. Verifies pricing, discounts, the 3% platform fee, the 5% card fee, and ACH.</p>
          </div>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${allPass ? "text-peacock" : "text-durga"}`}>{allPass ? "All green" : `${tests.length - passed} failing`}</span>
      </div>

      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">{cat}</p>
          <div className="rounded-2xl border border-ivory-200 bg-white divide-y divide-ivory-200 overflow-hidden">
            {tests.filter(t => t.category === cat).map(t => {
              const isOpen = open === t.id;
              return (
                <div key={t.id}>
                  <button onClick={() => setOpen(isOpen ? null : t.id)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-ivory/40 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.pass ? "bg-peacock" : "bg-durga"}`} />
                    <span className="font-ui font-semibold text-ink text-sm flex-1 min-w-0 truncate">{t.name}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-widest font-bold shrink-0 ${t.pass ? "text-peacock" : "text-durga"}`}>{t.pass ? "Pass" : "Fail"}</span>
                    <svg className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 space-y-3 bg-ivory/30">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1">Criteria</p>
                        <p className="font-ui text-xs text-ink leading-relaxed">{t.criteria}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1">Scenario</p>
                        <p className="font-ui text-xs text-ink-muted">{t.scenario}</p>
                      </div>
                      <div className="rounded-xl border border-ivory-200 bg-white overflow-hidden">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-ivory border-b border-ivory-200 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                          <span>Assertion</span><span className="text-right">Expected</span><span className="text-right">Actual</span><span className="text-right">✓</span>
                        </div>
                        {t.assertions.map((a, i) => (
                          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 border-b border-ivory-200 last:border-0 items-center">
                            <span className="font-ui text-[11px] text-ink leading-tight">{a.label}</span>
                            <span className="font-mono text-[11px] text-ink-muted text-right">{a.expected}</span>
                            <span className={`font-mono text-[11px] text-right ${a.pass ? "text-ink" : "text-durga font-bold"}`}>{a.actual}</span>
                            <span className={`text-right text-xs ${a.pass ? "text-peacock" : "text-durga"}`}>{a.pass ? "✓" : "✕"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatusPage() {
  const [tab, setTab] = useState<"status" | "tests">("status");
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-1 p-1 rounded-2xl bg-ivory-200/60 mb-6 w-fit">
        {([["status", "Platform Status"], ["tests", "Payments Tests"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl font-ui font-semibold text-sm transition-all ${tab === id ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "status" ? <StatusTab /> : <TestsTab />}
    </div>
  );
}
