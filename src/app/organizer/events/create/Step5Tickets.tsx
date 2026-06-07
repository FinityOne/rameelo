"use client";

import type { EventFormData, TicketTier } from "./types";
import { EMPTY_TIER } from "./types";

const PLATFORM_FEE_PCT = 0.03;
const CARD_FEE_PCT     = 0.05;

function feeBreakdown(price: number) {
  const platform = +(price * PLATFORM_FEE_PCT).toFixed(2);
  const payment  = +(price * CARD_FEE_PCT).toFixed(2);
  return { platform, payment, total: +(platform + payment).toFixed(2), buyerPays: +(price + platform + payment).toFixed(2) };
}

function groupPrice(price: number, type: 'percentage' | 'fixed', val: number) {
  if (type === 'percentage') return Math.max(0, +(price * (1 - val / 100)).toFixed(2));
  return Math.max(0, +(price - val).toFixed(2));
}

type Props = {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
};

function TierCard({ tier, idx, total, onChange, onRemove }: {
  tier: TicketTier; idx: number; total: number;
  onChange: (patch: Partial<TicketTier>) => void;
  onRemove: () => void;
}) {
  const price = parseFloat(tier.price) || 0;
  const fees = feeBreakdown(price);
  const hasSimpleDiscount = tier.groupDiscountEnabled && tier.groupDiscountMode === 'simple' && tier.groupDiscountValue && tier.groupDiscountMinQty;
  const hasScalingDiscount = tier.groupDiscountEnabled && tier.groupDiscountMode === 'scaling';
  const discountedPrice = hasSimpleDiscount
    ? groupPrice(price, tier.groupDiscountType, parseFloat(tier.groupDiscountValue) || 0)
    : null;
  const discountedFees = discountedPrice !== null ? feeBreakdown(discountedPrice) : null;

  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-1.5";

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-ivory border-b border-ivory-200">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-aubergine/10 border border-aubergine/20 flex items-center justify-center">
            <span className="font-display font-bold text-aubergine text-xs">{idx + 1}</span>
          </div>
          <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>
            {tier.name || `Ticket Tier ${idx + 1}`}
          </p>
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove} className="w-7 h-7 rounded-full hover:bg-durga/10 flex items-center justify-center text-ink-muted hover:text-durga transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Name + Price + Quantity */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className={labelCls}>Tier Name *</label>
            <input type="text" placeholder="General Admission" value={tier.name} onChange={e => onChange({ name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Price (USD) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-ui text-sm text-ink-muted">$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={tier.price}
                onChange={e => onChange({ price: e.target.value })}
                className={`${inputCls} pl-7`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Total Qty *</label>
            <input type="number" min="1" placeholder="500" value={tier.quantity} onChange={e => onChange({ quantity: e.target.value })} className={inputCls} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <input type="text" placeholder="e.g. Includes floor access + welcome drink" value={tier.description} onChange={e => onChange({ description: e.target.value })} className={inputCls} />
        </div>

        {/* Sale window */}
        <div>
          <label className={labelCls}>Sale Window</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[9px] text-ink-muted/70 mb-1">Starts</p>
              <input type="date" value={tier.saleStartDate} onChange={e => onChange({ saleStartDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <p className="font-mono text-[9px] text-ink-muted/70 mb-1">Ends</p>
              <input type="date" value={tier.saleEndDate} onChange={e => onChange({ saleEndDate: e.target.value })} className={inputCls} />
            </div>
          </div>
          <p className="mt-1.5 font-mono text-[9px] text-ink-muted/60">Leave blank to keep on sale until the event</p>
        </div>

        {/* Group discount */}
        <div className="rounded-xl bg-ivory border border-ivory-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-ui font-semibold text-ink text-sm">Group discount</p>
              <p className="font-ui text-xs text-ink-muted">Reward groups who buy together</p>
            </div>
            <button type="button" onClick={() => onChange({ groupDiscountEnabled: !tier.groupDiscountEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${tier.groupDiscountEnabled ? 'bg-aubergine' : 'bg-ivory-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${tier.groupDiscountEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {tier.groupDiscountEnabled && (
            <div className="space-y-4 pt-1">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'simple', label: 'Flat group rate', desc: 'Buy N+ tickets → flat % or $ off each' },
                  { value: 'scaling', label: 'Scaling tiers', desc: '5–7: 10% · 8–9: 12% · 10+: 15%' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ groupDiscountMode: opt.value })}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${tier.groupDiscountMode === opt.value ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 bg-white hover:border-aubergine/30'}`}
                  >
                    <p className={`font-ui text-xs font-semibold ${tier.groupDiscountMode === opt.value ? 'text-aubergine' : 'text-ink'}`}>{opt.label}</p>
                    <p className="font-mono text-[9px] text-ink-muted mt-0.5 leading-tight">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Simple mode fields */}
              {tier.groupDiscountMode === 'simple' && (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Min tickets</label>
                    <input type="number" min="2" placeholder="5" value={tier.groupDiscountMinQty} onChange={e => onChange({ groupDiscountMinQty: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Discount type</label>
                    <select value={tier.groupDiscountType} onChange={e => onChange({ groupDiscountType: e.target.value as 'percentage' | 'fixed' })}
                      className={`${inputCls} cursor-pointer`}>
                      <option value="percentage">% off</option>
                      <option value="fixed">$ off per ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{tier.groupDiscountType === 'percentage' ? 'Percent off' : 'Dollars off'}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-ui text-sm text-ink-muted">
                        {tier.groupDiscountType === 'percentage' ? '%' : '$'}
                      </span>
                      <input type="number" min="0" step="0.01" placeholder="10" value={tier.groupDiscountValue}
                        onChange={e => onChange({ groupDiscountValue: e.target.value })} className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Scaling mode — custom percentage levels (% only) */}
              {tier.groupDiscountMode === 'scaling' && (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] text-ink-muted">Set your own levels. The highest one the group reaches applies. Percentage-only.</p>
                  {tier.groupDiscountTiers.map((lvl, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className={labelCls}>Min tickets</label>
                        <input type="number" min="2" placeholder="5" value={lvl.minQty}
                          onChange={e => onChange({ groupDiscountTiers: tier.groupDiscountTiers.map((l, j) => j === i ? { ...l, minQty: e.target.value } : l) })}
                          className={inputCls} />
                      </div>
                      <div className="flex-1">
                        <label className={labelCls}>% off</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-ui text-sm text-ink-muted">%</span>
                          <input type="number" min="0" max="100" placeholder="10" value={lvl.percent}
                            onChange={e => onChange({ groupDiscountTiers: tier.groupDiscountTiers.map((l, j) => j === i ? { ...l, percent: e.target.value } : l) })}
                            className={`${inputCls} pl-7`} />
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => onChange({ groupDiscountTiers: tier.groupDiscountTiers.filter((_, j) => j !== i) })}
                        className="mb-0.5 w-10 h-10 rounded-xl border border-ivory-200 flex items-center justify-center text-durga hover:bg-durga/5 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => {
                      const last = tier.groupDiscountTiers[tier.groupDiscountTiers.length - 1];
                      const nextQty = last ? (parseInt(last.minQty) || 4) + 2 : 5;
                      onChange({ groupDiscountTiers: [...tier.groupDiscountTiers, { minQty: String(nextQty), percent: '15' }] });
                    }}
                    className="w-full py-2 rounded-xl border border-dashed border-aubergine/40 font-ui text-xs text-aubergine hover:bg-aubergine/5 transition-all">
                    + Add level
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transparent pricing preview */}
        {price > 0 && (
          <div className="rounded-xl border border-aubergine/15 bg-aubergine/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-aubergine/60">What your attendee sees at checkout</p>
              <p className="font-mono text-[9px] text-peacock font-bold">You receive: ${price.toFixed(2)}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-ui text-sm">
                <span className="text-ink-muted">Ticket price</span>
                <span className="text-ink font-medium">${price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-ui text-xs">
                <span className="text-ink-muted">Rameelo service fee</span>
                <span className="text-ink-muted">${fees.platform}</span>
              </div>
              <div className="flex justify-between font-ui text-xs">
                <span className="text-ink-muted">Payment processing</span>
                <span className="text-ink-muted">${fees.payment}</span>
              </div>
              <div className="border-t border-aubergine/15 pt-1.5 flex justify-between font-ui text-sm font-semibold">
                <span className="text-ink">Total per ticket</span>
                <span className="text-aubergine">${fees.buyerPays}</span>
              </div>

              {discountedPrice !== null && discountedFees && (
                <div className="border-t border-aubergine/15 pt-2 mt-1">
                  <p className="font-mono text-[9px] text-marigold-dark uppercase tracking-widest mb-1.5">
                    With group discount ({tier.groupDiscountMinQty}+ tickets)
                  </p>
                  <div className="flex justify-between font-ui text-sm font-semibold">
                    <span className="text-ink">Discounted total</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-ink-muted text-xs font-normal">${fees.buyerPays}</span>
                      <span className="text-peacock">${discountedFees.buyerPays}</span>
                    </div>
                  </div>
                </div>
              )}
              {hasScalingDiscount && (
                <div className="border-t border-aubergine/15 pt-2 mt-1">
                  <p className="font-mono text-[9px] text-marigold-dark uppercase tracking-widest mb-1.5">Scaling group discount</p>
                  {tier.groupDiscountTiers
                    .map(l => ({ min: parseInt(l.minQty) || 0, pct: parseInt(l.percent) || 0 }))
                    .filter(l => l.min > 0 && l.pct > 0)
                    .sort((a, b) => a.min - b.min)
                    .map(({ min, pct }) => {
                      const dp = groupPrice(price, 'percentage', pct);
                      const df = feeBreakdown(dp);
                      return (
                        <div key={min} className="flex justify-between font-ui text-xs text-ink-muted">
                          <span>{min}+ tickets ({pct}% off)</span>
                          <span className="text-peacock font-semibold">${df.buyerPays}/ea</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Step5Tickets({ data, onChange }: Props) {
  function updateTier(idx: number, patch: Partial<TicketTier>) {
    const tiers = data.ticketTiers.map((t, i) => i === idx ? { ...t, ...patch } : t);
    onChange({ ticketTiers: tiers });
  }

  function removeTier(idx: number) {
    onChange({ ticketTiers: data.ticketTiers.filter((_, i) => i !== idx) });
  }

  function addTier() {
    if (data.ticketTiers.length >= 6) return;
    onChange({ ticketTiers: [...data.ticketTiers, EMPTY_TIER()] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-ui text-ink-muted text-sm">{data.ticketTiers.length} of 6 tiers · Each tier can have unique pricing and group discounts</p>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mr-2">Total Capacity</label>
          <input
            type="number" min="1" placeholder="Unlimited"
            value={data.capacity}
            onChange={e => onChange({ capacity: e.target.value })}
            className="w-28 rounded-xl border border-ivory-200 bg-white px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40"
          />
        </div>
      </div>

      {data.ticketTiers.map((tier, idx) => (
        <TierCard
          key={tier.tempId}
          tier={tier}
          idx={idx}
          total={data.ticketTiers.length}
          onChange={(patch) => updateTier(idx, patch)}
          onRemove={() => removeTier(idx)}
        />
      ))}

      {data.ticketTiers.length < 6 && (
        <button
          type="button"
          onClick={addTier}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-ivory-200 text-ink-muted font-ui font-medium text-sm hover:border-aubergine/40 hover:text-aubergine hover:bg-aubergine/5 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add ticket tier
        </button>
      )}

      <div className="rounded-xl bg-ivory border border-ivory-200 p-4 flex gap-3">
        <span className="text-lg shrink-0">💡</span>
        <p className="font-ui text-xs text-ink-muted leading-relaxed">
          <strong className="text-ink">Pro tip:</strong> Add an "Early Bird" tier at a lower price with a sale end date to drive urgency. Group discounts auto-apply at checkout when buyers meet the minimum quantity.
        </p>
      </div>
    </div>
  );
}
