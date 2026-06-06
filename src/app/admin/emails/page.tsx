"use client";

import { useMemo, useState } from "react";
import { EMAIL_REGISTRY, type EmailDef, type EmailTrigger, type EmailStatus } from "@/lib/email/registry";

const TRIGGER_META: Record<EmailTrigger, { label: string; cls: string; icon: React.ReactNode }> = {
  automatic: {
    label: "Automatic",
    cls: "bg-peacock/12 text-peacock",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
  manual: {
    label: "Manual",
    cls: "bg-marigold/15 text-marigold-dark",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
  },
  both: {
    label: "Auto + Manual",
    cls: "bg-aubergine/10 text-aubergine",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
  },
};

const STATUS_META: Record<EmailStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-peacock/12 text-peacock" },
  planned: { label: "Coming soon", cls: "bg-ink/[0.05] text-ink-muted" },
};

const CATEGORY_ORDER = ["Member", "Orders & Tickets", "Organizer", "Payments"] as const;

type Filter = "all" | "live" | "planned" | "automatic" | "manual";

function Pill({ cls, icon, children }: { cls: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${cls}`}>
      {icon && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>}
      {children}
    </span>
  );
}

function SummaryCard({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-4">
      <p className={`font-display font-bold text-2xl ${accent ?? "text-ink"}`} style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">{label}</p>
    </div>
  );
}

function EmailCard({ e }: { e: EmailDef }) {
  const t = TRIGGER_META[e.trigger];
  const s = STATUS_META[e.status];
  return (
    <div className={`bg-white rounded-2xl border p-5 ${e.status === "planned" ? "border-ivory-200 opacity-90" : "border-ivory-200"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-display font-bold text-ink text-base leading-tight" style={{ letterSpacing: "-0.015em" }}>{e.name}</p>
        <Pill cls={s.cls}>{s.label}</Pill>
      </div>
      <p className="font-ui text-sm text-ink-muted leading-relaxed mb-3">{e.description}</p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill cls={t.cls} icon={t.icon}>{t.label}</Pill>
        <Pill cls="bg-ivory-200 text-ink-muted">{e.audience}</Pill>
      </div>
      <div className="flex items-start gap-2 pt-3 border-t border-ivory-200">
        <svg className="w-3.5 h-3.5 text-ink-muted/50 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 2" /></svg>
        <p className="font-ui text-xs text-ink-muted leading-relaxed">{e.fires}</p>
      </div>
    </div>
  );
}

export default function AdminEmailsPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => ({
    total: EMAIL_REGISTRY.length,
    live: EMAIL_REGISTRY.filter(e => e.status === "live").length,
    planned: EMAIL_REGISTRY.filter(e => e.status === "planned").length,
    automatic: EMAIL_REGISTRY.filter(e => e.trigger === "automatic" || e.trigger === "both").length,
    manual: EMAIL_REGISTRY.filter(e => e.trigger === "manual" || e.trigger === "both").length,
  }), []);

  const filtered = useMemo(() => EMAIL_REGISTRY.filter(e => {
    if (filter === "all") return true;
    if (filter === "live") return e.status === "live";
    if (filter === "planned") return e.status === "planned";
    if (filter === "automatic") return e.trigger === "automatic" || e.trigger === "both";
    if (filter === "manual") return e.trigger === "manual" || e.trigger === "both";
    return true;
  }), [filter]);

  const grouped = useMemo(() => CATEGORY_ORDER
    .map(cat => ({ cat, items: filtered.filter(e => e.category === cat) }))
    .filter(g => g.items.length > 0), [filtered]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "planned", label: "Coming soon" },
    { key: "automatic", label: "Automatic" },
    { key: "manual", label: "Manual" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>Platform Emails</h1>
        <p className="font-ui text-ink-muted text-sm mt-1">Every email Rameelo sends — what it is, who it's for, and how it fires (automatic vs manual).</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard value={counts.total} label="Total emails" />
        <SummaryCard value={counts.live} label="Live" accent="text-peacock" />
        <SummaryCard value={counts.planned} label="Coming soon" accent="text-ink-muted" />
        <SummaryCard value={counts.automatic} label="Automatic" accent="text-peacock" />
        <SummaryCard value={counts.manual} label="Manual" accent="text-marigold-dark" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 bg-ivory-200/50 rounded-2xl p-1 w-fit">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-xl font-ui text-sm font-semibold transition-all ${filter === f.key ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {grouped.map(({ cat, items }) => (
        <div key={cat}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">{cat}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map(e => <EmailCard key={e.key} e={e} />)}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-ivory-200">
          <p className="font-ui text-sm text-ink-muted">No emails match this filter.</p>
        </div>
      )}
    </div>
  );
}
