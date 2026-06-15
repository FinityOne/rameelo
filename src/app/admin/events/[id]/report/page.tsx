"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SalesReportTable from "@/components/SalesReportTable";
import { buildSalesReport, salesReportCSV, salesReportFilename } from "@/lib/sales-report";

type Tier = {
  id: string; name: string; price: number; quantity: number;
  sale_start_date: string | null; sale_end_date: string | null;
};
type Order = {
  tier_id: string | null; order_type: string; qty: number; unit_price: number | null; discount_amount: number | null;
  rameelo_fee: number | null; processing_fee: number | null; grand_total: number;
  status: string; is_test: boolean; dispute_status: string | null;
};
type Ev = {
  title: string; venue_name: string; city: string; state: string;
  start_date: string; status: string; selling_on_rameelo: boolean; ticket_tiers: Tier[];
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function SalesReportPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Ev | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Sales Report | Rameelo Admin";
    async function load() {
      const supabase = createClient();
      const [evRes, orderRes] = await Promise.all([
        supabase
          .from("events")
          .select("title, venue_name, city, state, start_date, status, selling_on_rameelo, ticket_tiers (id, name, price, quantity, sale_start_date, sale_end_date)")
          .eq("id", id)
          .single(),
        supabase
          .from("orders")
          .select("tier_id, order_type, qty, unit_price, discount_amount, rameelo_fee, processing_fee, grand_total, status, is_test, dispute_status")
          .eq("event_id", id),
      ]);
      if (!evRes.data) { router.replace(`/admin/events/${id}`); return; }
      setEvent(evRes.data as unknown as Ev);
      setOrders((orderRes.data ?? []) as Order[]);
      setLoading(false);
    }
    load();
  }, [id, router]);

  const report = useMemo(() => {
    if (!event) return null;
    return buildSalesReport(
      {
        title: event.title, venue_name: event.venue_name, city: event.city, state: event.state,
        start_date: event.start_date, status: event.status, selling_on_rameelo: event.selling_on_rameelo,
      },
      event.ticket_tiers.map(t => ({
        id: t.id, name: t.name, price: t.price, quantity: t.quantity,
        sale_start_date: t.sale_start_date, sale_end_date: t.sale_end_date,
      })),
      orders,
    );
  }, [event, orders]);

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([salesReportCSV(report)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = salesReportFilename(report, "csv");
    document.body.appendChild(a); a.click(); a.remove();
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* When printing, hide everything except #sales-report (incl. the admin nav). */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sales-report, #sales-report * { visibility: visible !important; }
          #sales-report { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 14mm; }
        }
      `}</style>

      {/* Toolbar — not printed */}
      <div className="print:hidden flex items-center justify-between gap-4 mb-6">
        <Link href={`/admin/events/${id}`} className="font-ui text-xs text-ink-muted hover:text-ink flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to event
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3.5 py-2 rounded-xl border border-ink/15 bg-white text-ink hover:border-ink/40 hover:bg-ivory transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3.5 py-2 rounded-xl bg-ink text-white hover:bg-ink/85 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* The report sheet — the only thing that prints */}
      <div id="sales-report" className="bg-white rounded-2xl border border-ivory-200 overflow-hidden print:border-0 print:rounded-none">
        <div className="px-5 py-5 border-b-2 border-ink flex items-start justify-between gap-4">
          <div>
            <p className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>
              Rameelo <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">· Event Sales Report</span>
            </p>
            <p className="font-display font-bold text-ink text-lg mt-2">{event.title}</p>
            <p className="font-ui text-sm text-ink-muted mt-0.5">
              {event.venue_name}, {event.city}, {event.state} · {fmtDate(event.start_date)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[10px] text-ink-muted">Generated</p>
            <p className="font-ui text-xs text-ink">{report.generatedAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            <p className="font-mono text-[10px] text-ink-muted mt-1.5">
              {event.status} · {event.selling_on_rameelo ? "Live on Rameelo" : "Interest only"}
            </p>
          </div>
        </div>

        <SalesReportTable report={report} />
      </div>
    </div>
  );
}
