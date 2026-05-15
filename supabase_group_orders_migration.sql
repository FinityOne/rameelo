-- ============================================================
-- Group Orders Migration
-- Run this in the Supabase SQL Editor for the Rameelo Platform project
-- ============================================================

-- 1. Group orders table
CREATE TABLE IF NOT EXISTS public.group_orders (
  id TEXT PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
  organizer_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  organizer_phone TEXT NOT NULL,
  organizer_user_id UUID REFERENCES auth.users(id),
  target_size INTEGER NOT NULL DEFAULT 5,
  discount_pct INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Group order members table (each person who joins)
CREATE TABLE IF NOT EXISTS public.group_order_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_organizer BOOLEAN NOT NULL DEFAULT FALSE,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  order_id UUID,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders table (completed ticket purchases)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES public.group_orders(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  discount_pct INTEGER NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FK from group_order_members.order_id → orders.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_group_member_order'
  ) THEN
    ALTER TABLE public.group_order_members
      ADD CONSTRAINT fk_group_member_order
      FOREIGN KEY (order_id) REFERENCES public.orders(id);
  END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — group_orders
DROP POLICY IF EXISTS "Public can view group orders" ON public.group_orders;
CREATE POLICY "Public can view group orders"
  ON public.group_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can create group orders" ON public.group_orders;
CREATE POLICY "Public can create group orders"
  ON public.group_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Organizer can update group orders" ON public.group_orders;
CREATE POLICY "Organizer can update group orders"
  ON public.group_orders FOR UPDATE
  USING (organizer_user_id = auth.uid() OR organizer_user_id IS NULL);

-- 7. RLS Policies — group_order_members
DROP POLICY IF EXISTS "Public can view group members" ON public.group_order_members;
CREATE POLICY "Public can view group members"
  ON public.group_order_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can join groups" ON public.group_order_members;
CREATE POLICY "Public can join groups"
  ON public.group_order_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update member record" ON public.group_order_members;
CREATE POLICY "Anyone can update member record"
  ON public.group_order_members FOR UPDATE USING (true);

-- 8. RLS Policies — orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT WITH CHECK (true);

-- 9. Grant access to anon and authenticated roles
GRANT SELECT, INSERT ON public.group_orders TO anon, authenticated;
GRANT UPDATE ON public.group_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_order_members TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
