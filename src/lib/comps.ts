import { createClient } from "@/lib/supabase/client";

export interface CompResult {
  orderId: string;
  recipientExists: boolean;
  recipientAccountName: string | null;
  tierName: string;
  qty: number;
}

// Issues complimentary ($0, no-Stripe) tickets for an event via the comp_event_tickets
// RPC, which enforces that the caller owns the event (organizer or org admin) and that
// the tier has enough remaining inventory. The order is tagged order_type='comp' so it
// never mixes with the purchase flow, and is attached to the recipient's account if one
// exists (otherwise claimed by email on their next sign-in).
export async function compEventTickets(params: {
  eventId: string;
  tierId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  qty: number;
  note?: string;
}): Promise<{ result: CompResult | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("comp_event_tickets", {
    p_event_id: params.eventId,
    p_tier_id: params.tierId,
    p_first: params.firstName,
    p_last: params.lastName,
    p_email: params.email,
    p_phone: params.phone ?? "",
    p_qty: params.qty,
    p_note: params.note ?? null,
  });

  if (error) return { result: null, error: error.message };
  const d = data as {
    order_id: string; recipient_exists: boolean; recipient_account_name: string | null;
    tier_name: string; qty: number;
  };
  return {
    result: {
      orderId: d.order_id,
      recipientExists: d.recipient_exists,
      recipientAccountName: d.recipient_account_name,
      tierName: d.tier_name,
      qty: d.qty,
    },
    error: null,
  };
}
