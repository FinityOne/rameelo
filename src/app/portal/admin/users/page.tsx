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
  created_at: string;
};

const ROLE_STYLES: Record<UserRole, string> = {
  user: "bg-ivory-200 text-ink-muted",
  organizer: "bg-peacock/15 text-peacock",
  admin: "bg-durga/15 text-durga",
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, city, state, role, created_at")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }

  async function updateRole(id: string, role: UserRole) {
    setUpdating(id);
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", id);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
    setUpdating(null);
  }

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>User Management</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5">{profiles.length} total users</p>
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
        ) : filtered.length === 0 ? (
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
                {filtered.map((profile) => (
                  <tr key={profile.id} className="hover:bg-ivory/50 transition-colors group cursor-pointer">
                    <td className="px-5 py-4">
                      <Link href={`/portal/admin/users/${profile.id}`} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: "#" + ((profile.first_name.charCodeAt(0) * 1234567) % 0xffffff).toString(16).padStart(6, "8") }}
                        >
                          {(profile.first_name[0] ?? "?")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-ui font-semibold text-ink leading-tight truncate group-hover:text-aubergine transition-colors">
                            {profile.first_name} {profile.last_name}
                          </p>
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
      </div>
    </div>
  );
}
