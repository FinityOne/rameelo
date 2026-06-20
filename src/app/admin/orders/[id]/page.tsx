"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────────

type OrderFull = {
  id: string;
  user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  rameelo_fee: number;
  processing_fee: number;
  service_fee: number;
  grand_total: number;
  status: string;
  payment_method: string;
  payment_last4: string | null;
  payment_brand: string | null;
  is_test: boolean;
  order_type: string;
  group_id: string | null;
  created_at: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  events: { id: string; title: string; start_date: string; start_time: string | null; venue_name: string; city: string | null; state: string | null; status: string } | null;
  ticket_tiers: { id: string; name: string; price: number } | null;
};

type BuyerProfile = { id: string; first_name: string | null; last_name: string | null; email: string | null; city: string | null; state: string | null } | null;

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-peacock/15 text-peacock", icon: "✅" },
  pending:   { label: "Pending",   cls: "bg-marigold/20 text-[#a06b00]", icon: "🕓" },
  cancelled: { label: "Cancelled", cls: "bg-durga/15 text-durga", icon: "🚫" },
  refunded:  { label: "Refunded",  cls: "bg-ink/10 text-ink-muted", icon: "↩️" },
};

function receiptNum(id: string) { return "RM-" + id.replace(/-/g, "").slice(0, 10).toUpperCase(); }
function fmtTS(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtEventDate(d: string, t: string | null) {
  const date = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (!t) return date;
  const [h, m] = t.split(":").map(Number);
  return `${date} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function money(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// "CARD · Visa •••• 4242" / "ACH · Wells Fargo •••• 6789" — falls back to just the
// method when no saved details exist (older orders, free tickets).
function paymentDisplay(o: { payment_method: string; payment_brand: string | null; payment_last4: string | null }): string {
  const method = (o.payment_method || "").toUpperCase();
  const brand = (o.payment_brand || "").replace(/\b\w/g, c => c.toUpperCase());
  const parts = [brand, o.payment_last4 ? `•••• ${o.payment_last4}` : ""].filter(Boolean).join(" ");
  return parts ? `${method} · ${parts}` : method;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-ink text-right ${mono ? "font-mono" : "font-ui"}`}>{value}</span>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder]     = useState<OrderFull | null>(null);
  const [buyer, setBuyer]     = useState<BuyerProfile>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"sent" | "error" | null>(null);
  const [sendingTeam, setSendingTeam] = useState(false);
  const [teamResult, setTeamResult] = useState<"sent" | "error" | null>(null);

  // Buyer-email edit modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [resolving, setResolving] = useState(false);
  const [matchedAccount, setMatchedAccount] = useState<{ id: string; name: string } | null>(null);
  const [resolved, setResolved] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("orders")
        .select(`
          id, user_id, buyer_name, buyer_email, buyer_phone,
          qty, unit_price, discount_pct, discount_amount,
          rameelo_fee, processing_fee, service_fee, grand_total,
          status, payment_method, payment_last4, payment_brand, is_test, order_type, group_id, created_at,
          cancellation_reason, cancelled_at,
          events (id, title, start_date, start_time, venue_name, city, state, status),
          ticket_tiers (id, name, price)
        `)
        .eq("id", id)
        .single();

      if (!data) { router.replace("/admin/orders"); return; }
      const ord = data as unknown as OrderFull;
      setOrder(ord);

      if (ord.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, city, state")
          .eq("id", ord.user_id)
          .single();
        setBuyer((prof as BuyerProfile) ?? null);
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function toggleTest() {
    if (!order) return;
    setToggling(true);
    const supabase = createClient();
    const next = !order.is_test;
    const { error } = await supabase.from("orders").update({ is_test: next }).eq("id", order.id);
    if (!error) setOrder(prev => prev ? { ...prev, is_test: next } : prev);
    setToggling(false);
  }

  async function sendConfirmation() {
    if (!order) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/send-order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      setSendResult(res.ok ? "sent" : "error");
    } catch {
      setSendResult("error");
    }
    setSending(false);
    setTimeout(() => setSendResult(null), 4000);
  }

  async function sendTeamNotification() {
    if (!order) return;
    setSendingTeam(true);
    setTeamResult(null);
    try {
      const res = await fetch("/api/admin/send-order-team-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      setTeamResult(res.ok ? "sent" : "error");
    } catch {
      setTeamResult("error");
    }
    setSendingTeam(false);
    setTimeout(() => setTeamResult(null), 4000);
  }

  function openEmailModal() {
    setNewEmail("");
    setMatchedAccount(null);
    setResolved(false);
    setEmailError(null);
    setEmailModalOpen(true);
  }

  // Look up whether the typed email already belongs to an account, so the admin
  // sees exactly what will happen before committing.
  async function resolveEmail() {
    const email = newEmail.trim().toLowerCase();
    setResolved(false);
    setMatchedAccount(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (order && email === order.buyer_email.toLowerCase()) return;
    setResolving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .ilike("email", email)
      .maybeSingle();
    if (data) {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;
      setMatchedAccount({ id: data.id as string, name });
    }
    setResolving(false);
    setResolved(true);
  }

  async function saveEmail() {
    if (!order) return;
    const email = newEmail.trim().toLowerCase();
    setEmailError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email address."); return; }
    if (email === order.buyer_email.toLowerCase()) { setEmailError("That's already the email on this order."); return; }
    setSavingEmail(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_change_order_email", { p_order_id: order.id, p_email: email });
    if (error) {
      setEmailError(error.message || "Couldn't update the email — try again.");
      setSavingEmail(false);
      return;
    }
    const res = (data ?? {}) as { matched_account?: boolean; user_id?: string | null; buyer_email?: string };
    const nextUserId = res.user_id ?? null;
    setOrder(prev => prev ? { ...prev, buyer_email: res.buyer_email ?? email, user_id: nextUserId } : prev);
    // Refresh the linked profile card (or clear it when detached to guest).
    if (nextUserId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, city, state")
        .eq("id", nextUserId)
        .single();
      setBuyer((prof as BuyerProfile) ?? null);
    } else {
      setBuyer(null);
    }
    setSavingEmail(false);
    setEmailModalOpen(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!order) return null;

  const meta     = STATUS_META[order.status] ?? { label: order.status, cls: "bg-ivory-200 text-ink-muted", icon: "•" };
  const subtotal = order.unit_price * order.qty;
  const buyerName = buyer ? [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || order.buyer_name : order.buyer_name;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/admin/orders" className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Orders
        </Link>
        <span className="text-ink-muted/40 text-xs">/</span>
        <span className="font-mono text-xs text-ink-muted truncate">{receiptNum(order.id)}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${meta.cls}`}>
                {meta.icon} {meta.label}
              </span>
              {order.is_test && (
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/20 text-marigold-dark">Test order</span>
              )}
              {order.order_type === "manual" && (
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-marigold/15 text-marigold-dark">Manual · offline</span>
              )}
            </div>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>{receiptNum(order.id)}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">Placed {fmtTS(order.created_at)} · {paymentDisplay(order)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</p>
            <p className="font-display font-bold text-ink text-2xl" style={{ letterSpacing: "-0.02em" }}>${money(order.grand_total)}</p>
            <p className="font-mono text-[10px] text-ink-muted">{order.qty} ticket{order.qty !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Cancellation notice */}
      {(order.cancelled_at || order.status === "cancelled" || order.status === "refunded") && (
        <div className="rounded-2xl bg-durga/8 border border-durga/20 px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-1">
            {order.status === "refunded" ? "Refunded" : "Cancelled"} {order.cancelled_at ? `· ${fmtTS(order.cancelled_at)}` : ""}
          </p>
          <p className="font-ui text-sm text-ink leading-relaxed">{order.cancellation_reason || "No reason recorded."}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Event */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Event</p>
            {order.events && (
              <Link href={`/admin/events/${order.events.id}`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Open →</Link>
            )}
          </div>
          <div className="px-5 py-4">
            {order.events ? (
              <>
                <p className="font-display font-bold text-ink text-sm">{order.events.title}</p>
                <Row label="Date" value={fmtEventDate(order.events.start_date, order.events.start_time)} />
                <Row label="Venue" value={order.events.venue_name} />
                <Row label="Location" value={[order.events.city, order.events.state].filter(Boolean).join(", ") || "—"} />
                <Row label="Event status" value={order.events.status} />
              </>
            ) : (
              <p className="font-ui text-sm text-ink-muted">Event not found.</p>
            )}
          </div>
        </div>

        {/* Buyer */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Buyer</p>
            {order.user_id ? (
              <Link href={`/admin/users/${order.user_id}`} className="font-ui text-xs font-semibold text-aubergine hover:underline">Profile →</Link>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted/60">Guest</span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="font-display font-bold text-ink text-sm">{buyerName}</p>
            <Row label="Email" value={order.buyer_email} />
            <Row label="Phone" value={order.buyer_phone || "—"} />
            {buyer && (buyer.city || buyer.state) && (
              <Row label="Home" value={[buyer.city, buyer.state].filter(Boolean).join(", ")} />
            )}
            <button
              onClick={openEmailModal}
              className="mt-3 inline-flex items-center gap-1.5 font-ui text-xs font-semibold text-aubergine hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Change buyer email
            </button>
            {order.user_id && (
              <p className="font-ui text-[11px] text-ink-muted mt-2 leading-relaxed">
                Need to fix this person&rsquo;s account email everywhere instead?{" "}
                <Link href={`/admin/users/${order.user_id}`} className="text-aubergine hover:underline font-semibold">Edit their profile →</Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Order Summary</p>
          <p className="font-mono text-[10px] text-ink-muted">{order.ticket_tiers?.name ?? "—"}</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">{order.qty} × ${money(order.unit_price)} ({order.ticket_tiers?.name ?? "Ticket"})</span>
            <span className="font-mono text-ink">${money(subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-ui text-peacock">Group discount{order.discount_pct ? ` (${order.discount_pct}%)` : ""}</span>
              <span className="font-mono text-peacock">−${money(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">Rameelo fee</span>
            <span className="font-mono text-ink-muted">${money(order.rameelo_fee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-ui text-ink-muted">Card processing</span>
            <span className="font-mono text-ink-muted">${money(order.processing_fee)}</span>
          </div>
          <div className="border-t border-ivory-200 pt-2 flex justify-between">
            <span className="font-display font-bold text-ink">Grand total</span>
            <span className="font-display font-bold text-ink text-lg">${money(order.grand_total)}</span>
          </div>
          {order.order_type === "manual" ? (
            <p className="font-mono text-[10px] text-marigold-dark pt-1">
              Manual / offline order — settled directly by the organizer. Not processed or collected by Rameelo, and excluded from platform revenue &amp; payouts.
            </p>
          ) : (
            <p className="font-mono text-[10px] text-ink-muted pt-1">
              Platform take (Rameelo fee): <span className="font-bold text-ink">${money(order.rameelo_fee)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Meta + admin actions */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Details</p>
        </div>
        <div className="px-5 py-4">
          <Row label="Order ID" value={<span className="select-all">{order.id}</span>} mono />
          <Row label="Payment" value={paymentDisplay(order)} />
          <Row label="Group order" value={
            order.group_id
              ? <Link href={`/group/${order.group_id}`} className="text-aubergine hover:underline">{order.group_id}</Link>
              : "—"
          } mono />
          <Row label="Placed" value={fmtTS(order.created_at)} />
        </div>

        {/* Resend order confirmation / receipt to the buyer */}
        <div className="px-5 py-4 border-t border-ivory-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              Order confirmation email
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              {sendResult === "sent"
                ? <span className="text-peacock font-semibold">Sent to {order.buyer_email} ✓</span>
                : sendResult === "error"
                  ? <span className="text-durga font-semibold">Couldn&rsquo;t send — try again.</span>
                  : <>Resend the receipt &amp; ticket-access email to <span className="text-ink">{order.buyer_email}</span>.</>}
            </p>
          </div>
          <button
            onClick={sendConfirmation}
            disabled={sending}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine-light transition-all disabled:opacity-60"
          >
            {sending ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Send confirmation
              </>
            )}
          </button>
        </div>

        {/* Resend the new-order notification to the event's organizing team */}
        <div className="px-5 py-4 border-t border-ivory-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              Organizer team notification
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              {teamResult === "sent"
                ? <span className="text-peacock font-semibold">Sent to the organizing team ✓</span>
                : teamResult === "error"
                  ? <span className="text-durga font-semibold">Couldn&rsquo;t send — no team members, or try again.</span>
                  : <>Resend the new-order email to this event&rsquo;s organizers (owners, admins &amp; the event creator).</>}
            </p>
          </div>
          <button
            onClick={sendTeamNotification}
            disabled={sendingTeam}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-aubergine/30 bg-white text-aubergine font-ui font-semibold text-sm hover:bg-aubergine/5 transition-all disabled:opacity-60"
          >
            {sendingTeam ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin" /> Sending…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Notify team
              </>
            )}
          </button>
        </div>

        {/* Test/live toggle — excludes from live totals platform-wide */}
        <div className="px-5 py-4 border-t border-ivory-200 flex items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: "-0.01em" }}>
              {order.is_test ? "Marked as a test order" : "Counted as a live order"}
            </p>
            <p className="font-ui text-xs text-ink-muted mt-0.5">
              Test orders are excluded from live revenue everywhere and labeled in the member portal.
            </p>
          </div>
          <button
            onClick={toggleTest}
            disabled={toggling}
            className={`relative shrink-0 w-12 h-6 rounded-full transition-all duration-200 ${order.is_test ? "bg-marigold" : "bg-ivory-200"} ${toggling ? "opacity-50" : ""}`}
            title={order.is_test ? "Mark as live" : "Mark as test"}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${order.is_test ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* Change buyer email modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aubergine/40 backdrop-blur-sm" onClick={() => !savingEmail && setEmailModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-ivory-200 shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-ivory-200">
              <p className="font-display font-bold text-ink text-base">Change buyer email</p>
              <p className="font-ui text-xs text-ink-muted mt-0.5">
                Currently <span className="text-ink font-medium">{order.buyer_email}</span>
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <input
                type="email"
                autoFocus
                placeholder="new-email@example.com"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setResolved(false); setMatchedAccount(null); setEmailError(null); }}
                onBlur={resolveEmail}
                className="w-full rounded-xl border border-ivory-200 px-3 py-2.5 font-ui text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-aubergine/25 focus:border-aubergine transition-all"
              />

              {/* Consequence preview */}
              {resolving && <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Checking…</p>}
              {resolved && !resolving && matchedAccount && (
                <div className="rounded-xl bg-peacock/8 border border-peacock/20 px-3.5 py-3">
                  <p className="font-ui text-xs text-ink leading-relaxed">
                    ✓ Will attach to <span className="font-semibold">{matchedAccount.name}</span>&rsquo;s account — these tickets move to their portal.
                  </p>
                </div>
              )}
              {resolved && !resolving && !matchedAccount && (
                <div className="rounded-xl bg-marigold/10 border border-marigold/25 px-3.5 py-3">
                  <p className="font-ui text-xs text-ink leading-relaxed">
                    No account uses this email — saved as a <span className="font-semibold">guest order</span> under the new address.
                    {order.user_id && <> It will be <span className="font-semibold">detached</span> from the current account.</>}
                  </p>
                </div>
              )}

              {emailError && (
                <p className="font-ui text-xs text-durga font-medium">{emailError}</p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-ivory-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEmailModalOpen(false)}
                disabled={savingEmail}
                className="px-4 py-2.5 rounded-xl font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-all disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={saveEmail}
                disabled={savingEmail || !newEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aubergine text-white font-ui font-semibold text-sm hover:bg-aubergine-light transition-all disabled:opacity-60"
              >
                {savingEmail
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
                  : "Save email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
