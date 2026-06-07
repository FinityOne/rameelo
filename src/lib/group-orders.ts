import { createClient } from "@/lib/supabase/client";

export interface GroupMember {
  name: string;
  email: string;
  qty: number;
  tierId?: string; // the active tier this member picked when joining
  userId?: string; // set when this member was added by a logged-in account
  isOrganizer: boolean;
  paid: boolean;
  joinedAt: string;
}

export interface GroupOrder {
  groupId: string;
  name?: string;
  eventId: string;
  tierId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  targetSize: number;
  discountPct: number;
  members: GroupMember[];
  createdAt: string;
  status: "open" | "completed";
  // Joined data (populated by loadGroup)
  event?: {
    id: string;
    title: string;
    start_date: string;
    start_time: string;
    city: string;
    state: string;
    venue_name: string;
    cover_gradient: string;
    cover_image_url: string | null;
    category: string;
    artists: { name: string; profile_image_url: string | null } | null;
  };
  tier?: {
    id: string;
    name: string;
    price: number;
    group_discount_min_qty: number | null;
    group_discount_type: "percentage" | "fixed" | null;
    group_discount_value: number | null;
  };
}

// ── Group discounts ───────────────────────────────────────────────────────────
// Discounts are NEVER hardcoded — they come entirely from the event's ticket
// tier. A tier offers a group discount when it has a minimum quantity and a
// positive value; it applies once the group reaches that many tickets. The
// discount can be a percentage off or a fixed dollar amount off per ticket.
export interface TierDiscountFields {
  price: number;
  group_discount_min_qty: number | null;
  group_discount_type: "percentage" | "fixed" | null;
  group_discount_value: number | null;
}

// Does this tier offer a group discount at all (at some quantity)?
export function tierHasGroupDiscount(t: TierDiscountFields | null | undefined): boolean {
  return !!t && !!t.group_discount_min_qty && t.group_discount_value != null && t.group_discount_value > 0;
}

// Per-ticket discount as a percentage of the tier price (orders are %-based),
// for a group of `qty` tickets. Returns 0 below the tier's minimum quantity.
// A fixed dollar discount is converted to the equivalent % of the tier price.
export function groupDiscountPct(t: TierDiscountFields | null | undefined, qty: number): number {
  if (!t || !tierHasGroupDiscount(t)) return 0;
  if (qty < (t.group_discount_min_qty ?? Infinity)) return 0;
  const val = t.group_discount_value ?? 0;
  if (t.group_discount_type === "fixed") {
    if (!t.price) return 0;
    return Math.min(100, Math.round((val / t.price) * 100));
  }
  return Math.min(100, Math.round(val));
}

// Human description of a tier's group discount, e.g. { minQty: 10, amount: "15% off" }
// or { minQty: 8, amount: "$5.00 off" }. Returns null when there's no discount.
export function groupDiscountSummary(
  t: TierDiscountFields | null | undefined,
): { minQty: number; amount: string } | null {
  if (!tierHasGroupDiscount(t) || !t) return null;
  const val = t.group_discount_value ?? 0;
  return {
    minQty: t.group_discount_min_qty ?? 0,
    amount: t.group_discount_type === "fixed" ? `$${val.toFixed(2)} off` : `${val}% off`,
  };
}

export function generateGroupId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "RM-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function createGroupOrder(params: {
  groupId: string;
  name?: string;
  eventId: string;
  tierId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerUserId: string | null;
  targetSize: number;
  discountPct: number;
  hostQty: number;
}): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error: groupError } = await supabase.from("group_orders").insert({
    id: params.groupId,
    name: params.name || null,
    event_id: params.eventId,
    tier_id: params.tierId,
    organizer_name: params.organizerName,
    organizer_email: params.organizerEmail,
    organizer_phone: params.organizerPhone,
    organizer_user_id: params.organizerUserId,
    target_size: params.targetSize,
    discount_pct: params.discountPct,
    status: "open",
  });

  if (groupError) return { error: groupError.message };

  const { error: memberError } = await supabase.from("group_order_members").insert({
    group_id: params.groupId,
    user_id: params.organizerUserId,
    name: params.organizerName,
    email: params.organizerEmail,
    phone: params.organizerPhone || null,
    qty: params.hostQty,
    member_tier_id: params.tierId,
    is_organizer: true,
    paid: false,
  });

  if (memberError) return { error: memberError.message };
  return { error: null };
}

export async function loadGroupOrder(groupId: string): Promise<GroupOrder | null> {
  const supabase = createClient();

  const { data: group, error } = await supabase
    .from("group_orders")
    .select(`
      id, name, event_id, tier_id,
      organizer_name, organizer_email, organizer_phone,
      target_size, discount_pct, status, created_at,
      events (
        id, title, start_date, start_time, city, state,
        venue_name, cover_gradient, cover_image_url, category,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price, group_discount_min_qty, group_discount_type, group_discount_value)
    `)
    .eq("id", groupId)
    .single();

  if (error || !group) return null;

  const { data: membersData } = await supabase
    .from("group_order_members")
    .select("name, email, qty, member_tier_id, user_id, is_organizer, paid, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");

  type MemberRow = { name: string; email: string; qty: number; member_tier_id: string | null; user_id: string | null; is_organizer: boolean; paid: boolean; joined_at: string };
  const members: GroupMember[] = ((membersData ?? []) as unknown as MemberRow[]).map(m => ({
    name: m.name,
    email: m.email,
    qty: m.qty ?? 1,
    tierId: m.member_tier_id ?? undefined,
    userId: m.user_id ?? undefined,
    isOrganizer: m.is_organizer,
    paid: m.paid,
    joinedAt: m.joined_at,
  }));

  const g = group as unknown as {
    id: string; event_id: string; tier_id: string;
    organizer_name: string; organizer_email: string; organizer_phone: string;
    target_size: number; discount_pct: number;
    status: string; created_at: string;
    events: GroupOrder["event"];
    ticket_tiers: GroupOrder["tier"];
  };

  return {
    groupId: g.id,
    name: (g as unknown as Record<string, string | null>).name ?? undefined,
    eventId: g.event_id,
    tierId: g.tier_id,
    organizerName: g.organizer_name,
    organizerEmail: g.organizer_email,
    organizerPhone: g.organizer_phone,
    targetSize: g.target_size,
    discountPct: g.discount_pct,
    members,
    createdAt: g.created_at,
    status: g.status as GroupOrder["status"],
    event: g.events ?? undefined,
    tier: g.ticket_tiers ?? undefined,
  };
}

export async function joinGroupOrder(params: {
  groupId: string;
  userId: string | null;
  name: string;
  email: string;
  qty: number;
  tierId?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();

  // If already in this group by email, update their record instead
  const { data: existing } = await supabase
    .from("group_order_members")
    .select("id, paid")
    .eq("group_id", params.groupId)
    .eq("email", params.email)
    .maybeSingle();

  if (existing) {
    if (existing.paid) return { error: null }; // paid — nothing to change
    await supabase
      .from("group_order_members")
      .update({ qty: params.qty, member_tier_id: params.tierId ?? null })
      .eq("group_id", params.groupId)
      .eq("email", params.email);
    return { error: null };
  }

  const { error } = await supabase.from("group_order_members").insert({
    group_id: params.groupId,
    user_id: params.userId,
    name: params.name,
    email: params.email,
    qty: params.qty,
    member_tier_id: params.tierId ?? null,
    is_organizer: false,
    paid: false,
  });

  return { error: error?.message ?? null };
}

export async function updateGroupName(groupId: string, name: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("group_orders")
    .update({ name: name.trim() || null })
    .eq("id", groupId);
  return { error: error?.message ?? null };
}

export async function updateGroupMember(params: {
  groupId: string;
  email: string;
  qty: number;
  tierId?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("group_order_members")
    .update({ qty: params.qty, ...(params.tierId !== undefined ? { member_tier_id: params.tierId } : {}) })
    .eq("group_id", params.groupId)
    .eq("email", params.email)
    .eq("paid", false);
  return { error: error?.message ?? null };
}

// One-payer model: a single transaction covers the whole group, so this marks
// every member of the group paid at once. Goes through a SECURITY DEFINER RPC
// because the group_order_members UPDATE policy forbids the client setting paid=true.
export async function markGroupPaid(params: {
  groupId: string;
  orderId: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("mark_group_paid", {
    p_group_id: params.groupId,
    p_order_id: params.orderId,
  });
}

// Split a paid group order into per-member ticket allocations (pending transfers
// the other members claim). The purchaser keeps their own seats. Idempotent.
export async function createGroupAllocations(orderId: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("create_group_ticket_allocations", { p_order_id: orderId });
}

export async function saveOrder(params: {
  userId: string | null;
  eventId: string;
  tierId: string;
  groupId?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  serviceFee: number;
  rameeloFee: number;
  processingFee: number;
  paymentMethod: "card" | "ach";
  grandTotal: number;
  isTest?: boolean;
  purchaseIp?: string | null;
  termsVersion?: string | null;
  termsAcceptedIp?: string | null;
}): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();

  // Generate the id client-side so we don't need to read the row back. Guest
  // orders (user_id null) aren't SELECT-able under RLS, so `.select().single()`
  // would fail and we'd lose the id (breaking group mark-paid + allocations).
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .insert({
      id,
      user_id: params.userId,
      event_id: params.eventId,
      tier_id: params.tierId,
      group_id: params.groupId ?? null,
      buyer_name: params.buyerName,
      buyer_email: params.buyerEmail,
      buyer_phone: params.buyerPhone,
      qty: params.qty,
      unit_price: params.unitPrice,
      discount_pct: params.discountPct,
      discount_amount: params.discountAmount,
      service_fee: params.serviceFee,
      rameelo_fee: params.rameeloFee,
      processing_fee: params.processingFee,
      payment_method: params.paymentMethod,
      grand_total: params.grandTotal,
      is_test: params.isTest ?? false,
      status: "confirmed",
      // Dispute-evidence: IP + terms acceptance captured at checkout
      purchase_ip: params.purchaseIp ?? null,
      terms_version: params.termsVersion ?? null,
      terms_accepted_at: params.termsVersion ? nowIso : null,
      terms_accepted_ip: params.termsAcceptedIp ?? params.purchaseIp ?? null,
      confirmation_email_sent_at: nowIso,
    });

  if (error) return { orderId: null, error: error.message };
  return { orderId: id, error: null };
}

export async function loadMyOrders(userId: string): Promise<PortalOrderRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, group_id, qty, unit_price, discount_pct,
      discount_amount, service_fee, grand_total, is_test,
      status, created_at, buyer_name, buyer_email, buyer_phone,
      events (
        id, title, start_date, start_time,
        city, state, venue_name, category, cover_gradient, cover_image_url,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price)
    `)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Load all non-cancelled transfers for these orders in one query
  const orderIds = (data as unknown as { id: string }[]).map(o => o.id);
  const { loadOutgoingTransfersForOrders } = await import("@/lib/transfers");
  const allTransfers = await loadOutgoingTransfersForOrders(orderIds);

  // Group transfers by order_id
  const transfersByOrder = new Map<string, typeof allTransfers>();
  for (const t of allTransfers) {
    const existing = transfersByOrder.get(t.orderId) ?? [];
    existing.push(t);
    transfersByOrder.set(t.orderId, existing);
  }

  const orders = data as unknown as RawOrderRow[];

  const result: PortalOrderRow[] = await Promise.all(
    orders.map(async (o) => {
      let groupMembers: GroupMember[] | undefined;
      if (o.group_id) {
        const { data: members } = await supabase
          .from("group_order_members")
          .select("name, email, qty, member_tier_id, is_organizer, paid, joined_at")
          .eq("group_id", o.group_id)
          .order("joined_at");
        groupMembers = (members ?? []).map(m => ({
          name: m.name,
          email: m.email,
          qty: (m as unknown as Record<string, number>).qty ?? 1,
          tierId: (m as unknown as Record<string, string | null>).member_tier_id ?? undefined,
          isOrganizer: m.is_organizer,
          paid: m.paid,
          joinedAt: m.joined_at,
        }));
      }

      return {
        orderId: o.id,
        groupId: o.group_id ?? undefined,
        eventId: o.events?.id ?? "",
        eventTitle: o.events?.title ?? "",
        eventDate: o.events?.start_date ?? "",
        eventTime: o.events?.start_time ?? "",
        city: o.events?.city ?? "",
        state: o.events?.state ?? "",
        venue: o.events?.venue_name ?? "",
        category: o.events?.category ?? "",
        coverGradient: o.events?.cover_gradient ?? "",
        coverImageUrl: o.events?.cover_image_url ?? null,
        artistName: o.events?.artists?.name ?? "",
        tierName: o.ticket_tiers?.name ?? "",
        qty: o.qty,
        unitPrice: o.unit_price,
        grandTotal: o.grand_total,
        isTest: o.is_test ?? false,
        purchasedAt: o.created_at,
        groupMembers,
        transfers: (transfersByOrder.get(o.id) ?? []).map(t => ({
          id: t.id, token: t.token, status: t.status as "pending" | "accepted",
          toEmail: t.toEmail, toName: t.toName, seatNumbers: t.seatNumbers,
          createdAt: t.createdAt, acceptedAt: t.acceptedAt,
        })),
      };
    })
  );

  return result;
}

export async function loadMyPendingGroups(userId: string): Promise<PendingGroup[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("group_order_members")
    .select(`
      id, group_id, is_organizer, paid, joined_at,
      group_orders (
        id, target_size, discount_pct, status,
        events (title, start_date, city, state),
        ticket_tiers (name, price)
      )
    `)
    .eq("user_id", userId)
    .eq("paid", false);

  if (!data) return [];

  return data
    .filter(m => {
      const g = (m as unknown as { group_orders: { status: string } }).group_orders;
      return g?.status === "open";
    })
    .map(m => {
      const raw = m as unknown as {
        group_id: string;
        is_organizer: boolean;
        group_orders: {
          id: string; target_size: number; discount_pct: number;
          status: string;
          events: { title: string; start_date: string; city: string; state: string } | null;
          ticket_tiers: { name: string; price: number } | null;
        };
      };
      const g = raw.group_orders;
      return {
        groupId: raw.group_id,
        isOrganizer: raw.is_organizer,
        targetSize: g.target_size,
        discountPct: g.discount_pct,
        eventTitle: g.events?.title ?? "",
        eventDate: g.events?.start_date ?? "",
        city: g.events?.city ?? "",
        state: g.events?.state ?? "",
        tierName: g.ticket_tiers?.name ?? "",
        tierPrice: g.ticket_tiers?.price ?? 0,
      };
    });
}

// ── Row types used by loadMyOrders ────────────────────────────────────────────
interface RawOrderRow {
  id: string;
  group_id: string | null;
  qty: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  service_fee: number;
  grand_total: number;
  is_test: boolean;
  status: string;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  events: {
    id: string;
    title: string;
    start_date: string;
    start_time: string;
    city: string;
    state: string;
    venue_name: string;
    category: string;
    cover_gradient: string;
    cover_image_url: string | null;
    artists: { name: string; profile_image_url: string | null } | null;
  } | null;
  ticket_tiers: { id: string; name: string; price: number } | null;
}

export interface PortalOrderRow {
  orderId: string;
  groupId?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  city: string;
  state: string;
  venue: string;
  category: string;
  coverGradient: string;
  coverImageUrl: string | null;
  artistName: string;
  tierName: string;
  qty: number;
  unitPrice: number;
  grandTotal: number;
  isTest: boolean;
  purchasedAt: string;
  groupMembers?: GroupMember[];
  transfers?: {
    id: string;
    token: string;
    status: "pending" | "accepted";
    toEmail: string;
    toName: string | null;
    seatNumbers: number[];
    createdAt: string;
    acceptedAt: string | null;
  }[];
}

export interface PendingGroup {
  groupId: string;
  isOrganizer: boolean;
  targetSize: number;
  discountPct: number;
  eventTitle: string;
  eventDate: string;
  city: string;
  state: string;
  tierName: string;
  tierPrice: number;
}
