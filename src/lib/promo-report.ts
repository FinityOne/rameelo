// Promo-code revenue breakdown for organizer reporting.
//
// A "promo order" is any order that redeemed a promo code (promo_code set).
// Net revenue nets the promo OUT of face value: orderRevenue everywhere is
// qty × unit_price − discount_amount, and a promo's dollars are folded into
// discount_amount — so the organizer is never credited full ticket face value
// for a discounted ticket. `discountGiven` isolates just the promo dollars for a
// clear "you gave away $X in promo discounts" line.

export type PromoOrderLike = {
  qty: number;
  unit_price: number | null;
  discount_amount: number | null;
  promo_code?: string | null;
  promo_discount_amount?: number | null;
};

export function isPromoOrder(o: PromoOrderLike): boolean {
  return (o.promo_code ?? "").trim() !== "";
}

export type PromoSummary = {
  orders: number;
  tickets: number;
  grossFace: number;      // qty × unit_price (before the promo discount)
  discountGiven: number;  // total $ taken off by promo codes
  netRevenue: number;     // organizer revenue after the promo (grossFace − discounts)
};

// Aggregate the promo-code orders out of a set of (already revenue-filtered) orders.
export function promoSummary(orders: PromoOrderLike[]): PromoSummary {
  return orders.filter(isPromoOrder).reduce<PromoSummary>((a, o) => {
    const qty = Number(o.qty) || 0;
    const gross = qty * (Number(o.unit_price) || 0);
    const fullDiscount = Number(o.discount_amount) || 0;   // keeps netRevenue == orderRevenue
    const promoDiscount = Number(o.promo_discount_amount) || 0;
    a.orders += 1;
    a.tickets += qty;
    a.grossFace += gross;
    a.discountGiven += promoDiscount;
    a.netRevenue += gross - fullDiscount;
    return a;
  }, { orders: 0, tickets: 0, grossFace: 0, discountGiven: 0, netRevenue: 0 });
}
