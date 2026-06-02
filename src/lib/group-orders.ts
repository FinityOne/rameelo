import { createClient } from "@/lib/supabase/client";

export interface GroupMember {
  name: string;
  email: string;
  phone?: string;
  qty: number;
  notes?: string;
  tierId?: string;   // member's chosen tier (falls back to group tier if null)
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
  deadline: string;
  status: "open" | "completed" | "expired";
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
    group_discount_mode: "simple" | "scaling" | null;
    group_discount_min_qty: number | null;
  };
}

export const GROUP_TIERS = [
  { min: 10, discount: 15, label: "10+ people" },
  { min: 8,  discount: 12, label: "8–9 people" },
  { min: 5,  discount: 10, label: "5–7 people" },
];

export function discountForTarget(target: number): number {
  for (const t of GROUP_TIERS) {
    if (target >= t.min) return t.discount;
  }
  return 0;
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
  deadline: string;
  hostQty: number;
  hostNotes?: string;
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
    deadline: params.deadline,
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
    notes: params.hostNotes || null,
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
      target_size, discount_pct, deadline, status, created_at,
      events (
        id, title, start_date, start_time, city, state,
        venue_name, cover_gradient, cover_image_url, category,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price, group_discount_mode, group_discount_min_qty)
    `)
    .eq("id", groupId)
    .single();

  if (error || !group) return null;

  const { data: membersData } = await supabase
    .from("group_order_members")
    .select("name, email, phone, qty, notes, member_tier_id, is_organizer, paid, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");

  type MemberRow = { name: string; email: string; phone: string | null; qty: number; notes: string | null; member_tier_id: string | null; is_organizer: boolean; paid: boolean; joined_at: string };
  const members: GroupMember[] = ((membersData ?? []) as unknown as MemberRow[]).map(m => ({
    name: m.name,
    email: m.email,
    phone: m.phone ?? undefined,
    qty: m.qty ?? 1,
    notes: m.notes ?? undefined,
    tierId: m.member_tier_id ?? undefined,
    isOrganizer: m.is_organizer,
    paid: m.paid,
    joinedAt: m.joined_at,
  }));

  const g = group as unknown as {
    id: string; event_id: string; tier_id: string;
    organizer_name: string; organizer_email: string; organizer_phone: string;
    target_size: number; discount_pct: number; deadline: string;
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
    deadline: g.deadline,
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
  phone?: string;
  qty: number;
  tierId?: string;
  notes?: string;
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
      .update({ qty: params.qty, notes: params.notes ?? null, member_tier_id: params.tierId ?? null })
      .eq("group_id", params.groupId)
      .eq("email", params.email);
    return { error: null };
  }

  const { error } = await supabase.from("group_order_members").insert({
    group_id: params.groupId,
    user_id: params.userId,
    name: params.name,
    email: params.email,
    phone: params.phone || null,
    qty: params.qty,
    notes: params.notes || null,
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
  notes?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("group_order_members")
    .update({ qty: params.qty, notes: params.notes ?? null })
    .eq("group_id", params.groupId)
    .eq("email", params.email)
    .eq("paid", false);
  return { error: error?.message ?? null };
}

export async function markMemberPaid(params: {
  groupId: string;
  email: string;
  orderId: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("group_order_members")
    .update({ paid: true, order_id: params.orderId })
    .eq("group_id", params.groupId)
    .eq("email", params.email);
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
}): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) return { orderId: null, error: error.message };
  return { orderId: data.id, error: null };
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
          .select("name, email, qty, notes, is_organizer, paid, joined_at")
          .eq("group_id", o.group_id)
          .order("joined_at");
        groupMembers = (members ?? []).map(m => ({
          name: m.name,
          email: m.email,
          qty: (m as unknown as Record<string, number>).qty ?? 1,
          notes: (m as unknown as Record<string, string | null>).notes ?? undefined,
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
        id, target_size, discount_pct, deadline, status,
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
          deadline: string; status: string;
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
        deadline: g.deadline,
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
  deadline: string;
  eventTitle: string;
  eventDate: string;
  city: string;
  state: string;
  tierName: string;
  tierPrice: number;
}
