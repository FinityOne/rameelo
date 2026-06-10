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
    group_discount_mode: "simple" | "scaling" | null;
    group_discount_min_qty: number | null;
    group_discount_type: "percentage" | "fixed" | null;
    group_discount_value: number | null;
    group_discount_tiers: ScalingLevel[] | null;
  };
}

// ── Group discounts ───────────────────────────────────────────────────────────
// Discounts are NEVER hardcoded — they come entirely from the event's ticket
// tier. Two modes (driven by group_discount_mode):
//  • "simple": one threshold (group_discount_min_qty) with a flat % OR $ off
//    (group_discount_type / group_discount_value).
//  • "scaling": multiple percentage-only levels (group_discount_tiers), each a
//    {min_qty, percent} — the highest level the group qualifies for applies.
// Legacy rows with no mode but a min_qty/value are treated as "simple".
export interface ScalingLevel { minQty: number; percent: number }

export interface TierDiscountFields {
  price: number;
  group_discount_mode?: "simple" | "scaling" | null;
  group_discount_min_qty: number | null;
  group_discount_type: "percentage" | "fixed" | null;
  group_discount_value: number | null;
  group_discount_tiers?: ScalingLevel[] | { min_qty?: number; minQty?: number; percent?: number }[] | null;
}

// Normalize the scaling levels jsonb (snake_case from DB) → sorted, valid list.
export function groupScalingLevels(t: TierDiscountFields | null | undefined): ScalingLevel[] {
  const raw = t?.group_discount_tiers;
  if (!Array.isArray(raw)) return [];
  return raw
    .map(r => ({
      minQty: Math.round(Number((r as { min_qty?: number; minQty?: number }).min_qty ?? (r as { minQty?: number }).minQty ?? 0)),
      percent: Math.round(Number((r as { percent?: number }).percent ?? 0)),
    }))
    .filter(l => l.minQty > 0 && l.percent > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

function isScaling(t: TierDiscountFields | null | undefined): boolean {
  return t?.group_discount_mode === "scaling" && groupScalingLevels(t).length > 0;
}

// Does this tier offer a group discount at all (at some quantity)?
export function tierHasGroupDiscount(t: TierDiscountFields | null | undefined): boolean {
  if (!t) return false;
  if (t.group_discount_mode === "scaling") return groupScalingLevels(t).length > 0;
  return !!t.group_discount_min_qty && t.group_discount_value != null && t.group_discount_value > 0;
}

// Per-ticket discount as a percentage of the tier price (orders are %-based),
// for a group of `qty` tickets. Returns 0 below the qualifying minimum.
// A fixed dollar discount (simple mode) is converted to the equivalent %.
export function groupDiscountPct(t: TierDiscountFields | null | undefined, qty: number): number {
  if (!t || !tierHasGroupDiscount(t)) return 0;
  if (isScaling(t)) {
    let pct = 0;
    for (const lvl of groupScalingLevels(t)) if (qty >= lvl.minQty) pct = lvl.percent;
    return Math.min(100, pct);
  }
  if (qty < (t.group_discount_min_qty ?? Infinity)) return 0;
  const val = t.group_discount_value ?? 0;
  if (t.group_discount_type === "fixed") {
    if (!t.price) return 0;
    return Math.min(100, Math.round((val / t.price) * 100));
  }
  return Math.min(100, Math.round(val));
}

// Exact discount in dollars for `qty` tickets at a given pre-discount subtotal.
// Keeps fixed-$ math exact; percentage/scaling derive from the live %.
export function groupDiscountAmount(t: TierDiscountFields | null | undefined, qty: number, subtotal: number): number {
  if (!t || !tierHasGroupDiscount(t)) return 0;
  if (!isScaling(t) && t.group_discount_type === "fixed") {
    if (qty < (t.group_discount_min_qty ?? Infinity)) return 0;
    return Math.min(subtotal, Math.round((t.group_discount_value ?? 0) * qty * 100) / 100);
  }
  return Math.round(subtotal * (groupDiscountPct(t, qty) / 100) * 100) / 100;
}

// Human one-line summary at the ENTRY level (lowest threshold), e.g.
// { minQty: 5, amount: "10% off" } or { minQty: 8, amount: "$5.00 off" }.
// For scaling, the entry level is the lowest level; use groupScalingLevels for
// the full ladder.
export function groupDiscountSummary(
  t: TierDiscountFields | null | undefined,
): { minQty: number; amount: string } | null {
  if (!tierHasGroupDiscount(t) || !t) return null;
  if (isScaling(t)) {
    const levels = groupScalingLevels(t);
    const entry = levels[0];
    return { minQty: entry.minQty, amount: `${entry.percent}% off` };
  }
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
      ticket_tiers (id, name, price, group_discount_mode, group_discount_min_qty, group_discount_type, group_discount_value, group_discount_tiers)
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
  stripePaymentIntentId?: string | null;
  paymentPending?: boolean;
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
      // ACH starts 'pending' (payment initiated, not yet cleared) — no valid QR
      // until the Stripe webhook flips it to 'confirmed'. Cards are confirmed now.
      status: params.paymentPending ? "pending" : "confirmed",
      stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
      // Dispute-evidence: IP + terms acceptance captured at checkout
      purchase_ip: params.purchaseIp ?? null,
      terms_version: params.termsVersion ?? null,
      terms_accepted_at: params.termsVersion ? nowIso : null,
      terms_accepted_ip: params.termsAcceptedIp ?? params.purchaseIp ?? null,
      // The full confirmation (with QR) is only sent once payment clears.
      confirmation_email_sent_at: params.paymentPending ? null : nowIso,
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
      status, payment_method, created_at, buyer_name, buyer_email, buyer_phone,
      events (
        id, title, start_date, start_time,
        city, state, venue_name, category, cover_gradient, cover_image_url,
        artists (name, profile_image_url)
      ),
      ticket_tiers (id, name, price)
    `)
    .eq("user_id", userId)
    // Include 'pending' (ACH awaiting clearance) so the buyer sees their reserved
    // order; the UI gates the QR until it's 'confirmed'.
    .in("status", ["confirmed", "pending"])
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
        status: o.status,
        paymentMethod: o.payment_method,
        paymentPending: o.status === "pending",
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

// ── My group-order links (portal "Group Orders" tab) ──────────────────────────
export interface MyGroupSummary {
  groupId: string;
  name?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  city: string;
  state: string;
  venue: string;
  coverGradient: string;
  coverImageUrl: string | null;
  artistName: string;
  tierName: string;
  isHost: boolean;
  paid: boolean;          // group has been purchased
  myQty: number;          // tickets reserved for this member
  totalTickets: number;
  memberCount: number;
  members: { name: string; email: string; qty: number; paid: boolean; isOrganizer: boolean }[];
  createdAt: string;
}

// Every group-order link the user belongs to (created OR joined), matched by
// account id or email — so it's visible to everyone in the group.
export async function loadMyGroupOrders(userId: string, email: string): Promise<MyGroupSummary[]> {
  const supabase = createClient();
  const lowEmail = (email ?? "").toLowerCase();

  // Group ids the user is a member of (by account id or email).
  const { data: mine } = await supabase
    .from("group_order_members")
    .select("group_id")
    .or(`user_id.eq.${userId}${lowEmail ? `,email.eq.${lowEmail}` : ""}`);

  const groupIds = Array.from(new Set((mine ?? []).map(m => (m as { group_id: string }).group_id)));
  if (groupIds.length === 0) return [];

  const { data } = await supabase
    .from("group_orders")
    .select(`
      id, name, event_id, organizer_email, organizer_user_id, status, created_at,
      events ( id, title, start_date, start_time, city, state, venue_name, cover_gradient, cover_image_url, artists (name) ),
      ticket_tiers ( name ),
      group_order_members ( name, email, qty, paid, is_organizer, joined_at )
    `)
    .in("id", groupIds);

  type Row = {
    id: string; name: string | null; event_id: string; organizer_email: string; organizer_user_id: string | null;
    status: string; created_at: string;
    events: { id: string; title: string; start_date: string; start_time: string | null; city: string; state: string; venue_name: string | null; cover_gradient: string | null; cover_image_url: string | null; artists: { name: string } | { name: string }[] | null } | null;
    ticket_tiers: { name: string } | null;
    group_order_members: { name: string; email: string; qty: number; paid: boolean; is_organizer: boolean; joined_at: string }[] | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  return rows.map(r => {
    const ev = r.events;
    const artist = ev ? (Array.isArray(ev.artists) ? ev.artists[0] : ev.artists) : null;
    const members = (r.group_order_members ?? [])
      .slice()
      .sort((a, b) => (a.is_organizer === b.is_organizer ? a.joined_at.localeCompare(b.joined_at) : a.is_organizer ? -1 : 1))
      .map(m => ({ name: m.name, email: m.email, qty: m.qty ?? 1, paid: m.paid, isOrganizer: m.is_organizer }));
    const me = members.find(m => m.email.toLowerCase() === lowEmail);
    return {
      groupId: r.id,
      name: r.name ?? undefined,
      eventId: r.event_id,
      eventTitle: ev?.title ?? "",
      eventDate: ev?.start_date ?? "",
      eventTime: ev?.start_time ?? "",
      city: ev?.city ?? "",
      state: ev?.state ?? "",
      venue: ev?.venue_name ?? "",
      coverGradient: ev?.cover_gradient ?? "",
      coverImageUrl: ev?.cover_image_url ?? null,
      artistName: artist?.name ?? "",
      tierName: r.ticket_tiers?.name ?? "",
      isHost: r.organizer_user_id === userId || r.organizer_email.toLowerCase() === lowEmail,
      paid: r.status === "completed" || members.some(m => m.paid),
      myQty: me?.qty ?? 0,
      totalTickets: members.reduce((s, m) => s + m.qty, 0),
      memberCount: members.length,
      members,
      createdAt: r.created_at,
    };
  }).sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? -1 : 1;       // purchased first
    return b.createdAt.localeCompare(a.createdAt);        // then newest
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
  payment_method: string;
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
  status: string;            // 'confirmed' | 'pending'
  paymentMethod: string;     // 'card' | 'ach'
  paymentPending: boolean;   // true while an ACH order awaits clearance (no QR yet)
  // Set when this "order" is actually a ticket received from someone else (a
  // transfer or group-order allocation) rather than the member's own purchase.
  receivedFrom?: string;        // name of the person it was received from
  receivedFromGroup?: boolean;  // it came via a group order
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
