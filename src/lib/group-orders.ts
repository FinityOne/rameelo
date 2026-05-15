import { createClient } from "@/lib/supabase/client";

export interface GroupMember {
  name: string;
  email: string;
  phone?: string;
  isOrganizer: boolean;
  paid: boolean;
  joinedAt: string;
}

export interface GroupOrder {
  groupId: string;
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
  eventId: string;
  tierId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerUserId: string | null;
  targetSize: number;
  discountPct: number;
  deadline: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error: groupError } = await supabase.from("group_orders").insert({
    id: params.groupId,
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
    phone: params.organizerPhone,
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
      id, event_id, tier_id,
      organizer_name, organizer_email, organizer_phone,
      target_size, discount_pct, deadline, status, created_at,
      events (
        id, title, start_date, start_time, city, state,
        venue_name, cover_gradient, cover_image_url, category,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price)
    `)
    .eq("id", groupId)
    .single();

  if (error || !group) return null;

  const { data: membersData } = await supabase
    .from("group_order_members")
    .select("name, email, phone, is_organizer, paid, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");

  const members: GroupMember[] = (membersData ?? []).map(m => ({
    name: m.name,
    email: m.email,
    phone: m.phone ?? undefined,
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
  phone: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Check if already in this group by email
  const { data: existing } = await supabase
    .from("group_order_members")
    .select("id")
    .eq("group_id", params.groupId)
    .eq("email", params.email)
    .single();

  if (existing) return { error: null }; // Already joined — idempotent

  const { error } = await supabase.from("group_order_members").insert({
    group_id: params.groupId,
    user_id: params.userId,
    name: params.name,
    email: params.email,
    phone: params.phone,
    is_organizer: false,
    paid: false,
  });

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
  grandTotal: number;
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
      grand_total: params.grandTotal,
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
      discount_amount, service_fee, grand_total,
      status, created_at, buyer_name, buyer_email, buyer_phone,
      events (
        id, title, start_date, start_time,
        city, state, venue_name, category, cover_gradient,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price)
    `)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const orders = data as unknown as RawOrderRow[];

  const result: PortalOrderRow[] = await Promise.all(
    orders.map(async (o) => {
      let groupMembers: GroupMember[] | undefined;
      if (o.group_id) {
        const { data: members } = await supabase
          .from("group_order_members")
          .select("name, email, is_organizer, paid, joined_at")
          .eq("group_id", o.group_id)
          .order("joined_at");
        groupMembers = (members ?? []).map(m => ({
          name: m.name,
          email: m.email,
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
        artistName: o.events?.artists?.name ?? "",
        tierName: o.ticket_tiers?.name ?? "",
        qty: o.qty,
        unitPrice: o.unit_price,
        grandTotal: o.grand_total,
        purchasedAt: o.created_at,
        groupMembers,
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
  artistName: string;
  tierName: string;
  qty: number;
  unitPrice: number;
  grandTotal: number;
  purchasedAt: string;
  groupMembers?: GroupMember[];
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
