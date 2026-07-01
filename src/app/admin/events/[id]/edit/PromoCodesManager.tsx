"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/money";

// Manages an event's promo codes from the admin event-edit page. Promo codes are
// ADMIN-ONLY (RLS gates the table to platform admins) — organizers can't touch
// them. Each code takes a flat $ amount off every ticket in a buyer's cart at
// checkout; the discount reduces the ticket subtotal only (platform + card fees
// stay on face value, and the organizer absorbs the discount). Self-contained:
// loads + writes its own data, independent of the page's ticket-tier save flow.

type PromoCode = {
  id: string;
  code: string;
  amount_per_ticket: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type Editor = {
  id: string | null;
  code: string;
  amount: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const labelCls = "font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5 block";
const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/40 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all";

function fmtDay(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Active = flagged active AND within its (optional) date window.
function isLive(p: PromoCode): boolean {
  if (!p.is_active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (p.starts_at && p.starts_at > today) return false;
  if (p.ends_at && p.ends_at < today) return false;
  return true;
}

function windowLabel(p: PromoCode): string {
  const s = fmtDay(p.starts_at);
  const e = fmtDay(p.ends_at);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "No date limit";
}

function blankEditor(): Editor {
  return { id: null, code: "", amount: "", is_active: true, starts_at: "", ends_at: "" };
}

export default function PromoCodesManager({ eventId }: { eventId: string }) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: promoData } = await supabase
      .from("promo_codes")
      .select("id, code, amount_per_ticket, is_active, starts_at, ends_at, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (promoData ?? []) as PromoCode[];
    setCodes(list);

    // Redemptions = real (non-test) orders that used each code and weren't
    // cancelled/refunded. One query, counted client-side.
    const { data: orderRows } = await supabase
      .from("orders")
      .select("promo_code_id")
      .eq("event_id", eventId)
      .eq("is_test", false)
      .in("status", ["confirmed", "pending"])
      .not("promo_code_id", "is", null);
    const counts: Record<string, number> = {};
    for (const r of (orderRows ?? []) as { promo_code_id: string | null }[]) {
      if (r.promo_code_id) counts[r.promo_code_id] = (counts[r.promo_code_id] ?? 0) + 1;
    }
    setRedemptions(counts);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  function startCreate() { setError(""); setEditor(blankEditor()); }
  function startEdit(p: PromoCode) {
    setError("");
    setEditor({
      id: p.id,
      code: p.code,
      amount: String(p.amount_per_ticket),
      is_active: p.is_active,
      starts_at: p.starts_at ?? "",
      ends_at: p.ends_at ?? "",
    });
  }

  async function save() {
    if (!editor) return;
    const code = editor.code.trim().toUpperCase();
    const amount = Number(editor.amount);
    if (!code) { setError("Enter a promo code."); return; }
    if (!/^[A-Z0-9]+$/.test(code)) { setError("Codes can only contain letters and numbers."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a dollar amount greater than 0."); return; }
    if (editor.starts_at && editor.ends_at && editor.ends_at < editor.starts_at) {
      setError("End date can't be before the start date."); return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const row = {
      event_id: eventId,
      code,
      amount_per_ticket: amount,
      is_active: editor.is_active,
      starts_at: editor.starts_at || null,
      ends_at: editor.ends_at || null,
    };

    const { error: err } = editor.id
      ? await supabase.from("promo_codes").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editor.id)
      : await supabase.from("promo_codes").insert(row);

    setSaving(false);
    if (err) {
      setError(err.code === "23505" ? `Code "${code}" already exists for this event.` : err.message);
      return;
    }
    setEditor(null);
    await load();
  }

  async function toggleActive(p: PromoCode) {
    setBusyId(p.id);
    const supabase = createClient();
    await supabase.from("promo_codes").update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq("id", p.id);
    setBusyId(null);
    await load();
  }

  async function remove(p: PromoCode) {
    const used = redemptions[p.id] ?? 0;
    const msg = used > 0
      ? `Delete "${p.code}"? It's been used on ${used} order${used !== 1 ? "s" : ""} — those orders keep their discount, but the code will stop working. Consider deactivating instead.`
      : `Delete "${p.code}"? This can't be undone.`;
    if (!window.confirm(msg)) return;
    setBusyId(p.id);
    const supabase = createClient();
    await supabase.from("promo_codes").delete().eq("id", p.id);
    setBusyId(null);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-ink text-lg" style={{ letterSpacing: "-0.02em" }}>Promo codes</h2>
          <p className="font-ui text-ink-muted text-sm mt-0.5 max-w-xl">
            A flat dollar amount off <strong>each ticket</strong> at checkout. Fees stay on the ticket face value; the discount comes out of the organizer&rsquo;s ticket revenue.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 font-display font-bold text-sm px-4 py-2.5 rounded-xl bg-aubergine text-white hover:bg-aubergine-light shadow-sm transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New code
          </button>
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="rounded-2xl border border-aubergine/20 bg-aubergine/[0.03] p-5 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine font-bold">
            {editor.id ? "Edit code" : "New code"}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Code</label>
              <input
                value={editor.code}
                onChange={e => setEditor({ ...editor, code: e.target.value.toUpperCase() })}
                placeholder="EARLYBIRD"
                className={`${inputCls} font-mono tracking-wider`}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="font-mono text-[9px] text-ink-muted/70 mt-1">Letters &amp; numbers · case-insensitive at checkout</p>
            </div>
            <div>
              <label className={labelCls}>Amount off per ticket ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editor.amount}
                onChange={e => setEditor({ ...editor, amount: e.target.value })}
                placeholder="5.00"
                className={inputCls}
              />
              <p className="font-mono text-[9px] text-ink-muted/70 mt-1">Applied to every ticket in the cart</p>
            </div>
            <div>
              <label className={labelCls}>Start date <span className="text-ink-muted/50">(optional)</span></label>
              <input type="date" value={editor.starts_at} onChange={e => setEditor({ ...editor, starts_at: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End date <span className="text-ink-muted/50">(optional)</span></label>
              <input type="date" value={editor.ends_at} onChange={e => setEditor({ ...editor, ends_at: e.target.value })} className={inputCls} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditor({ ...editor, is_active: !editor.is_active })}
            className="flex items-center gap-2.5"
          >
            <span className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${editor.is_active ? "bg-peacock" : "bg-ivory-200"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${editor.is_active ? "left-[18px]" : "left-0.5"}`} />
            </span>
            <span className="font-ui text-sm text-ink">{editor.is_active ? "Active — buyers can use this code" : "Inactive — code won't work"}</span>
          </button>

          {error && <p className="font-ui text-sm text-durga">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="font-display font-bold text-sm px-5 py-2.5 rounded-xl bg-aubergine text-white hover:bg-aubergine-light shadow-sm transition-all disabled:opacity-60"
            >
              {saving ? "Saving…" : editor.id ? "Save changes" : "Create code"}
            </button>
            <button
              type="button"
              onClick={() => { setEditor(null); setError(""); }}
              className="font-ui font-semibold text-sm px-5 py-2.5 rounded-xl border border-ivory-200 bg-white text-ink-muted hover:text-ink transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {codes.length === 0 && !editor && (
        <div className="text-center py-14 rounded-2xl border border-dashed border-ivory-200 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-aubergine/8 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🏷️</span>
          </div>
          <p className="font-display font-bold text-ink text-base mb-1" style={{ letterSpacing: "-0.02em" }}>No promo codes yet</p>
          <p className="font-ui text-ink-muted text-sm">Create a code to offer a dollar-off discount at checkout.</p>
        </div>
      )}

      {/* List */}
      {codes.length > 0 && (
        <div className="space-y-2.5">
          {codes.map(p => {
            const live = isLive(p);
            const used = redemptions[p.id] ?? 0;
            return (
              <div key={p.id} className="rounded-2xl border border-ivory-200 bg-white p-4 flex items-center gap-4 flex-wrap">
                {/* Code + amount */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-ink tracking-wider">{p.code}</span>
                    <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${live ? "bg-peacock/10 text-peacock" : "bg-ivory-200 text-ink-muted"}`}>
                      {live ? "Active" : p.is_active ? "Scheduled/Ended" : "Inactive"}
                    </span>
                  </div>
                  <p className="font-ui text-xs text-ink-muted">
                    <span className="text-ink font-semibold">${money(p.amount_per_ticket)}</span> off each ticket · {windowLabel(p)}
                  </p>
                </div>

                {/* Redemptions */}
                <div className="text-center shrink-0 px-3">
                  <p className="font-display font-black text-ink text-xl leading-none" style={{ letterSpacing: "-0.03em" }}>{used}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mt-1">Redeemed</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    disabled={busyId === p.id}
                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg border border-ivory-200 text-ink-muted hover:text-ink hover:border-aubergine/25 transition-all disabled:opacity-50"
                  >
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-aubergine/8 text-aubergine hover:bg-aubergine/15 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    disabled={busyId === p.id}
                    aria-label="Delete code"
                    className="w-9 h-9 rounded-lg border border-ivory-200 text-ink-muted hover:text-durga hover:border-durga/25 flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
