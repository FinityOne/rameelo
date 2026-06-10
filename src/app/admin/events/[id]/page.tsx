"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "@/app/organizer/events/create/types";
import SalesReportTable from "@/components/SalesReportTable";
import { buildSalesReport, salesReportCSV, salesReportFilename } from "@/lib/sales-report";

type InterestSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  qty_interested: number;
  created_at: string;
};

type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  tier_id: string | null;
  qty: number;
  unit_price: number | null;
  discount_amount: number | null;
  rameelo_fee: number | null;
  processing_fee: number | null;
  grand_total: number;
  payment_method: string;
  status: string;
  is_test: boolean;
  dispute_status: string | null;
  created_at: string;
};

type TicketTier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  group_discount_mode: "simple" | "scaling" | null;
  group_discount_min_qty: number | null;
  group_discount_type: string | null;
  group_discount_value: number | null;
  group_discount_tiers: { min_qty: number; percent: number }[] | null;
};

type EventFull = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  artist: string | null;
  navratri_nights: number[] | null;
  is_multi_day: boolean;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string | null;
  doors_open_time: string | null;
  venue_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string | null;
  parking: string;
  parking_notes: string | null;
  website_url: string | null;
  cover_image_url: string | null;
  cover_gradient: string;
  dress_code: string;
  dress_code_details: string | null;
  dandiya_sticks: string;
  age_restriction: string;
  capacity: number | null;
  status: string;
  selling_on_rameelo: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  ticket_tiers: TicketTier[];
  organizer: { first_name: string | null; last_name: string | null; email: string; phone: string | null; city: string | null; state: string | null } | null;
};

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  draft:          { label: 'Draft',       cls: 'bg-ivory-200 text-ink-muted',     icon: '📝' },
  pending_review: { label: 'In Review',   cls: 'bg-marigold/20 text-[#a06b00]',   icon: '🔍' },
  published:      { label: 'Published',   cls: 'bg-peacock/15 text-peacock',       icon: '✅' },
  rejected:       { label: 'Rejected',    cls: 'bg-durga/15 text-durga',           icon: '❌' },
  cancelled:      { label: 'Cancelled',   cls: 'bg-ivory-200 text-ink-muted',     icon: '🚫' },
};

const CATEGORY_LABELS: Record<string, string> = {
  garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
};

const DRESS_LABELS: Record<string, string> = {
  none: 'No requirement', encouraged: 'Traditional attire encouraged', required: 'Traditional attire required',
};
const DANDIYA_LABELS: Record<string, string> = {
  not_applicable: 'Not applicable', provided: 'Sticks provided', byod: 'Bring your own',
};
const PARKING_LABELS: Record<string, string> = {
  free: 'Free', paid_nearby: 'Paid nearby', street: 'Street', valet: 'Valet', limited: 'Limited', none: 'None',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTS(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmt12(t: string | null) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted shrink-0">{label}</span>
      <span className="font-ui text-sm text-ink text-right">{value}</span>
    </div>
  );
}

type DecisionModal = { type: 'reject' | 'unpublish'; note: string };

export default function AdminEventReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent]     = useState<EventFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [modal, setModal]     = useState<DecisionModal | null>(null);
  const [done, setDone]       = useState<'approved' | 'rejected' | null>(null);
  const [togglingRameelo, setTogglingRameelo] = useState(false);
  const [interests, setInterests] = useState<InterestSubmission[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [togglingOrderId, setTogglingOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // Fetch event, interest submissions, and orders in parallel — they're
      // independent, so there's no reason to wait for one before the next.
      const [eventRes, interestRes, orderRes] = await Promise.all([
        supabase
          .from('events')
          .select(`
            id, title, category, description, artist, navratri_nights, is_multi_day,
            start_date, end_date, start_time, end_time, doors_open_time,
            venue_name, address_line1, address_line2, city, state, zip,
            parking, parking_notes, website_url,
            cover_image_url, cover_gradient,
            dress_code, dress_code_details, dandiya_sticks, age_restriction,
            capacity, status, selling_on_rameelo, review_note, reviewed_at, created_at,
            ticket_tiers (id, name, price, quantity, description, sale_start_date, sale_end_date, group_discount_mode, group_discount_min_qty, group_discount_type, group_discount_value, group_discount_tiers),
            organizer:profiles!events_organizer_id_fkey (first_name, last_name, email, phone, city, state)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('event_interests')
          .select('id, name, email, phone, city, qty_interested, created_at')
          .eq('event_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, buyer_name, buyer_email, tier_id, qty, unit_price, discount_amount, rameelo_fee, processing_fee, grand_total, payment_method, status, is_test, dispute_status, created_at')
          .eq('event_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (!eventRes.data) { router.replace('/admin/events'); return; }
      setEvent(eventRes.data as unknown as EventFull);
      setInterests((interestRes.data ?? []) as InterestSubmission[]);
      setOrders((orderRes.data ?? []) as OrderRow[]);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function approve() {
    setActing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('events').update({
      status: 'published',
      review_note: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq('id', id);
    setDone('approved');
    setActing(false);
    setEvent(prev => prev ? { ...prev, status: 'published', review_note: null } : prev);
  }

  async function reject() {
    if (!modal || !modal.note.trim()) return;
    setActing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('events').update({
      status: 'rejected',
      review_note: modal.note.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq('id', id);
    setModal(null);
    setDone('rejected');
    setActing(false);
    setEvent(prev => prev ? { ...prev, status: 'rejected', review_note: modal.note.trim() } : prev);
  }

  async function unpublish() {
    if (!modal) return;
    setActing(true);
    const supabase = createClient();
    await supabase.from('events').update({
      status: 'draft',
      review_note: modal.note.trim() || null,
    }).eq('id', id);
    setModal(null);
    setActing(false);
    setEvent(prev => prev ? { ...prev, status: 'draft', review_note: modal.note.trim() || null } : prev);
  }

  async function toggleSellingOnRameelo() {
    if (!event) return;
    setTogglingRameelo(true);
    const supabase = createClient();
    const next = !event.selling_on_rameelo;
    await supabase.from('events').update({ selling_on_rameelo: next }).eq('id', id);
    setEvent(prev => prev ? { ...prev, selling_on_rameelo: next } : prev);
    setTogglingRameelo(false);
  }

  async function toggleOrderTest(order: OrderRow) {
    setTogglingOrderId(order.id);
    const supabase = createClient();
    const next = !order.is_test;
    const { error } = await supabase.from('orders').update({ is_test: next }).eq('id', order.id);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, is_test: next } : o));
    }
    setTogglingOrderId(null);
  }

  // Build the sales report from the event's tiers + orders, memoized so it's only
  // recomputed when that data changes (money rules — test/refunded/disputed
  // excluded from revenue — are enforced inside buildSalesReport).
  const report = useMemo(() => {
    if (!event) return null;
    return buildSalesReport(
      {
        title: event.title,
        venue_name: event.venue_name,
        city: event.city,
        state: event.state,
        start_date: event.start_date,
        status: event.status,
        selling_on_rameelo: event.selling_on_rameelo,
      },
      event.ticket_tiers.map(t => ({
        id: t.id, name: t.name, price: t.price, quantity: t.quantity,
        sale_start_date: t.sale_start_date, sale_end_date: t.sale_end_date,
      })),
      orders.map(o => ({
        tier_id: o.tier_id, qty: o.qty, unit_price: o.unit_price,
        discount_amount: o.discount_amount, rameelo_fee: o.rameelo_fee,
        processing_fee: o.processing_fee, grand_total: o.grand_total,
        status: o.status, is_test: o.is_test, dispute_status: o.dispute_status,
      })),
    );
  }, [event, orders]);

  function downloadSalesCsv() {
    if (!report) return;
    const blob = new Blob([salesReportCSV(report)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = salesReportFilename(report, "csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }
  if (!event || !report) return null;

  const gradient   = GRADIENTS.find(g => g.id === event.cover_gradient) ?? GRADIENTS[0];
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.draft;
  const organizer  = event.organizer;
  const orgName    = [organizer?.first_name, organizer?.last_name].filter(Boolean).join(' ') || '—';
  const totalQty   = event.ticket_tiers.reduce((s, t) => s + t.quantity, 0);
  const minPrice   = event.ticket_tiers.length ? Math.min(...event.ticket_tiers.map(t => t.price)) : 0;
  const maxPrice   = event.ticket_tiers.length ? Math.max(...event.ticket_tiers.map(t => t.price)) : 0;
  const isPending  = event.status === 'pending_review';
  const isPublished = event.status === 'published';
  const isDraft    = event.status === 'draft';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb + Edit button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={isPending ? "/admin/events/review" : "/admin/events"} className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {isPending ? "Review Queue" : "All Events"}
          </Link>
          <span className="text-ink-muted/40 text-xs">/</span>
          <span className="font-ui text-xs text-ink-muted truncate max-w-[200px]">{event.title}</span>
        </div>
        <Link
          href={`/admin/events/${id}/edit`}
          className="flex items-center gap-1.5 shrink-0 font-ui font-semibold text-xs px-3.5 py-2 rounded-xl border border-ivory-200 bg-white text-ink-muted hover:text-aubergine hover:border-aubergine/30 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit event
        </Link>
      </div>

      {/* Success banner */}
      {done === 'approved' && (
        <div className="rounded-2xl bg-peacock/10 border border-peacock/25 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-ui font-semibold text-peacock text-sm">Event published</p>
            <p className="font-ui text-xs text-ink-muted">This event is now live and visible to the public.</p>
          </div>
          <Link href="/admin/events/review" className="ml-auto font-ui text-xs text-aubergine hover:underline shrink-0">← Back to queue</Link>
        </div>
      )}
      {done === 'rejected' && (
        <div className="rounded-2xl bg-durga/8 border border-durga/20 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className="font-ui font-semibold text-durga text-sm">Event rejected</p>
            <p className="font-ui text-xs text-ink-muted">The organizer has been notified with your feedback.</p>
          </div>
          <Link href="/admin/events/review" className="ml-auto font-ui text-xs text-aubergine hover:underline shrink-0">← Back to queue</Link>
        </div>
      )}

      {/* Hero cover */}
      <div className="rounded-2xl overflow-hidden border border-ivory-200">
        <div className="h-44 relative" style={{ background: event.cover_image_url ? undefined : gradient.css }}>
          {event.cover_image_url && <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mb-1">
                {CATEGORY_LABELS[event.category] ?? event.category}
                {event.artist ? ` · ${event.artist}` : ''}
              </p>
              <p className="font-display font-bold text-white text-2xl leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>{event.title}</p>
            </div>
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusMeta.cls}`}>
              {statusMeta.icon} {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Submission meta strip */}
        <div className="bg-white px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-ivory-200 text-xs font-ui text-ink-muted">
          <span>Submitted {fmtTS(event.created_at)}</span>
          {event.reviewed_at && <span>Reviewed {fmtTS(event.reviewed_at)}</span>}
          <span>{event.city}, {event.state} · {fmtDate(event.start_date)}</span>
          {event.ticket_tiers.length > 0 && (
            <span>{event.ticket_tiers.length} tier{event.ticket_tiers.length > 1 ? 's' : ''} · {totalQty.toLocaleString()} tickets · ${minPrice}{maxPrice > minPrice ? `–$${maxPrice}` : ''}</span>
          )}
        </div>
      </div>

      {/* Decision panel — review queue, draft publish, or published controls */}
      {(isPending || isPublished || isDraft) && !done && (
        <div className={`rounded-2xl border p-5 space-y-4 ${(isPending || isDraft) ? 'bg-marigold/6 border-marigold/25' : 'bg-white border-ivory-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${(isPending || isDraft) ? 'bg-marigold/20' : 'bg-peacock/10'}`}>
              {isPublished ? '✅' : isPending ? '🔍' : '📝'}
            </div>
            <div>
              <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: '-0.015em' }}>
                {isPublished ? 'Event is published' : isPending ? 'Review this event' : 'Publish this event'}
              </p>
              <p className="font-ui text-xs text-ink-muted">
                {isPublished
                  ? 'You can unpublish this event if needed.'
                  : isPending
                    ? 'Approve to make it live, or reject with feedback for the organizer.'
                    : 'This event is a draft. Publish it to make it live and visible to the public.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {(isPending || isDraft) && (
              <button onClick={approve} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-peacock text-white font-display font-bold text-sm hover:bg-peacock/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm">
                {acting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
                Publish event
              </button>
            )}
            {isPending && (
              <button onClick={() => setModal({ type: 'reject', note: '' })} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-durga/30 text-durga font-display font-bold text-sm hover:bg-durga/5 active:scale-[0.98] transition-all disabled:opacity-60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Reject with feedback
              </button>
            )}
            {isPublished && (
              <button onClick={() => setModal({ type: 'unpublish', note: '' })} disabled={acting}
                className="px-5 py-3 rounded-xl border border-ivory-200 text-ink-muted font-ui font-semibold text-sm hover:border-durga/30 hover:text-durga transition-all">
                Unpublish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ticketing mode toggle — only for published events */}
      {isPublished && !done && (
        <div className="rounded-2xl border border-ivory-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${event.selling_on_rameelo ? 'bg-peacock/10' : 'bg-marigold/10'}`}>
                {event.selling_on_rameelo ? '🎟️' : '👀'}
              </div>
              <div>
                <p className="font-display font-bold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>
                  {event.selling_on_rameelo ? 'Selling tickets on Rameelo' : 'Interest collection only'}
                </p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">
                  {event.selling_on_rameelo
                    ? 'Attendees can purchase tickets directly. Toggle off if the organizer hasn\'t joined yet.'
                    : 'Event is visible but shows an interest form instead of ticket purchase. Flip on when the organizer is ready.'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleSellingOnRameelo}
              disabled={togglingRameelo}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-all duration-200 ${event.selling_on_rameelo ? 'bg-peacock' : 'bg-ivory-200'} ${togglingRameelo ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${event.selling_on_rameelo ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Rejection note display */}
      {event.review_note && event.status === 'rejected' && (
        <div className="rounded-2xl bg-durga/8 border border-durga/20 px-5 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-durga mb-2">Rejection feedback sent to organizer</p>
          <p className="font-ui text-sm text-ink leading-relaxed">{event.review_note}</p>
          {!done && (
            <button onClick={approve} disabled={acting}
              className="mt-3 flex items-center gap-1.5 font-ui text-sm text-peacock font-semibold hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Approve anyway
            </button>
          )}
        </div>
      )}

      {/* Organizer card */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Organizer</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-aubergine flex items-center justify-center text-white font-display font-bold shrink-0">
            {(organizer?.first_name?.[0] ?? '') + (organizer?.last_name?.[0] ?? '') || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>{orgName}</p>
            <p className="font-ui text-xs text-ink-muted">{organizer?.email}</p>
            {(organizer?.city || organizer?.state) && (
              <p className="font-ui text-xs text-ink-muted/70">{[organizer.city, organizer.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          {organizer?.phone && (
            <p className="font-mono text-xs text-ink-muted shrink-0">{organizer.phone}</p>
          )}
        </div>
      </div>

      {/* Event details */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Basics */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Event Basics</p>
          </div>
          <div className="px-5 py-4">
            <Row label="Type"        value={CATEGORY_LABELS[event.category]} />
            <Row label="Artist"      value={event.artist} />
            <Row label="Description" value={event.description ? event.description.slice(0, 160) + (event.description.length > 160 ? '…' : '') : null} />
            <Row label="Navratri"    value={event.navratri_nights?.length ? `Night${event.navratri_nights.length > 1 ? 's' : ''} ${event.navratri_nights.join(', ')}` : null} />
            <Row label="Age"         value={event.age_restriction === 'all' ? 'All ages' : event.age_restriction} />
            <Row label="Dress Code"  value={DRESS_LABELS[event.dress_code]} />
            <Row label="Dandiya"     value={DANDIYA_LABELS[event.dandiya_sticks]} />
            {event.capacity && <Row label="Capacity" value={event.capacity.toLocaleString()} />}
          </div>
        </div>

        {/* Schedule & Venue */}
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Schedule & Venue</p>
          </div>
          <div className="px-5 py-4">
            <Row label="Date"    value={fmtDate(event.start_date) + (event.end_date ? ` – ${fmtDate(event.end_date)}` : '')} />
            <Row label="Doors"   value={fmt12(event.doors_open_time)} />
            <Row label="Start"   value={fmt12(event.start_time)} />
            <Row label="End"     value={event.end_time ? fmt12(event.end_time) : null} />
            <Row label="Venue"   value={event.venue_name} />
            <Row label="Address" value={[event.address_line1, event.address_line2].filter(Boolean).join(', ')} />
            <Row label="City"    value={[event.city, event.state, event.zip].filter(Boolean).join(' ')} />
            <Row label="Parking" value={PARKING_LABELS[event.parking] + (event.parking_notes ? ` · ${event.parking_notes}` : '')} />
            <Row label="Website" value={event.website_url} />
          </div>
        </div>
      </div>

      {/* Ticket tiers */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Ticket Tiers</p>
          <p className="font-mono text-[10px] text-ink-muted">{event.ticket_tiers.length} tier{event.ticket_tiers.length !== 1 ? 's' : ''} · {totalQty.toLocaleString()} total capacity</p>
        </div>
        <div className="divide-y divide-ivory-200">
          {event.ticket_tiers.length === 0 ? (
            <p className="px-5 py-4 font-ui text-sm text-ink-muted">No ticket tiers defined.</p>
          ) : event.ticket_tiers.map(tier => (
            <div key={tier.id} className="px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-display font-semibold text-ink text-sm">{tier.name}</p>
                  {(tier.group_discount_min_qty || (tier.group_discount_tiers?.length ?? 0) > 0) && (
                    <span className="font-mono text-[8px] uppercase tracking-widest bg-peacock/10 text-peacock px-1.5 py-0.5 rounded-full">
                      {tier.group_discount_mode === "scaling" ? "Scaling discount" : "Group discount"}
                    </span>
                  )}
                </div>
                {tier.description && <p className="font-ui text-xs text-ink-muted">{tier.description}</p>}
                {(tier.sale_start_date || tier.sale_end_date) && (
                  <p className="font-mono text-[9px] text-ink-muted mt-1">
                    On sale: {tier.sale_start_date ? fmtDate(tier.sale_start_date) : '…'} → {tier.sale_end_date ? fmtDate(tier.sale_end_date) : 'event'}
                  </p>
                )}
                {tier.group_discount_mode === "scaling" && (tier.group_discount_tiers?.length ?? 0) > 0 ? (
                  <p className="font-mono text-[9px] text-ink-muted mt-0.5">
                    Scaling: {[...tier.group_discount_tiers!].sort((a, b) => a.min_qty - b.min_qty).map(l => `${l.min_qty}+→${l.percent}%`).join(" · ")}
                  </p>
                ) : tier.group_discount_min_qty && tier.group_discount_value ? (
                  <p className="font-mono text-[9px] text-ink-muted mt-0.5">
                    Group: {tier.group_discount_type === 'percentage' ? `${tier.group_discount_value}% off` : `$${tier.group_discount_value} off`} for {tier.group_discount_min_qty}+
                  </p>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-ink text-base">${tier.price.toFixed(2)}</p>
                <p className="font-mono text-[10px] text-ink-muted">{tier.quantity.toLocaleString()} tickets</p>
              </div>
            </div>
          ))}
        </div>
        {event.ticket_tiers.length > 0 && (
          <div className="px-5 py-3 bg-ivory border-t border-ivory-200 flex justify-between">
            <span className="font-mono text-[10px] text-ink-muted">Projected gross (sold out)</span>
            <span className="font-mono text-[10px] font-bold text-ink">
              ${event.ticket_tiers.reduce((s, t) => s + t.price * t.quantity, 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Sales Report — per-tier financials, black & white ── */}
      <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Sales Report</p>
            <p className="font-ui text-[11px] text-ink-muted/70 mt-0.5">Face-value revenue by tier · test, refunded &amp; disputed orders excluded</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={downloadSalesCsv}
              title="Download as CSV (opens in Excel)"
              className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-2 rounded-xl border border-ink/15 bg-white text-ink hover:border-ink/40 hover:bg-ivory transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              CSV
            </button>
            <Link
              href={`/admin/events/${id}/report`}
              title="Open the printable sales report"
              className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-2 rounded-xl bg-ink text-white hover:bg-ink/85 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print view
            </Link>
          </div>
        </div>

        <SalesReportTable report={report} />
      </div>

      {/* Orders */}
      {orders.length > 0 && (() => {
        const testCount = orders.filter(o => o.is_test).length;
        const liveOrders = orders.filter(o => !o.is_test);
        const liveRevenue = liveOrders.reduce((s, o) => s + o.grand_total, 0);
        const liveTickets = liveOrders.reduce((s, o) => s + o.qty, 0);
        return (
          <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Orders</p>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-ink-muted">
                  {orders.length} order{orders.length !== 1 ? 's' : ''}
                </span>
                {testCount > 0 && (
                  <span className="font-mono text-[10px] font-bold text-marigold-dark">
                    {testCount} test
                  </span>
                )}
              </div>
            </div>

            {/* Summary (live only) */}
            <div className="px-5 py-3.5 grid grid-cols-3 gap-4 border-b border-ivory-200 bg-ivory/50">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Live orders</p>
                <p className="font-display font-bold text-ink text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                  {liveOrders.length}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Live tickets</p>
                <p className="font-display font-bold text-aubergine text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                  {liveTickets.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Live revenue</p>
                <p className="font-display font-bold text-ink text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                  ${liveRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ivory-200">
                    <th className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Buyer</th>
                    <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden sm:table-cell">Email</th>
                    <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal text-right">Qty</th>
                    <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal text-right">Total</th>
                    <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden sm:table-cell">Method</th>
                    <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden md:table-cell">Placed</th>
                    <th className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal text-right">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {orders.map(o => (
                    <tr key={o.id} className={`transition-colors ${o.is_test ? 'bg-marigold/[0.04] hover:bg-marigold/[0.08]' : 'hover:bg-ivory/50'}`}>
                      <td className="px-5 py-3 font-ui text-sm text-ink font-medium">
                        <div className="flex items-center gap-2">
                          {o.buyer_name}
                          {o.is_test && (
                            <span className="font-mono text-[8px] uppercase tracking-widest bg-marigold/20 text-marigold-dark px-1.5 py-0.5 rounded-full">Test</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-ui text-xs text-ink-muted hidden sm:table-cell">{o.buyer_email}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-ink">{o.qty}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-ink">${o.grand_total.toFixed(2)}</td>
                      <td className="px-3 py-3 font-ui text-xs text-ink-muted hidden sm:table-cell uppercase">{o.payment_method}</td>
                      <td className="px-3 py-3 font-mono text-[10px] text-ink-muted hidden md:table-cell">{fmtTS(o.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => toggleOrderTest(o)}
                          disabled={togglingOrderId === o.id}
                          title={o.is_test ? 'Mark as a live order' : 'Mark as a test order'}
                          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest font-bold px-2.5 py-1.5 rounded-full border transition-all ${togglingOrderId === o.id ? 'opacity-50' : ''} ${
                            o.is_test
                              ? 'bg-marigold/15 text-marigold-dark border-marigold/30 hover:bg-marigold/25'
                              : 'bg-peacock/10 text-peacock border-peacock/25 hover:bg-peacock/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${o.is_test ? 'bg-marigold-dark' : 'bg-peacock'}`} />
                          {o.is_test ? 'Test' : 'Live'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 bg-ivory/50 border-t border-ivory-200">
              <p className="font-ui text-[11px] text-ink-muted">Test orders are excluded from live totals and labeled as test in the member portal.</p>
            </div>
          </div>
        );
      })()}

      {/* Interest form submissions */}
      {(interests.length > 0 || !event.selling_on_rameelo) && (
        <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-ivory border-b border-ivory-200 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Interest Form Submissions</p>
            {interests.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-ink-muted">
                  {interests.length} submission{interests.length !== 1 ? 's' : ''}
                </span>
                <span className="font-mono text-[10px] font-bold text-aubergine">
                  {interests.reduce((s, i) => s + i.qty_interested, 0).toLocaleString()} tickets wanted
                </span>
              </div>
            )}
          </div>

          {interests.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl mb-2">📬</p>
              <p className="font-ui text-sm text-ink-muted">No interest submissions yet.</p>
              <p className="font-ui text-xs text-ink-muted/60 mt-1">Submissions will appear here once attendees fill out the interest form.</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="px-5 py-3.5 grid grid-cols-3 gap-4 border-b border-ivory-200 bg-ivory/50">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total submissions</p>
                  <p className="font-display font-bold text-ink text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                    {interests.length}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Tickets wanted</p>
                  <p className="font-display font-bold text-aubergine text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                    {interests.reduce((s, i) => s + i.qty_interested, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Avg. per person</p>
                  <p className="font-display font-bold text-ink text-xl mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                    {(interests.reduce((s, i) => s + i.qty_interested, 0) / interests.length).toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-ivory-200">
                      <th className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Name</th>
                      <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal">Email</th>
                      <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden sm:table-cell">Phone</th>
                      <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden sm:table-cell">City</th>
                      <th className="px-3 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal text-right">Tickets</th>
                      <th className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted font-normal hidden md:table-cell">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200">
                    {interests.map(row => (
                      <tr key={row.id} className="hover:bg-ivory/50 transition-colors">
                        <td className="px-5 py-3 font-ui text-sm text-ink font-medium">{row.name}</td>
                        <td className="px-3 py-3 font-ui text-xs text-ink-muted">{row.email}</td>
                        <td className="px-3 py-3 font-ui text-xs text-ink-muted hidden sm:table-cell">{row.phone ?? '—'}</td>
                        <td className="px-3 py-3 font-ui text-xs text-ink-muted hidden sm:table-cell">{row.city ?? '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-mono text-sm font-bold text-aubergine">{row.qty_interested}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-ink-muted hidden md:table-cell">{fmtTS(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ivory-200 bg-ivory">
                      <td colSpan={4} className="px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-ink-muted">Total</td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-mono text-sm font-bold text-aubergine">
                          {interests.reduce((s, i) => s + i.qty_interested, 0)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Decision modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            {modal.type === 'reject' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-durga/10 border border-durga/20 flex items-center justify-center text-xl shrink-0">❌</div>
                  <div>
                    <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: '-0.015em' }}>Reject event</p>
                    <p className="font-ui text-xs text-ink-muted">Your feedback will be sent to the organizer.</p>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Reason / Feedback *</label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Missing venue address, ticket pricing seems incorrect, cover photo resolution too low…"
                    value={modal.note}
                    onChange={e => setModal({ ...modal, note: e.target.value })}
                    className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-durga/20 focus:border-durga/40 resize-none transition-all"
                  />
                  {!modal.note.trim() && (
                    <p className="mt-1.5 font-mono text-[9px] text-durga/70">Feedback is required to reject an event.</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">
                    Cancel
                  </button>
                  <button onClick={reject} disabled={!modal.note.trim() || acting}
                    className="flex-1 py-2.5 rounded-xl bg-durga text-white font-display font-bold text-sm hover:bg-durga/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {acting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Send rejection'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-ivory border border-ivory-200 flex items-center justify-center text-xl shrink-0">🚫</div>
                  <div>
                    <p className="font-display font-bold text-ink text-lg" style={{ letterSpacing: '-0.015em' }}>Unpublish event</p>
                    <p className="font-ui text-xs text-ink-muted">This will remove the event from the public listing immediately.</p>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-2">Note for organizer (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Reason for unpublishing…"
                    value={modal.note}
                    onChange={e => setModal({ ...modal, note: e.target.value })}
                    className="w-full rounded-xl border border-ivory-200 px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 resize-none transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-ivory-200 font-ui font-semibold text-sm text-ink-muted hover:bg-ivory transition-colors">
                    Cancel
                  </button>
                  <button onClick={unpublish} disabled={acting}
                    className="flex-1 py-2.5 rounded-xl bg-ink text-white font-display font-bold text-sm hover:bg-ink/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {acting ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Unpublish'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
