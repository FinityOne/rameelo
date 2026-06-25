export type MissedTier = {
  name: string;
  quantity: number;
  quantitySold: number;
  soldOut: boolean;
  saleEndDate: string | null;
};

// Tiers that sold out AND can no longer be bought — admin-force-closed, or their
// sale window ran out while sold out. These are the "you missed it" tiers: a
// confirmed, permanent miss (not a temporary at-capacity blip that could reopen),
// so we surface the tier name as a sold-out tag on the home page for FOMO.
//
// Lives in its own plain module (no "use client") so both the client city cards
// and the server-rendered hero can import it without crossing a client boundary.
// Takes a bare tiers array so any event shape (home, /garba) can pass `e.tiers`.
export function missedTierNames(tiers: MissedTier[]): string[] {
  const now = Date.now();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tiers) {
    const isSold = t.soldOut || t.quantitySold >= t.quantity;
    if (!isSold) continue;
    const windowEnded = t.saleEndDate ? new Date(t.saleEndDate + "T23:59:59").getTime() < now : false;
    if (!t.soldOut && !windowEnded) continue; // still buyable / could reopen → not a confirmed miss
    const name = (t.name || "").trim();
    if (name && !seen.has(name.toLowerCase())) { seen.add(name.toLowerCase()); out.push(name); }
  }
  return out;
}
