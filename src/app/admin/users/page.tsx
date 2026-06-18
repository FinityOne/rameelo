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
  }, [page, query]);

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
        <input
          type="text"
          placeholder="Search by name, email, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-xl border border-ivory-200 bg-white px-4 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
        />
      </div>

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
