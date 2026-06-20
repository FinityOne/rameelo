"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ISSUE_TYPES, STATUSES, STATUS_META, issueTypeLabel, srRef, type SupportStatus } from "@/lib/support";

type Row = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  issue_type: string;
  status: SupportStatus;
  attachment_url: string | null;
  description: string;
};

function fmtTS(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTIVE_STATUSES: SupportStatus[] = ["open", "in_progress", "waiting"];

export default function AdminSupportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all" | "active">("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("support_requests")
        .select("id, created_at, name, email, issue_type, status, attachment_url, description")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, active: 0 };
    STATUSES.forEach(s => { c[s.value] = 0; });
    rows.forEach(r => {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (ACTIVE_STATUSES.includes(r.status)) c.active++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter === "active" && !ACTIVE_STATUSES.includes(r.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "active" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.issue_type !== typeFilter) return false;
      if (needle) {
        const hay = `${r.name ?? ""} ${r.email} ${r.description} ${srRef(r.id)} ${issueTypeLabel(r.issue_type)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, typeFilter, q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "active", label: "Needs attention", value: counts.active, color: "text-aubergine" },
          { key: "open", label: "Open", value: counts.open, color: "text-[#a06b00]" },
          { key: "waiting", label: "Waiting on customer", value: counts.waiting, color: "text-[#3B4A6B]" },
          { key: "resolved", label: "Resolved", value: counts.resolved, color: "text-peacock" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key as SupportStatus | "active")}
            className={`text-left bg-white rounded-2xl border p-4 transition-all ${statusFilter === s.key ? "border-aubergine/40 ring-2 ring-aubergine/10" : "border-ivory-200 hover:border-aubergine/20"}`}
          >
            <p className={`font-display font-black text-3xl ${s.color}`} style={{ letterSpacing: "-0.035em" }}>{s.value}</p>
            <p className="font-ui font-semibold text-ink text-xs mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search requests, email, reference…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-aubergine/40 focus:ring-2 focus:ring-aubergine/10 transition-all"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SupportStatus | "all" | "active")}
          className="px-3 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink focus:outline-none focus:border-aubergine/40 transition-all">
          <option value="active">Needs attention</option>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-ivory-200 bg-white font-ui text-sm text-ink focus:outline-none focus:border-aubergine/40 transition-all">
          <option value="all">All issue types</option>
          {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ivory-200 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-peacock/10 text-peacock flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="font-display font-bold text-ink">All clear</p>
          <p className="font-ui text-sm text-ink-muted mt-1">No requests match these filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-ivory border-b border-ivory-200">
                  {["Reference", "Issue", "Requester", "Status", "Received"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {filtered.map(r => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-ivory/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <Link href={`/admin/support/${r.id}`} className="font-mono text-xs font-bold text-aubergine hover:underline flex items-center gap-1.5">
                          {srRef(r.id)}
                          {r.attachment_url && <svg className="w-3 h-3 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/support/${r.id}`} className="font-ui text-sm text-ink">{issueTypeLabel(r.issue_type)}</Link>
                        <p className="font-ui text-[11px] text-ink-muted truncate max-w-[280px]">{r.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-ui text-sm text-ink truncate max-w-[180px]">{r.name || "—"}</p>
                        <p className="font-mono text-[10px] text-ink-muted truncate max-w-[180px]">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="font-ui text-xs text-ink-muted" title={fmtTS(r.created_at)}>{timeAgo(r.created_at)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(r => {
              const meta = STATUS_META[r.status];
              return (
                <Link key={r.id} href={`/admin/support/${r.id}`} className="block bg-white rounded-2xl border border-ivory-200 p-4 hover:border-aubergine/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-aubergine flex items-center gap-1.5">
                      {srRef(r.id)}
                      {r.attachment_url && <svg className="w-3 h-3 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                    </span>
                  </div>
                  <p className="font-ui text-sm font-semibold text-ink">{issueTypeLabel(r.issue_type)}</p>
                  <p className="font-ui text-xs text-ink-muted line-clamp-2 mt-0.5">{r.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-mono text-[10px] text-ink-muted truncate max-w-[200px]">{r.name ? `${r.name} · ` : ""}{r.email}</p>
                    <span className="font-mono text-[10px] text-ink-muted/70">{timeAgo(r.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
