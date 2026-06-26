"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/auth";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string;
  state: string;
  role: UserRole;
  source: string | null;
  created_at: string;
};

const ROLE_STYLES: Record<UserRole, string> = {
  user: "bg-ivory-200 text-ink-muted",
  organizer: "bg-peacock/15 text-peacock",
  admin: "bg-durga/15 text-durga",
};

// How the account was created — shown so admins can tell self-signups from imports.
const SOURCE_META: Record<string, { label: string; cls: string }> = {
  signup: { label: "Signed up", cls: "bg-peacock/10 text-peacock" },
  import: { label: "Imported", cls: "bg-aubergine/10 text-aubergine" },
  manual: { label: "Added", cls: "bg-marigold/15 text-marigold-dark" },
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");   // debounced, server-side search
  const [page, setPage] = useState(0);       // 0-indexed
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [reloadTick, setReloadTick] = useState(0); // bump to refetch after add

  // Debounce the search box → reset to first page when it changes.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch only the current page (10 rows) from the server.
  useEffect(() => {
    let cancelled = false;
    async function fetchProfiles() {
      setLoading(true);
      const supabase = createClient();
      let q = supabase
        .from("profiles")
        .select("id, first_name, last_name, email, city, state, role, source, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      const term = query.trim().replace(/[%,()]/g, ""); // sanitize for the .or filter
      if (term) {
        q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%`);
      }

      const from = page * PAGE_SIZE;
      const { data, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (cancelled) return;
      setProfiles((data as Profile[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    }
    fetchProfiles();
    return () => { cancelled = true; };
  }, [page, query, reloadTick]);

  async function updateRole(id: string, role: UserRole) {
    setUpdating(id);
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", id);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
    setUpdating(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>User Management</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">{total} total user{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Search by name, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-marigold px-4 py-2.5 font-display font-bold text-sm text-aubergine hover:bg-marigold-dark active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add user
          </button>
        </div>
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); setSearch(""); setPage(0); setReloadTick((t) => t + 1); }}
        />
      )}

      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-ui text-ink-muted text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory">
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">User</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted hidden md:table-cell">Location</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">Role</th>
                  <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted hidden sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-ivory/50 transition-colors group cursor-pointer">
                    <td className="px-5 py-4">
                      <Link href={`/admin/users/${profile.id}`} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: "#" + ((profile.first_name.charCodeAt(0) * 1234567) % 0xffffff).toString(16).padStart(6, "8") }}
                        >
                          {(profile.first_name[0] ?? "?")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-ui font-semibold text-ink leading-tight truncate group-hover:text-aubergine transition-colors">
                              {profile.first_name} {profile.last_name}
                            </p>
                            {(() => { const s = SOURCE_META[profile.source ?? "signup"] ?? SOURCE_META.signup; return (
                              <span className={`shrink-0 font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                            ); })()}
                          </div>
                          <p className="font-mono text-[10px] text-ink-muted truncate">{profile.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="font-ui text-ink-muted text-sm">{[profile.city, profile.state].filter(Boolean).join(", ") || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${ROLE_STYLES[profile.role]}`}>
                          {profile.role}
                        </span>
                        {updating === profile.id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" />
                        ) : (
                          <select
                            value={profile.role}
                            onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                            className="text-[11px] font-ui border border-ivory-200 rounded-lg px-2 py-1 text-ink-muted bg-white focus:outline-none focus:ring-1 focus:ring-aubergine/30 cursor-pointer"
                          >
                            <option value="user">Member</option>
                            <option value="organizer">Organizer</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="font-mono text-[10px] text-ink-muted">
                        {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-ivory-200 bg-ivory/40 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ivory-200 bg-white font-ui text-xs font-semibold text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted px-1">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ivory-200 bg-white font-ui text-xs font-semibold text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
type EmailCheck = "" | "checking" | "available" | "taken";

// Manually add a single member. Email is the unique key — it's checked against
// existing profiles in the background (debounced) the moment it's a valid address,
// so the admin is warned before submitting rather than after. On create the server
// also re-checks and auto-sends the welcome email.
function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailCheck>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emailValid = EMAIL_RE.test(email.trim());

  // Background duplicate scan once the address looks valid — debounced so we
  // don't fire on every keystroke. Uses the admin-gated find_existing_profiles RPC.
  useEffect(() => {
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) { setEmailCheck(""); return; }
    setEmailCheck("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("find_existing_profiles", { p_emails: [addr] });
      if (cancelled) return;
      setEmailCheck(Array.isArray(data) && data.length > 0 ? "taken" : "available");
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [email]);

  const canSubmit =
    firstName.trim() !== "" && lastName.trim() !== "" && emailValid &&
    emailCheck !== "checking" && emailCheck !== "taken" && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.code === "duplicate") setEmailCheck("taken");
        setError(json.error ?? "Could not add the user.");
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch {
      setError("Could not add the user. Try again.");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-aubergine/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-ivory-200 shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-ivory-200">
          <div>
            <h3 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>Add a user</h3>
            <p className="font-ui text-xs text-ink-muted mt-0.5">We&apos;ll create the account and email them a welcome.</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-ivory transition-colors" aria-label="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First name *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Priya" autoFocus className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last name *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Patel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email *</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com"
              className={`${inputCls} ${emailCheck === "taken" ? "!border-durga/50 !ring-durga/20" : ""}`}
            />
            <div className="mt-1.5 min-h-[16px]">
              {emailCheck === "checking" && (
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  <span className="w-3 h-3 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" /> Checking…
                </p>
              )}
              {emailCheck === "available" && (
                <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-peacock">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  Email available
                </p>
              )}
              {emailCheck === "taken" && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-durga">A user with this email already exists</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Phone <span className="text-ink-muted/50 normal-case tracking-normal">(optional)</span></label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
          </div>

          {error && <p className="font-ui text-xs text-durga">{error}</p>}

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="submit" disabled={!canSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-marigold px-4 py-2.5 font-display font-bold text-sm text-aubergine hover:bg-marigold-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {submitting ? (
                <><span className="w-4 h-4 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" /> Adding…</>
              ) : "Add user & send welcome"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-ivory-200 px-4 py-2.5 font-ui font-semibold text-sm text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
