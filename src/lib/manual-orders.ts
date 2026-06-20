import { createClient } from "@/lib/supabase/client";

export interface ManualOrderResult {
  orderId: string;
  recipientExists: boolean;
  recipientAccountName: string | null;
  tierName: string;
  qty: number;
  total: number;
}

// Records a manual / offline order (cash, Zelle, at-the-door, etc.) via the
// create_manual_order RPC, which enforces the caller owns the event and stamps
// the order_type='manual' tag so the money is tracked SEPARATELY from Rameelo's
// online sales (no Stripe, no fees, excluded from Rameelo payouts). The order is
// attached to the customer's account if one exists; otherwise claimed by email on
// their next sign-in. No capacity cap or sale-window check — any tier, any amount.
export async function createManualOrder(params: {
  eventId: string;
  tierId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  qty: number;
  total: number;
}): Promise<{ result: ManualOrderResult | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_manual_order", {
    p_event_id: params.eventId,
    p_tier_id: params.tierId,
    p_first: params.firstName,
    p_last: params.lastName,
    p_email: params.email,
    p_phone: params.phone ?? "",
    p_qty: params.qty,
    p_total: params.total,
  });

  if (error) return { result: null, error: error.message };
  const d = data as {
    order_id: string; recipient_exists: boolean; recipient_account_name: string | null;
    tier_name: string; qty: number; total: number;
  };
  return {
    result: {
      orderId: d.order_id,
      recipientExists: d.recipient_exists,
      recipientAccountName: d.recipient_account_name,
      tierName: d.tier_name,
      qty: d.qty,
      total: Number(d.total),
    },
    error: null,
  };
}
