"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "../org-context";

// ── Types ───────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  user_id: string;
  role: string;
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
};
type Invite = { id: string; email: string; role: string; created_at: string };
type UserResult = { id: string; first_name: string | null; last_name: string | null; email: string };

const ASSIGNABLE = [
  { value: "admin",   label: "Admin",   desc: "Full access — events, orders, money, team." },
  { value: "scanner", label: "Scanner", desc: "Can only scan tickets at the door." },
];
const ROLE_BADGE: Record<string, string> = {
  owner:   "bg-aubergine/10 text-aubergine",
  admin:   "bg-peacock/10 text-peacock",
  scanner: "bg-marigold/15 text-marigold-dark",
  member:  "bg-ivory-200 text-ink-muted",
};
const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", scanner: "Scanner", member: "Member" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TeamPage() {
  const { activeOrg, activeRole } = useOrg();
  const canManage = activeRole === "owner" || activeRole === "admin";

  const [userId, setUserId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Add flow
  const [addRole, setAddRole] = useState("scanner");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const reload = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase.from("organization_members").select("id, user_id, role, profiles (first_name, last_name, email)").eq("org_id", orgId),
      supabase.from("org_invitations").select("id, email, role, created_at").eq("org_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setMembers((m ?? []).map((row: unknown) => {
      const r = row as { id: string; user_id: string; role: string; profiles: Member["profile"] };
      return { id: r.id, user_id: r.user_id, role: r.role, profile: r.profiles };
    }));
    setInvites((inv ?? []) as Invite[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeOrg) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? ""));
    setLoading(true);
    reload(activeOrg.id);
  }, [activeOrg, reload]);

  // Search existing accounts
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const supabase = createClient();
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(6);
      const existing = new Set(members.map(m => m.user_id));
      setResults(((data ?? []) as UserResult[]).filter(u => !existing.has(u.id)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, members]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  async function quickAdd(u: UserResult) {
    if (!activeOrg) return;
    setBusyId(u.id);
    const supabase = createClient();
    const { error } = await supabase.rpc("add_org_member", { p_org_id: activeOrg.id, p_user_id: u.id, p_role: addRole });
    setBusyId(null);
    if (error) { flash("Couldn't add member."); return; }
    setQuery(""); setResults([]);
    flash(`${u.first_name ?? u.email} added as ${ROLE_LABEL[addRole]}.`);
    reload(activeOrg.id);
  }

  async function inviteByEmail(email: string) {
    if (!activeOrg) return;
    setBusyId("invite");
    const res = await fetch("/api/org-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: activeOrg.id, email, role: addRole }),
    });
    setBusyId(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash(json.error ?? "Couldn't send invite."); return; }
    setQuery(""); setResults([]);
    flash(json.emailed === false ? "Invite created (email may be delayed)." : `Invitation emailed to ${email}.`);
    reload(activeOrg.id);
  }

  async function changeRole(member: Member, role: string) {
    const supabase = createClient();
    await supabase.from("organization_members").update({ role }).eq("id", member.id);
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m));
  }

  async function removeMember(member: Member) {
    setBusyId(member.id);
    const supabase = createClient();
    await supabase.from("organization_members").delete().eq("id", member.id);
    setBusyId(null);
    setMembers(prev => prev.filter(m => m.id !== member.id));
  }

  async function resendInvite(inv: Invite) {
    if (!activeOrg) return;
    setBusyId(inv.id);
    const res = await fetch("/api/org-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Re-send to the same pending invitee with their existing role. The API
      // reuses the existing pending invitation rather than creating a new one.
      body: JSON.stringify({ orgId: activeOrg.id, email: inv.email, role: inv.role }),
    });
    setBusyId(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash(json.error ?? "Couldn't resend invite."); return; }
    flash(json.emailed === false ? "Invite re-created (email may be delayed)." : `Invitation re-sent to ${inv.email}.`);
  }

  async function revokeInvite(inv: Invite) {
    setBusyId(inv.id);
    const supabase = createClient();
    await supabase.from("org_invitations").update({ status: "revoked" }).eq("id", inv.id);
    setBusyId(null);
    setInvites(prev => prev.filter(i => i.id !== inv.id));
  }

  const trimmed = query.trim();
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
  const exactEmailMatch = results.some(r => r.email.toLowerCase() === trimmed.toLowerCase());

  if (!activeOrg) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-4xl mb-3">👥</p>
        <p className="font-display font-bold text-ink text-lg mb-1">No organization selected</p>
        <p className="font-ui text-ink-muted text-sm">Pick an organization to manage its team.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Team</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Manage who can run {activeOrg.name} — and what they can do.</p>
      </div>

      {toast && (
        <div className="rounded-xl bg-peacock/10 border border-peacock/25 px-4 py-2.5 font-ui text-sm text-peacock">{toast}</div>
      )}

      {!canManage && (
        <div className="rounded-xl bg-ivory border border-ivory-200 px-4 py-2.5 font-ui text-sm text-ink-muted">
          You have view-only access to the team. Ask an owner or admin to make changes.
        </div>
      )}

      {/* Add / invite */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-ivory-200 p-5 space-y-4">
          <div>
            <p className="font-display font-bold text-ink text-sm mb-2" style={{ letterSpacing: "-0.01em" }}>Add a team member</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNABLE.map(r => (
                <button key={r.value} type="button" onClick={() => setAddRole(r.value)}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${addRole === r.value ? "border-aubergine bg-aubergine/5" : "border-ivory-200 hover:border-aubergine/30"}`}>
                  <p className={`font-ui font-bold text-sm ${addRole === r.value ? "text-aubergine" : "text-ink"}`}>{r.label}</p>
                  <p className="font-ui text-[11px] text-ink-muted leading-snug mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, or type an email to invite…"
              className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all"
            />

            {trimmed.length >= 2 && (
              <div className="mt-2 rounded-xl border border-ivory-200 overflow-hidden divide-y divide-ivory-200">
                {results.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-aubergine/10 flex items-center justify-center text-aubergine font-bold text-xs shrink-0">
                      {(u.first_name?.[0] ?? u.email[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-ink text-sm truncate">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</p>
                      <p className="font-ui text-xs text-ink-muted truncate">{u.email}</p>
                    </div>
                    <button onClick={() => quickAdd(u)} disabled={busyId === u.id}
                      className="px-3 py-1.5 rounded-lg bg-aubergine text-white font-ui font-semibold text-xs hover:bg-aubergine-light transition-colors disabled:opacity-50 shrink-0">
                      {busyId === u.id ? "Adding…" : `Add as ${ROLE_LABEL[addRole]}`}
                    </button>
                  </div>
                ))}

                {/* Invite-by-email when the typed value is an email with no exact match */}
                {looksLikeEmail && !exactEmailMatch && (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-marigold/[0.05]">
                    <div className="w-8 h-8 rounded-full bg-marigold/15 flex items-center justify-center text-marigold-dark text-sm shrink-0">✉️</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-ink text-sm truncate">{trimmed}</p>
                      <p className="font-ui text-xs text-ink-muted">No account yet — send an email invite.</p>
                    </div>
                    <button onClick={() => inviteByEmail(trimmed)} disabled={busyId === "invite"}
                      className="px-3 py-1.5 rounded-lg bg-marigold text-aubergine font-ui font-semibold text-xs hover:bg-marigold-dark transition-colors disabled:opacity-50 shrink-0">
                      {busyId === "invite" ? "Sending…" : `Invite as ${ROLE_LABEL[addRole]}`}
                    </button>
                  </div>
                )}

                {results.length === 0 && !looksLikeEmail && !searching && (
                  <p className="px-3.5 py-3 font-ui text-xs text-ink-muted">No accounts found. Type a full email to send an invite.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Pending invites</p>
            <span className="font-mono text-[10px] text-ink-muted">{invites.length}</span>
          </div>
          <div className="divide-y divide-ivory-200">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-full bg-marigold/10 flex items-center justify-center text-marigold-dark shrink-0">✉️</div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui font-semibold text-ink text-sm truncate">{inv.email}</p>
                  <p className="font-ui text-xs text-ink-muted">Invited {fmtDate(inv.created_at)} · awaiting sign-up</p>
                </div>
                <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${ROLE_BADGE[inv.role] ?? ROLE_BADGE.member}`}>
                  {ROLE_LABEL[inv.role] ?? inv.role}
                </span>
                {canManage && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => resendInvite(inv)} disabled={busyId === inv.id}
                      className="inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-aubergine hover:text-aubergine-light transition-colors disabled:opacity-50">
                      {busyId === inv.id
                        ? <><span className="w-3 h-3 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" />Sending…</>
                        : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Resend</>}
                    </button>
                    <button onClick={() => revokeInvite(inv)} disabled={busyId === inv.id}
                      className="font-ui text-xs text-ink-muted hover:text-durga transition-colors disabled:opacity-50">
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Members</p>
          <span className="font-mono text-[10px] text-ink-muted">{members.length}</span>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" /></div>
        ) : (
          <div className="divide-y divide-ivory-200">
            {members.map(m => {
              const name = [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(" ") || m.profile?.email || "Member";
              const isOwner = m.role === "owner";
              const isSelf = m.user_id === userId;
              const editable = canManage && !isOwner;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-aubergine flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(m.profile?.first_name?.[0] ?? m.profile?.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-ink text-sm truncate">
                      {name}{isSelf && <span className="font-ui text-xs text-ink-muted font-normal"> · you</span>}
                    </p>
                    <p className="font-ui text-xs text-ink-muted truncate">{m.profile?.email}</p>
                  </div>

                  {editable && !isSelf ? (
                    <select
                      value={["admin", "scanner"].includes(m.role) ? m.role : "admin"}
                      onChange={e => changeRole(m, e.target.value)}
                      className="font-ui text-xs text-ink border border-ivory-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-aubergine/20 cursor-pointer"
                    >
                      {ASSIGNABLE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  )}

                  {editable && !isSelf && (
                    <button onClick={() => removeMember(m)} disabled={busyId === m.id}
                      title="Remove from team"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-durga hover:bg-durga/5 transition-colors shrink-0 disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] text-ink-muted/70 text-center">
        Scanners can only open the door scanner. Admins get the full organizer portal.
      </p>
    </div>
  );
}
