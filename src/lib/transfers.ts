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
  seatNumbers: number[]; // empty = all seats (legacy)
  createdAt: string;
  acceptedAt: string | null;
}

export interface IncomingTransfer {
  id: string;
  token: string;
  qty: number;
  seatNumbers: number[];
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

// A fully accepted transfer the current user received (for "Received Tickets" view)
export interface ReceivedTicket {
  transferId: string;
  token: string;
  seatNumbers: number[];
  fromName: string;
  acceptedAt: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  state: string;
  tierName: string;
  orderId: string;
}

export interface UserLookup {
  exists: boolean;
  userId?: string;
  name?: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export async function lookupUserByEmail(email: string): Promise<UserLookup> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lookup_user_by_email", { p_email: email });
  if (error || !data) return { exists: false };
  return { exists: data.exists, userId: data.user_id ?? undefined, name: data.name ?? undefined };
}

export async function initiateTransfer(params: {
  orderId: string;
  fromUserId: string;
  toEmail: string;
  toName?: string;
  seatNumbers: number[]; // specific seats being transferred
  qty: number;
}): Promise<{ transferId: string | null; token: string | null; error: string | null }> {
  const supabase = createClient();

  // Cancel any existing pending transfer that overlaps with these seats
  // (seats[] && ARRAY[...] is the Postgres overlap operator)
  if (params.seatNumbers.length > 0) {
    // Get existing pending transfers for this order and cancel overlapping ones
    const { data: existing } = await supabase
      .from("ticket_transfers")
      .select("id, seat_numbers")
      .eq("order_id", params.orderId)
      .eq("status", "pending");

    const overlapping = (existing ?? []).filter(t => {
      const seats: number[] = t.seat_numbers ?? [];
      if (seats.length === 0) return true; // legacy full-order transfer
      return seats.some(s => params.seatNumbers.includes(s));
    });

    if (overlapping.length > 0) {
      await supabase
        .from("ticket_transfers")
        .update({ status: "cancelled" })
        .in("id", overlapping.map(t => t.id));
    }
  } else {
    // Full-order transfer: cancel all pending
    await supabase
      .from("ticket_transfers")
      .update({ status: "cancelled" })
      .eq("order_id", params.orderId)
      .eq("status", "pending");
  }

  const { data, error } = await supabase
    .from("ticket_transfers")
    .insert({
      order_id: params.orderId,
      from_user_id: params.fromUserId,
      to_email: params.toEmail.toLowerCase().trim(),
      to_name: params.toName ?? null,
      seat_numbers: params.seatNumbers,
      qty: params.seatNumbers.length || params.qty,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (error) return { transferId: null, token: null, error: error.message };
  return { transferId: data.id, token: data.token, error: null };
}

export async function cancelTransfer(transferId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ticket_transfers")
    .update({ status: "cancelled" })
    .eq("id", transferId)
    .eq("status", "pending");
  return { error: error?.message ?? null };
}

export async function acceptTransfer(token: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_ticket_transfer", { p_token: token });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}

// All non-cancelled outgoing transfers for an order (used by loadMyOrders)
export async function loadOutgoingTransfersForOrders(
  orderIds: string[]
): Promise<TicketTransfer[]> {
  if (orderIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select("id, order_id, from_user_id, to_email, to_user_id, to_name, status, token, qty, seat_numbers, created_at, accepted_at")
    .in("order_id", orderIds)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

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
    seatNumbers: r.seat_numbers ?? [],
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
  }));
}

// Pending incoming transfers for the inbox section
export async function loadIncomingTransfers(email: string): Promise<IncomingTransfer[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select(`
      id, token, qty, seat_numbers, created_at,
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
    id: string; token: string; qty: number; seat_numbers: number[]; created_at: string;
    orders: {
      id: string; buyer_name: string; buyer_email: string;
      events: { title: string; start_date: string; venue_name: string; city: string } | null;
      ticket_tiers: { name: string } | null;
    } | null;
  }[]).map(r => ({
    id: r.id,
    token: r.token,
    qty: r.qty,
    seatNumbers: r.seat_numbers ?? [],
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

// Accepted tickets the current user received via transfer (for "Received" section)
export async function loadReceivedTickets(userId: string): Promise<ReceivedTicket[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select(`
      id, token, qty, seat_numbers, accepted_at,
      orders (
        id, buyer_name,
        events (title, start_date, start_time, venue_name, city, state),
        ticket_tiers (name)
      )
    `)
    .eq("to_user_id", userId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false });

  if (!data) return [];

  return (data as unknown as {
    id: string; token: string; qty: number; seat_numbers: number[]; accepted_at: string;
    orders: {
      id: string; buyer_name: string;
      events: { title: string; start_date: string; start_time: string; venue_name: string; city: string; state: string } | null;
      ticket_tiers: { name: string } | null;
    } | null;
  }[]).map(r => ({
    transferId: r.id,
    token: r.token,
    seatNumbers: r.seat_numbers ?? [],
    fromName: r.orders?.buyer_name ?? "",
    acceptedAt: r.accepted_at,
    eventTitle: r.orders?.events?.title ?? "",
    eventDate: r.orders?.events?.start_date ?? "",
    eventTime: r.orders?.events?.start_time ?? "",
    venue: r.orders?.events?.venue_name ?? "",
    city: r.orders?.events?.city ?? "",
    state: r.orders?.events?.state ?? "",
    tierName: r.orders?.ticket_tiers?.name ?? "",
    orderId: r.orders?.id ?? "",
  }));
}

// Claim page: load by token
export async function loadTransferByToken(token: string): Promise<{
  transfer: TicketTransfer | null;
  eventTitle: string;
  eventDate: string;
  venue: string;
  city: string;
  tierName: string;
  fromName: string;
  qty: number;
  seatNumbers: number[];
} | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ticket_transfers")
    .select(`
      id, order_id, from_user_id, to_email, to_user_id, to_name,
      status, token, qty, seat_numbers, created_at, accepted_at,
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
    token: string; qty: number; seat_numbers: number[]; created_at: string; accepted_at: string | null;
    orders: {
      buyer_name: string; buyer_email: string;
      events: { title: string; start_date: string; venue_name: string; city: string } | null;
      ticket_tiers: { name: string } | null;
    } | null;
  };

  return {
    transfer: {
      id: raw.id, orderId: raw.order_id, fromUserId: raw.from_user_id,
      toEmail: raw.to_email, toUserId: raw.to_user_id, toName: raw.to_name,
      status: raw.status as TransferStatus, token: raw.token,
      qty: raw.qty, seatNumbers: raw.seat_numbers ?? [],
      createdAt: raw.created_at, acceptedAt: raw.accepted_at,
    },
    eventTitle: raw.orders?.events?.title ?? "",
    eventDate: raw.orders?.events?.start_date ?? "",
    venue: raw.orders?.events?.venue_name ?? "",
    city: raw.orders?.events?.city ?? "",
    tierName: raw.orders?.ticket_tiers?.name ?? "",
    fromName: raw.orders?.buyer_name ?? "",
    qty: raw.qty,
    seatNumbers: raw.seat_numbers ?? [],
  };
}
