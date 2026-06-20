// Presentational sales-report grid — black & white, Excel-like. Rows of ticket
// tiers × columns of sold / revenue, with a summed TOTAL row, a fee memo strip,
// and a footnote. Pure render from a prebuilt SalesReport (see src/lib/sales-report.ts).
// Shared by the admin event page (preview) and the print-view page.

import { money } from "@/lib/money";
import type { SalesReport } from "@/lib/sales-report";

export default function SalesReportTable({ report }: { report: SalesReport }) {
  const t = report.totals;
  return (
    <div>
      {report.lines.length === 0 ? (
        <p className="px-5 py-6 font-ui text-sm text-ink-muted">No ticket tiers to report on yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="bg-ink text-white">
                <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Tier</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Unit Price</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Capacity</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Sold</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Remaining</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">% Sold</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Gross Face</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Discounts</th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider font-bold border border-ink">Net Revenue</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((l, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-ivory/60" : "bg-white"}>
                  <td className="px-3 py-2 text-left font-ui text-xs text-ink font-medium border border-ivory-200 whitespace-nowrap">{l.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">${money(l.price)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">{l.capacity.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">{l.sold.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted tabular-nums border border-ivory-200">{l.remaining.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted tabular-nums border border-ivory-200">{(l.pctSold * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">${money(l.grossFace)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted tabular-nums border border-ivory-200">{l.discounts > 0 ? `−$${money(l.discounts)}` : "$0.00"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink font-bold tabular-nums border border-ivory-200">${money(l.netRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white border-t-2 border-ink">
                <td className="px-3 py-2.5 text-left font-display font-bold text-xs text-ink border border-ink">{report.manualLines.length > 0 ? "ONLINE TOTAL" : "TOTAL"}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-muted border border-ink">—</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">{t.capacity.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">{t.sold.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">{t.remaining.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">{(t.pctSold * 100).toFixed(1)}%</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">${money(t.grossFace)}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">{t.discounts > 0 ? `−$${money(t.discounts)}` : "$0.00"}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">${money(t.netRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Manual / offline sales — settled by the organizer, NOT via Rameelo. Separate section. */}
      {report.manualLines.length > 0 && (() => {
        const m = report.manualTotals;
        const t = report.totals;
        return (
          <div className="px-5 pt-4 pb-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5">
              Manual / offline sales — settled directly by organizer (not via Rameelo)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <tbody>
                  {report.manualLines.map((l, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-ivory/60" : "bg-white"}>
                      <td className="px-3 py-2 text-left font-ui text-xs text-ink font-medium border border-ivory-200 whitespace-nowrap">{l.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">{l.sold.toLocaleString()} sold</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink tabular-nums border border-ivory-200">${money(l.grossFace)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-muted tabular-nums border border-ivory-200">{l.discounts > 0 ? `−$${money(l.discounts)}` : "$0.00"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink font-bold tabular-nums border border-ivory-200">${money(l.netRevenue)}</td>
                    </tr>
                  ))}
                  <tr className="bg-marigold/10 border-t border-marigold/30">
                    <td className="px-3 py-2.5 text-left font-display font-bold text-xs text-ink border border-marigold/30">MANUAL / OFFLINE TOTAL</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-marigold/30">{m.sold.toLocaleString()} sold</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-marigold/30">${money(m.grossFace)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-muted tabular-nums border border-marigold/30">{m.discounts > 0 ? `−$${money(m.discounts)}` : "$0.00"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-marigold/30">${money(m.netRevenue)}</td>
                  </tr>
                  <tr className="bg-white border-t-2 border-ink">
                    <td className="px-3 py-2.5 text-left font-display font-bold text-xs text-ink border border-ink" colSpan={4}>COMBINED TOTAL (online + offline)</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink font-bold tabular-nums border border-ink">${money(t.netRevenue + m.netRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Memo strip — fees collected from buyers + order counts */}
      <div className="px-5 py-3 bg-ivory/50 border-t border-ivory-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Rameelo fee (3%)</p>
          <p className="font-mono text-sm text-ink font-bold mt-0.5">${money(report.rameeloFees)}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Card processing</p>
          <p className="font-mono text-sm text-ink font-bold mt-0.5">${money(report.processingFees)}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Live orders</p>
          <p className="font-mono text-sm text-ink font-bold mt-0.5">{report.liveOrders.toLocaleString()}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Test (excluded)</p>
          <p className="font-mono text-sm text-marigold-dark font-bold mt-0.5">{report.testOrders.toLocaleString()}</p>
        </div>
      </div>
      <div className="px-5 py-2.5 bg-white border-t border-ivory-200">
        <p className="font-ui text-[11px] text-ink-muted/80">Net Revenue = Gross Face Value − Discounts. The 3% Rameelo fee and card fee are paid by buyers, never netted from organizer revenue. Test, refunded, cancelled &amp; disputed orders are excluded from revenue.</p>
      </div>
    </div>
  );
}
