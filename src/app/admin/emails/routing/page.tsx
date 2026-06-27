"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_REGISTRY } from "@/lib/email/registry";
import { ROUTABLE_ADMIN_EMAILS } from "@/lib/email/recipients";

type Admin = { id: string; first_name: string | null; last_name: string | null; email: string };
type RoutingRow = { mode: "all" | "selected"; recipient_ids: string[] };

const REGISTRY_BY_KEY = new Map(EMAIL_REGISTRY.map((e) => [e.key, e]));

function fullName(a: Admin): string {
  return [a.first_name, a.last_name].filter(Boolean).join(" ").trim() || a.email;
}

export default function AdminEmailRoutingPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [routing, setRouting] = useState<Record<string, RoutingRow>>({});
  const [loading, setLoading] = useState(true);

  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: adminRows }, { data: routeRows }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, email").eq("role", "admin").order("first_name"),
        supabase.from("admin_email_routing").select("email_key, mode, recipient_ids"),
      ]);
      if (cancelled) return;
      setAdmins(((adminRows ?? []) as Admin[]).filter((a) => a.email));
      const map: Record<string, RoutingRow> = {};
      for (const k of ROUTABLE_ADMIN_EMAILS) map[k] = { mode: "all", recipient_ids: [] };
      for (const r of (routeRows ?? []) as { email_key: string; mode: "all" | "selected"; recipient_ids: string[] | null }[]) {
        if (map[r.email_key]) map[r.email_key] = { mode: r.mode, recipient_ids: r.recipient_ids ?? [] };
      }
      setRouting(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setPwError("");
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", password: pwInput }),
      });
      if (res.ok) { setUnlocked(true); setPassword(pwInput); setPwInput(""); }
      else { const j = await res.json().catch(() => ({})); setPwError(j.error ?? "Incorrect password."); }
    } catch {
      setPwError("Something went wrong. Try again.");
    }
    setVerifying(false);
  }

  function setLocal(key: string, next: RoutingRow) {
    setRouting((prev) => ({ ...prev, [key]: next }));
    setSavedKey(null);
  }

  async function save(key: string) {
    const row = routing[key];
    setSavingKey(key);
    setSavedKey(null);
    try {
      const res = await fetch("/api/admin/email-routing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, emailKey: key, mode: row.mode, recipientIds: row.recipient_ids }),
      });
      if (res.ok) { setSavedKey(key); setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2500); }
      else {
        const j = await res.json().catch(() => ({}));
        if (j.code === "bad_password") { setUnlocked(false); setPassword(""); }
        setPwError(j.error ?? "Could not save.");
      }
    } catch { setPwError("Could not save. Try again."); }
    setSavingKey(null);
  }

  const liveAdminCount = admins.length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/emails" className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-aubergine transition-colors">← Platform Emails</Link>
          <h1 className="font-display font-bold text-ink text-2xl mt-1" style={{ letterSpacing: "-0.02em" }}>Admin Email Recipients</h1>
          <p className="font-ui text-ink-muted text-sm mt-1">
            Choose who receives each admin alert — all admins, or a chosen few. Changing recipients requires the control password.
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full ${unlocked ? "bg-peacock/12 text-peacock" : "bg-ink/[0.05] text-ink-muted"}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {unlocked
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-9 4h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5a2 2 0 012-2z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.105.895-2 2-2s2 .895 2 2m1 0H7a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2zm-5-4V7a4 4 0 00-4 4" />}
          </svg>
          {unlocked ? "Editing unlocked" : "Locked"}
        </span>
      </div>

      {/* Password gate */}
      {!unlocked && (
        <form onSubmit={unlock} className="bg-white rounded-2xl border border-ivory-200 p-5">
          <p className="font-display font-bold text-ink text-sm">Enter control password to edit</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5 mb-3">You can view current routing below, but changing recipients is password-protected.</p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} placeholder="Control password" autoComplete="off"
              className="flex-1 min-w-[200px] rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
            />
            <button type="submit" disabled={verifying || !pwInput}
              className="rounded-xl bg-aubergine px-5 py-2.5 font-display font-bold text-sm text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
              {verifying ? "Checking…" : "Unlock"}
            </button>
          </div>
          {pwError && <p className="font-ui text-xs text-durga mt-2">{pwError}</p>}
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {ROUTABLE_ADMIN_EMAILS.map((key) => {
            const def = REGISTRY_BY_KEY.get(key);
            const row = routing[key] ?? { mode: "all", recipient_ids: [] };
            const selectedCount = row.recipient_ids.filter((id) => admins.some((a) => a.id === id)).length;
            return (
              <div key={key} className="bg-white rounded-2xl border border-ivory-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink text-base leading-tight" style={{ letterSpacing: "-0.015em" }}>{def?.name ?? key}</p>
                    {def?.description && <p className="font-ui text-xs text-ink-muted leading-relaxed mt-1">{def.description}</p>}
                  </div>
                  <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${row.mode === "all" ? "bg-peacock/12 text-peacock" : "bg-marigold/15 text-marigold-dark"}`}>
                    {row.mode === "all" ? `All admins (${liveAdminCount})` : `${selectedCount} selected`}
                  </span>
                </div>

                {/* Mode toggle */}
                <div className="flex items-center gap-1 bg-ivory-200/50 rounded-xl p-1 w-fit mb-3">
                  {(["all", "selected"] as const).map((m) => (
                    <button key={m} disabled={!unlocked}
                      onClick={() => setLocal(key, { ...row, mode: m })}
                      className={`px-3.5 py-1.5 rounded-lg font-ui text-xs font-semibold transition-all disabled:cursor-not-allowed ${row.mode === m ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink disabled:hover:text-ink-muted"}`}>
                      {m === "all" ? "All admins" : "Selected admins"}
                    </button>
                  ))}
                </div>

                {/* Recipient checklist (selected mode) */}
                {row.mode === "selected" && (
                  <div className="rounded-xl border border-ivory-200 divide-y divide-ivory-200 mb-3 overflow-hidden">
                    {admins.length === 0 ? (
                      <p className="font-ui text-xs text-ink-muted px-3 py-3">No admins found.</p>
                    ) : admins.map((a) => {
                      const checked = row.recipient_ids.includes(a.id);
                      return (
                        <label key={a.id} className={`flex items-center gap-3 px-3 py-2.5 ${unlocked ? "cursor-pointer hover:bg-ivory/50" : "opacity-70"}`}>
                          <input
                            type="checkbox" checked={checked} disabled={!unlocked}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...row.recipient_ids, a.id]
                                : row.recipient_ids.filter((id) => id !== a.id);
                              setLocal(key, { ...row, recipient_ids: ids });
                            }}
                            className="w-4 h-4 rounded accent-aubergine"
                          />
                          <div className="min-w-0">
                            <p className="font-ui text-sm text-ink leading-tight truncate">{fullName(a)}</p>
                            <p className="font-mono text-[10px] text-ink-muted truncate">{a.email}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {row.mode === "selected" && selectedCount === 0 && (
                  <p className="font-ui text-xs text-durga mb-3">⚠ No recipients selected — no one will receive this email.</p>
                )}

                {/* Save */}
                {unlocked && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => save(key)} disabled={savingKey === key}
                      className="rounded-xl bg-marigold px-4 py-2 font-display font-bold text-sm text-aubergine hover:bg-marigold-dark active:scale-[0.98] transition-all disabled:opacity-50">
                      {savingKey === key ? "Saving…" : "Save"}
                    </button>
                    {savedKey === key && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-peacock flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Saved
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
