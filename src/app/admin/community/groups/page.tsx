"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatGroup {
  id: string;
  slug: string | null;
  name: string;
  emoji: string;
  description: string | null;
  category: string | null;
  color1: string;
  color2: string;
  group_type: "private" | "interest";
  member_count: number;
  message_count: number;
  linked_event_id: string | null;
  discount_pct: number;
  is_active: boolean;
  is_pinned: boolean;
  is_hot: boolean;
  sort_order: number;
  created_by: string | null;
  last_message_at: string | null;
  created_at: string;
  admin_hidden: boolean;
  admin_notes: string | null;
}

const CATEGORIES = [
  "Fashion", "Hangout", "Food", "Dance", "Beginner",
  "Vibes", "Marketplace", "Community", "Social", "Family", "Planning",
];

const EMOJIS = ["🥁","🎉","🦚","🔥","🌙","⚡","🎭","🌺","🏆","🎯","💃","🌸","🪅","🎪","🎨","🛍️","🍛","👯","🌈","🎵"];

const COLOR_PRESETS: { label: string; c1: string; c2: string }[] = [
  { label: "Aubergine",  c1: "#2E1B30", c2: "#4A2E52" },
  { label: "Durga",     c1: "#7C1F2C", c2: "#B03040" },
  { label: "Peacock",   c1: "#065E52", c2: "#0E8C7A" },
  { label: "Marigold",  c1: "#D4891B", c2: "#F5A623" },
  { label: "Midnight",  c1: "#1a1230", c2: "#2E1B30" },
  { label: "Ocean",     c1: "#1a4a5e", c2: "#0E8C7A" },
  { label: "Berry",     c1: "#5a1e7a", c2: "#892240" },
  { label: "Slate",     c1: "#2d3748", c2: "#4a5568" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  interest: { label: "Community", color: "bg-peacock/12 text-peacock" },
  private:  { label: "Private",   color: "bg-aubergine/12 text-aubergine" },
};

function fmt(d: string | null): string {
  if (!d) return "—";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Group Form Modal ─────────────────────────────────────────────────────────
function GroupFormModal({
  group,
  onClose,
  onSaved,
}: {
  group: ChatGroup | null;
  onClose: () => void;
  onSaved: (g: ChatGroup) => void;
}) {
  const isEdit = !!group;
  const [name, setName]         = useState(group?.name ?? "");
  const [emoji, setEmoji]       = useState(group?.emoji ?? "🥁");
  const [desc, setDesc]         = useState(group?.description ?? "");
  const [category, setCategory] = useState(group?.category ?? CATEGORIES[0]);
  const [type, setType]         = useState<"private" | "interest">(group?.group_type ?? "interest");
  const [color1, setColor1]     = useState(group?.color1 ?? COLOR_PRESETS[0].c1);
  const [color2, setColor2]     = useState(group?.color2 ?? COLOR_PRESETS[0].c2);
  const [discount, setDiscount] = useState(String(group?.discount_pct ?? 0));
  const [sortOrder, setSortOrder] = useState(String(group?.sort_order ?? 0));
  const [isPinned, setIsPinned] = useState(group?.is_pinned ?? false);
  const [isHot, setIsHot]       = useState(group?.is_hot ?? false);
  const [adminNotes, setAdminNotes] = useState(group?.admin_notes ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();

    const payload = {
      name: name.trim(),
      emoji,
      description: desc.trim() || null,
      category,
      group_type: type,
      color1,
      color2,
      discount_pct: parseInt(discount) || 0,
      sort_order: parseInt(sortOrder) || 0,
      is_pinned: isPinned,
      is_hot: isHot,
      admin_notes: adminNotes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (isEdit && group) {
      const { data, error: err } = await supabase
        .from("chat_groups")
        .update(payload)
        .eq("id", group.id)
        .select("*")
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as ChatGroup);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: err } = await supabase
        .from("chat_groups")
        .insert({ ...payload, created_by: user?.id ?? null, is_active: true, admin_hidden: false })
        .select("*")
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as ChatGroup);
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ivory-200 shrink-0">
          <div>
            <h2 className="font-display font-bold text-ink text-lg">{isEdit ? "Edit Group" : "Create Community Group"}</h2>
            <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">
              {isEdit ? `Editing: ${group.name}` : "Adds to member-facing community list"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-ivory flex items-center justify-center text-ink-muted hover:text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden">
            <div className="h-16 flex items-end px-4 pb-3" style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl border border-white/30">
                  {emoji}
                </div>
                <div>
                  <p className="font-display font-bold text-white text-sm leading-tight">{name || "Group Name"}</p>
                  <p className="font-mono text-[9px] text-white/60 uppercase tracking-widest">{category}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emoji */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Emoji</p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(em => (
                <button key={em} onClick={() => setEmoji(em)}
                  className={`w-9 h-9 rounded-xl text-xl transition-all ${emoji === em ? "bg-aubergine scale-110 shadow-md" : "bg-ivory hover:bg-ivory-200"}`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Group name *</p>
            <input
              type="text"
              placeholder="e.g. Atlanta Dance Crew"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Description</p>
            <textarea
              rows={2}
              placeholder="What's this group about?"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all resize-none"
            />
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Category</p>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-3 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine bg-white">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Type</p>
              <select value={type} onChange={e => setType(e.target.value as "private" | "interest")}
                className="w-full rounded-xl border border-ivory-200 px-3 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine bg-white">
                <option value="interest">Community (public)</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Color presets */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Color theme</p>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setColor1(p.c1); setColor2(p.c2); }}
                  className={`h-8 rounded-xl transition-all ${color1 === p.c1 ? "ring-2 ring-aubergine ring-offset-1 scale-105" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          {/* Discount + Sort */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Group discount %</p>
              <input type="number" min={0} max={50} value={discount} onChange={e => setDiscount(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Sort order</p>
              <input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all" />
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div onClick={() => setIsPinned(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${isPinned ? "bg-aubergine" : "bg-ivory-200"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPinned ? "left-5" : "left-1"}`} />
              </div>
              <span className="font-ui text-sm text-ink">Pin to top</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div onClick={() => setIsHot(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${isHot ? "bg-marigold" : "bg-ivory-200"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isHot ? "left-5" : "left-1"}`} />
              </div>
              <span className="font-ui text-sm text-ink">Mark as 🔥 Hot</span>
            </label>
          </div>

          {/* Admin notes */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">Admin notes (internal)</p>
            <textarea rows={2} placeholder="Optional internal notes..."
              value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
              className="w-full rounded-xl border border-ivory-200 px-4 py-3 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all resize-none" />
          </div>

          {error && <p className="text-durga font-ui text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ivory-200 shrink-0">
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm transition-all ${name.trim() && !saving ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"}`}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCommunityGroupsPage() {
  const [groups, setGroups]         = useState<ChatGroup[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState<"all" | "interest" | "private">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden" | "inactive">("active");
  const [editGroup, setEditGroup]   = useState<ChatGroup | null | "new">(null);
  const [toast, setToast]           = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ChatGroup | null>(null);
  const supabase = useRef(createClient());

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const loadGroups = useCallback(async () => {
    const { data } = await supabase.current
      .from("chat_groups")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setGroups((data as ChatGroup[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // ── Quick actions ──────────────────────────────────────────────
  async function toggle(id: string, field: "is_pinned" | "is_hot" | "admin_hidden" | "is_active", current: boolean) {
    const patch = { [field]: !current, updated_at: new Date().toISOString() };
    await supabase.current.from("chat_groups").update(patch).eq("id", id);
    setGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: !current } : g));
    const labels: Record<string, [string, string]> = {
      is_pinned:    ["Pinned", "Unpinned"],
      is_hot:       ["Marked hot 🔥", "Removed hot"],
      admin_hidden: ["Hidden from members", "Restored — now visible"],
      is_active:    ["Reactivated", "Deactivated"],
    };
    const [on, off] = labels[field];
    showToast(!current ? on : off);
  }

  async function deleteGroup(g: ChatGroup) {
    await supabase.current.from("chat_groups").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", g.id);
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, is_active: false } : x));
    setConfirmDelete(null);
    showToast(`"${g.name}" deactivated`);
  }

  function onSaved(saved: ChatGroup) {
    setGroups(prev => {
      const exists = prev.some(g => g.id === saved.id);
      return exists
        ? prev.map(g => g.id === saved.id ? saved : g)
        : [saved, ...prev];
    });
    showToast(editGroup === "new" ? `"${saved.name}" created 🎉` : `"${saved.name}" updated`);
  }

  // ── Filtering ──────────────────────────────────────────────────
  const filtered = groups.filter(g => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase()) && !(g.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && g.group_type !== filterType) return false;
    if (filterStatus === "active"   && (!g.is_active || g.admin_hidden)) return false;
    if (filterStatus === "hidden"   && !g.admin_hidden) return false;
    if (filterStatus === "inactive" && g.is_active) return false;
    return true;
  });

  const stats = {
    total:    groups.length,
    interest: groups.filter(g => g.group_type === "interest").length,
    private:  groups.filter(g => g.group_type === "private").length,
    members:  groups.reduce((s, g) => s + (g.member_count ?? 0), 0),
    hidden:   groups.filter(g => g.admin_hidden).length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-aubergine text-white px-5 py-3 rounded-2xl shadow-2xl font-ui text-sm font-medium max-w-sm text-center pointer-events-none">
          {toast}
        </div>
      )}

      {/* Group form modal */}
      {editGroup !== null && (
        <GroupFormModal
          group={editGroup === "new" ? null : editGroup}
          onClose={() => setEditGroup(null)}
          onSaved={onSaved}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <p className="font-display font-bold text-ink text-lg mb-2">Deactivate group?</p>
            <p className="font-ui text-sm text-ink-muted mb-5">
              <strong className="text-ink">{confirmDelete.name}</strong> will be hidden from all members. This can be reversed by toggling &ldquo;Active&rdquo; back on.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink hover:bg-ivory transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteGroup(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-durga text-white font-ui font-semibold text-sm hover:opacity-90 transition-all">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total groups",  value: stats.total },
          { label: "Communities",   value: stats.interest },
          { label: "Private",       value: stats.private },
          { label: "Total members", value: stats.members.toLocaleString() },
          { label: "Hidden",        value: stats.hidden },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-ivory-200 p-4 shadow-sm text-center">
            <p className="font-display font-black text-ink text-2xl" style={{ letterSpacing: "-0.03em" }}>{s.value}</p>
            <p className="font-mono text-[9px] text-ink/40 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search groups…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-ivory-200 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all bg-white" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-aubergine/25">
          <option value="all">All types</option>
          <option value="interest">Community</option>
          <option value="private">Private</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-aubergine/25">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={() => setEditGroup("new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:opacity-90 transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Group
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-ivory-200 border-t-aubergine animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-display font-bold text-ink">No groups match</p>
            <p className="font-ui text-sm text-ink-muted mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-ivory-200">
            {filtered.map(g => {
              const typeMeta = TYPE_LABELS[g.group_type];
              const isHidden   = g.admin_hidden;
              const isInactive = !g.is_active;

              return (
                <div key={g.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-ivory/60 transition-colors ${isHidden || isInactive ? "opacity-60" : ""}`}>

                  {/* Colour swatch + emoji */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${g.color1}, ${g.color2})` }}>
                    {g.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-bold text-ink text-sm leading-tight">{g.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                      {g.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-wide bg-ink/5 text-ink/50">
                          {g.category}
                        </span>
                      )}
                      {g.is_pinned && <span className="text-xs">📌</span>}
                      {g.is_hot    && <span className="text-xs">🔥</span>}
                      {isHidden    && <span className="font-mono text-[8px] uppercase tracking-wide bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">Hidden</span>}
                      {isInactive  && <span className="font-mono text-[8px] uppercase tracking-wide bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[9px] text-ink/40">{g.member_count} members</span>
                      <span className="font-mono text-[9px] text-ink/25">·</span>
                      <span className="font-mono text-[9px] text-ink/40">{g.message_count} messages</span>
                      {g.last_message_at && (
                        <>
                          <span className="font-mono text-[9px] text-ink/25">·</span>
                          <span className="font-mono text-[9px] text-ink/40">active {fmt(g.last_message_at)}</span>
                        </>
                      )}
                      {g.discount_pct > 0 && (
                        <>
                          <span className="font-mono text-[9px] text-ink/25">·</span>
                          <span className="font-mono text-[9px] text-marigold">{g.discount_pct}% discount</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Pin */}
                    <button onClick={() => toggle(g.id, "is_pinned", g.is_pinned)} title={g.is_pinned ? "Unpin" : "Pin"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm ${g.is_pinned ? "bg-aubergine/10 text-aubergine" : "hover:bg-ivory text-ink/30 hover:text-ink/60"}`}>
                      📌
                    </button>
                    {/* Hot */}
                    <button onClick={() => toggle(g.id, "is_hot", g.is_hot)} title={g.is_hot ? "Remove hot" : "Mark hot"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm ${g.is_hot ? "bg-marigold/15 text-marigold" : "hover:bg-ivory text-ink/30 hover:text-ink/60"}`}>
                      🔥
                    </button>
                    {/* Hide/show */}
                    <button onClick={() => toggle(g.id, "admin_hidden", g.admin_hidden)} title={g.admin_hidden ? "Restore visibility" : "Hide from members"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${g.admin_hidden ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" : "hover:bg-ivory text-ink/30 hover:text-ink/60"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {g.admin_hidden
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        }
                      </svg>
                    </button>
                    {/* Edit */}
                    <button onClick={() => setEditGroup(g)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-aubergine/8 text-ink/40 hover:text-aubergine transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    {/* Deactivate */}
                    {g.is_active ? (
                      <button onClick={() => setConfirmDelete(g)} title="Deactivate"
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/8 text-ink/25 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      </button>
                    ) : (
                      <button onClick={() => toggle(g.id, "is_active", false)} title="Reactivate"
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-500/8 text-ink/25 hover:text-green-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { icon: "📌", title: "Pin",      desc: "Appears at the top of the community list for all members." },
          { icon: "🔥", title: "Hot",      desc: "Shows a 'HOT' badge and priority placement in the list." },
          { icon: "👁️", title: "Hide",     desc: "Invisible to members but stays in the DB. Admins still see it here." },
        ].map(tip => (
          <div key={tip.title} className="bg-aubergine/5 border border-aubergine/12 rounded-2xl p-4">
            <p className="font-ui font-semibold text-ink text-sm mb-1">{tip.icon} {tip.title}</p>
            <p className="font-ui text-xs text-ink/55 leading-relaxed">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
