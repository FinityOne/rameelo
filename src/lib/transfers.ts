import { createClient } from "@/lib/supabase/client";

export type TransferStatus = "pending" | "accepted" | "cancelled";

export interface TicketTransfer {
  id: string;
  orderId: string;
  fromUserId: string;
  toEmail: string;
  toUserId: string | null;
  toName: string | null;
  status: TransferStatus;
  token: string;
  qty: number;
  createdAt: string;
  acceptedAt: string | null;
}

export interface IncomingTransfer {
  id: string;
  token: string;
  qty: number;
  fromName: string;
  fromEmail: string;
  createdAt: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  city: string;
  tierName: string;
  orderId: string;
}

export interface UserLookup {
  exists: boolean;
  userId?: string;
  name?: string;
}

// Check if an email belongs to an existing Rameelo member
export async function lookupUserByEmail(email: string): Promise<UserLookup> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lookup_user_by_email", { p_email: email });
  if (error || !data) return { exists: false };
  return {
    exists: data.exists,
    userId: data.user_id ?? undefined,
    name: data.name ?? undefined,
  };
}

// Create a pending transfer for an order
export async function initiateTransfer(params: {
  orderId: string;
  fromUserId: string;
  toEmail: string;
  toName?: string;
  toUserId?: string;
  qty: number;
}): Promise<{ transferId: string | null; token: string | null; error: string | null }> {
  const supabase = createClient();

  // Cancel any existing pending transfer for this order first
  await supabase
    .from("ticket_transfers")
    .update({ status: "cancelled" })
    .eq("order_id", params.orderId)
    .eq("status", "pending");

  const { data, error } = await supabase
    .from("ticket_transfers")
    .insert({
      order_id: params.orderId,
      from_user_id: params.fromUserId,
      to_email: params.toEmail.toLowerCase().trim(),
      to_name: params.toName ?? null,
      to_user_id: params.toUserId ?? null,
      qty: params.qty,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (error) return { transferId: null, token: null, error: error.message };
  return { transferId: data.id, token: data.token, error: null };
}

// Cancel a pending transfer (sender)
export async function cancelTransfer(transferId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ticket_transfers")
    .update({ status: "cancelled" })
    .eq("id", transferId)
    .eq("status", "pending");
  return { error: error?.message ?? null };
}

// Accept a transfer via its token (calls security-definer RPC)
export async function acceptTransfer(token: string): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_ticket_transfer", { p_token: token });
  if (error) return { orderId: null, error: error.message };
  if (data?.error) return { orderId: null, error: data.error };
  return { orderId: data?.order_id ?? null, error: null };
}

// Load all outgoing transfers for a user (to decorate their order cards)
export async function loadOutgoingTransfers(userId: string): Promise<TicketTransfer[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select("id, order_id, from_user_id, to_email, to_user_id, to_name, status, token, qty, created_at, accepted_at")
    .eq("from_user_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  return (data ?? []).map(r => ({
    id: r.id,
    orderId: r.order_id,
    fromUserId: r.from_user_id,
    toEmail: r.to_email,
    toUserId: r.to_user_id,
    toName: r.to_name,
    status: r.status as TransferStatus,
    token: r.token,
    qty: r.qty,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
  }));
}

// Load incoming pending transfers addressed to a user's email
export async function loadIncomingTransfers(email: string): Promise<IncomingTransfer[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select(`
      id, token, qty, created_at,
      orders (
        id, buyer_name, buyer_email,
        events (title, start_date, venue_name, city),
        ticket_tiers (name)
      )
    `)
    .eq("to_email", email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as {
    id: string; token: string; qty: number; created_at: string;
    orders: {
      id: string; buyer_name: string; buyer_email: string;
      events: { title: string; start_date: string; venue_name: string; city: string } | null;
      ticket_tiers: { name: string } | null;
    } | null;
  }[]).map(r => ({
    id: r.id,
    token: r.token,
    qty: r.qty,
    fromName: r.orders?.buyer_name ?? "",
    fromEmail: r.orders?.buyer_email ?? "",
    createdAt: r.created_at,
    eventTitle: r.orders?.events?.title ?? "",
    eventDate: r.orders?.events?.start_date ?? "",
    venue: r.orders?.events?.venue_name ?? "",
    city: r.orders?.events?.city ?? "",
    tierName: r.orders?.ticket_tiers?.name ?? "",
    orderId: r.orders?.id ?? "",
  }));
}

// Look up a transfer by token for the claim page (public, token-gated)
export async function loadTransferByToken(token: string): Promise<{
  transfer: TicketTransfer | null;
  eventTitle: string;
  eventDate: string;
  venue: string;
  city: string;
  tierName: string;
  fromName: string;
  qty: number;
} | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select(`
      id, order_id, from_user_id, to_email, to_user_id, to_name, status, token, qty, created_at, accepted_at,
      orders (
        buyer_name, buyer_email,
        events (title, start_date, venue_name, city),
        ticket_tiers (name)
      )
    `)
    .eq("token", token)
    .single();

  if (!data) return null;

  const raw = data as unknown as {
    id: string; order_id: string; from_user_id: string; to_email: string;
    to_user_id: string | null; to_name: string | null; status: string;
    token: string; qty: number; created_at: string; accepted_at: string | null;
    orders: {
      buyer_name: string; buyer_email: string;
      events: { title: string; start_date: string; venue_name: string; city: string } | null;
      ticket_tiers: { name: string } | null;
    } | null;
  };

  return {
    transfer: {
      id: raw.id,
      orderId: raw.order_id,
      fromUserId: raw.from_user_id,
      toEmail: raw.to_email,
      toUserId: raw.to_user_id,
      toName: raw.to_name,
      status: raw.status as TransferStatus,
      token: raw.token,
      qty: raw.qty,
      createdAt: raw.created_at,
      acceptedAt: raw.accepted_at,
    },
    eventTitle: raw.orders?.events?.title ?? "",
    eventDate: raw.orders?.events?.start_date ?? "",
    venue: raw.orders?.events?.venue_name ?? "",
    city: raw.orders?.events?.city ?? "",
    tierName: raw.orders?.ticket_tiers?.name ?? "",
    fromName: raw.orders?.buyer_name ?? "",
    qty: raw.qty,
  };
}
