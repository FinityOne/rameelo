"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Manages an org's combo tickets from within an event's edit page. A combo ticket
// is a single org-owned record linked to multiple events — created/edited here, it
// shows on every linked event (single source of truth). Fully self-contained: it
// loads + saves its own data via SECURITY DEFINER RPCs, independent of the page's
// ticket-tier save flow, so it never interferes with the existing ticketing logic.

type ComboEventLink = { id: string; title: string; start_date: string; status: string };
type Combo = {
  id: string; org_id: string; name: string; description: string | null;
  price: number; quantity: number; quantity_sold: number; is_active: boolean;
  sale_start_date: string | null; sale_end_date: string | null;
  events: ComboEventLink[];
};
type OrgEvent = { id: string; title: string; start_date: string; status: string };

type Editor = {
  comboId: string | null;
  name: string; description: string; price: string; quantity: string;
  is_active: boolean; sale_start_date: string; sale_end_date: string;
  eventIds: string[];
};

const labelCls = "font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5 block";
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";

function fmtDay(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function blankEditor(eventId: string): Editor {
  return { comboId: null, name: "", description: "", price: "", quantity: "100", is_active: true, sale_start_date: "", sale_end_date: "", eventIds: [eventId] };
}

export default function ComboTicketsManager({ eventId, orgId }: { eventId: string; orgId: string | null }) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [orgEvents, setOrgEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    const supabase = createClient();
    const [{ data: comboData }, { data: evData }] = await Promise.all([
      supabase.rpc("get_combo_tickets_for_event", { p_event_id: eventId }),
      supabase.from("events").select("id, title, start_date, status").eq("org_id", orgId).order("start_date"),
    ]);
    setCombos((comboData ?? []) as Combo[]);
    setOrgEvents((evData ?? []) as OrgEvent[]);
    setLoading(false);
  }, [eventId, orgId]);

  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setError("");
    setEditor(blankEditor(eventId));
  }

  function startEdit(c: Combo) {
    setError("");
    setEditor({
      comboId: c.id,
      name: c.name,
      description: c.description ?? "",
      price: String(c.price ?? 0),
      quantity: String(c.quantity ?? 0),
      is_active: c.is_active,
      sale_start_date: c.sale_start_date ?? "",
      sale_end_date: c.sale_end_date ?? "",
      eventIds: c.events.map(e => e.id),
    });
  }

  function toggleEventId(eid: string) {
    setEditor(prev => prev ? {
      ...prev,
      eventIds: prev.eventIds.includes(eid) ? prev.eventIds.filter(x => x !== eid) : [...prev.eventIds, eid],
    } : prev);
  }

  async function save() {
    if (!editor || !orgId) return;
    if (!editor.name.trim()) { setError("Give the combo ticket a name."); return; }
    if (editor.eventIds.length < 1) { setError("Link the combo to at least one event."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("admin_save_combo_ticket", {
      p_combo_id: editor.comboId,
      p_org_id: orgId,
      p_name: editor.name.trim(),
      p_description: editor.description.trim() || null,
      p_price: parseFloat(editor.price) || 0,
      p_quantity: parseInt(editor.quantity, 10) || 0,
      p_is_active: editor.is_active,
      p_sale_start: editor.sale_start_date || null,
      p_sale_end: editor.sale_end_date || null,
      p_event_ids: editor.eventIds,
    });
    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
    setEditor(null);
    setSaving(false);
    await load();
  }

  async function remove(c: Combo) {
    if (!window.confirm(`Delete the combo ticket “${c.name}”? This removes it from all linked events.`)) return;
    setBusyId(c.id);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("admin_delete_combo_ticket", { p_combo_id: c.id });
    if (!rpcErr) await load();
    else setError(rpcErr.message);
    setBusyId(null);
  }

  // No organization on the event → combos (which span an org's events) can't exist.
  if (!orgId) {
    return (
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-ivory-200">
          <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>🎟️✨ Combo Tickets</p>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="font-ui text-sm text-ink-muted">Assign this event to an <strong>organization</strong> (Details tab) to create combo tickets.</p>
          <p className="font-ui text-xs text-ink-muted/60 mt-1">Combo tickets bundle entry to multiple events of the same organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-ivory-200">
        <div>
          <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.015em" }}>🎟️✨ Combo Tickets</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">
            One ticket, multiple events of this organization. Edits here apply to every linked event.
          </p>
        </div>
        {!editor && (
          <button type="button" onClick={startCreate}
            className="flex items-center gap-1.5 bg-aubergine/8 text-aubergine border border-aubergine/20 hover:bg-aubergine/15 font-ui font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New combo
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-ivory-200 border-t-marigold animate-spin" /></div>
        ) : (
          <>
            {orgEvents.length < 2 && !editor && (
              <p className="font-ui text-xs text-[#a06b00] bg-marigold/8 border border-marigold/25 rounded-xl px-3.5 py-2.5">
                This organization has only one event so far. Combo tickets shine when they bundle two or more — add another event under this org to link them.
              </p>
            )}

            {/* Existing combos */}
            {combos.length === 0 && !editor && (
              <div className="text-center py-6">
                <p className="font-display font-semibold text-ink text-sm mb-1">No combo tickets yet</p>
                <p className="font-ui text-xs text-ink-muted">Create one to bundle this event with others from the same organization.</p>
              </div>
            )}

            {combos.map(c => (
              <div key={c.id} className="rounded-2xl border border-ivory-200 overflow-hidden">
                <div className="px-4 py-3 flex items-start justify-between gap-3 bg-ivory/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-semibold text-ink text-sm truncate">{c.name}</p>
                      <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${c.is_active ? "bg-peacock/12 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
                        {c.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted">
                      ${Number(c.price).toFixed(2)} · {c.quantity.toLocaleString()} available · {c.events.length} event{c.events.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => startEdit(c)} disabled={busyId === c.id}
                      className="px-2.5 py-1.5 rounded-lg border border-ivory-200 text-ink-muted font-ui text-xs hover:border-aubergine/30 hover:text-aubergine transition-colors">Edit</button>
                    <button type="button" onClick={() => remove(c)} disabled={busyId === c.id}
                      className="w-7 h-7 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-durga hover:border-durga/30 transition-colors" title="Delete combo">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                {/* Linked event chips */}
                <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                  {c.events.map(e => (
                    <span key={e.id} className={`font-mono text-[9px] px-2 py-1 rounded-full border ${e.id === eventId ? "bg-aubergine/8 text-aubergine border-aubergine/20" : "bg-ivory text-ink-muted border-ivory-200"}`}>
                      {e.title}{e.id === eventId ? " · this event" : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Editor */}
            {editor && (
              <div className="rounded-2xl border-2 border-aubergine/35 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-aubergine/[0.04] border-b border-aubergine/15">
                  <p className="font-display font-bold text-ink text-sm">{editor.comboId ? "Edit combo ticket" : "New combo ticket"}</p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className={labelCls}>Combo name *</label>
                    <input type="text" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} placeholder="2-Night Garba Combo" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea rows={2} value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })} placeholder="Entry to both nights at a bundled price." className={`${inputCls} resize-none`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Price (USD) *</label>
                      <input type="number" min="0" step="0.01" value={editor.price} onChange={e => setEditor({ ...editor, price: e.target.value })} placeholder="0.00" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Quantity *</label>
                      <input type="number" min="0" value={editor.quantity} onChange={e => setEditor({ ...editor, quantity: e.target.value })} placeholder="100" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>On sale from</label>
                      <input type="date" value={editor.sale_start_date} onChange={e => setEditor({ ...editor, sale_start_date: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>On sale until</label>
                      <input type="date" value={editor.sale_end_date} onChange={e => setEditor({ ...editor, sale_end_date: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  {/* Linked events */}
                  <div>
                    <label className={labelCls}>Events in this combo · {editor.eventIds.length} selected</label>
                    <div className="rounded-xl border border-ivory-200 divide-y divide-ivory-200 max-h-56 overflow-auto">
                      {orgEvents.map(e => {
                        const checked = editor.eventIds.includes(e.id);
                        return (
                          <button type="button" key={e.id} onClick={() => toggleEventId(e.id)}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${checked ? "bg-aubergine/[0.04]" : "hover:bg-ivory/50"}`}>
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-aubergine border-aubergine" : "border-ivory-200 bg-white"}`}>
                              {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="font-ui text-sm text-ink truncate block">{e.title}{e.id === eventId ? " · this event" : ""}</span>
                              <span className="font-mono text-[10px] text-ink-muted">{fmtDay(e.start_date)} · {e.status}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-ivory-200 px-3.5 py-3">
                    <div>
                      <p className="font-ui text-sm font-semibold text-ink">Active</p>
                      <p className="font-ui text-xs text-ink-muted">When on, the combo can show on its events (purchase flow comes next).</p>
                    </div>
                    <button type="button" onClick={() => setEditor({ ...editor, is_active: !editor.is_active })}
                      className={`relative shrink-0 w-12 h-6 rounded-full transition-all duration-200 ${editor.is_active ? "bg-peacock" : "bg-ivory-200"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${editor.is_active ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {error && <p className="font-ui text-sm text-durga bg-durga/8 border border-durga/20 rounded-xl px-3.5 py-2.5">{error}</p>}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditor(null); setError(""); }} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">Cancel</button>
                    <button type="button" onClick={save} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-aubergine text-white font-display font-bold text-sm hover:bg-aubergine-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</> : (editor.comboId ? "Save combo" : "Create combo")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
