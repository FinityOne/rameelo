@AGENTS.md

# Rameelo — project playbook

Rameelo is a ticketing + community platform for Garba / Dandiya / Navratri events across the US, built by and for the Gujarati diaspora. This file is the standing brief for coding agents — follow it without being re-told. Keep it current: when a convention here changes, update this file in the same change.

## Stack
- **Next.js 16.2.2 (App Router) + React 19 + TypeScript.** See `AGENTS.md` — this Next.js differs from training data; check `node_modules/next/dist/docs/` before using unfamiliar APIs.
- **Tailwind CSS v4** with design tokens in `src/app/globals.css` under `@theme` (no `tailwind.config.js`). Use the token classes, not raw hex, wherever a token exists.
- **Supabase** (Postgres + Auth + RLS). Project ref `wjngyoqjmziskrnlweoy`. Client: `src/lib/supabase/client.ts` (client components) and `server.ts` (route handlers / server components).
- **Resend** for email, **jspdf** + **qrcode** for documents, **html5-qrcode** for scanning.

## Definition of done (always)
1. `npx tsc --noEmit` is clean.
2. `npx next build` exits 0 (run a real build for anything non-trivial; clear `.next` first if in doubt).
3. State outcomes honestly — if something is partial, modeled, or untested, say so.
- **Known non-blocking lint:** `react-hooks/set-state-in-effect` (the `useEffect(() => { load() })` data-loading pattern) and a couple of `<img>` / `Math.random()` warnings exist codebase-wide and do **not** gate the build. Match the existing convention; don't churn files to silence them. Report any *new* error-level lint.

## Architecture
Four surfaces under `src/app/`:
- `(public)/` — external marketing + buyer flow (events, event detail, checkout, confirmation, about, etc.). SEO matters here (JSON-LD via `src/lib/jsonld.ts`, metadata, indexable past events).
- `portal/` — logged-in **member** experience (tickets, passport, feed, profile).
- `organizer/` — **organizer** dashboard. Left nav + page titles live in `src/app/organizer/layout.tsx`; active org/role comes from `org-context.tsx` (`useOrg()`).
- `admin/` — **platform admin**. Nav + titles in `src/app/admin/layout.tsx`.

Shared logic goes in `src/lib/` (e.g. `risk.ts`, `payouts.ts`, `terms.ts`, `evidence.ts`, `group-orders.ts`). Prefer extending these over duplicating logic in pages.

## Data & money rules (don't relearn these)
- **Test orders:** `orders.is_test` flags non-real orders (auto-flagged from sandbox checkout creds; admins toggle per order). **Every organizer-facing read and metric must filter `is_test = false`.** Admin keeps test orders visible but excludes them from money totals. The `ticket_tiers.quantity_sold` trigger already ignores test orders.
- **Organizer revenue = ticket face value** (`qty * unit_price − discount_amount`). The 3% Rameelo fee and 5% card fee are charged to the **buyer**, never deducted from the organizer. ACH (bank) is fee-free.
- **Order/dispute status:** treat `confirmed` as live; exclude `refunded`/`cancelled` and disputes (`dispute_status in (open, lost)`) from revenue/payout math.
- **Canonical identifiers:** order/receipt number is `RM-` + first 10 hex of the id, uppercased (`receiptNum()` pattern). Ticket QR payload is `RAMEELO:<orderId>` (matches the Apple Wallet pass + door scanner).

## Supabase / RLS conventions
- **RLS-first.** Every table is row-protected. Helpers exist: `get_my_role()`, `get_my_org_ids()`, `is_org_admin(org_id)`. Reuse them.
- **Privileged or cross-row writes go through `SECURITY DEFINER` RPCs**, not broad UPDATE policies (e.g. `add_org_member`, `set_order_dispute`, `admin_update_payout`, `mark_ticket_viewed`). This keeps the client from tampering with columns it shouldn't. Stamp audit fields (who/when) inside the RPC.
- After any schema change, run `notify pgrst, 'reload schema';` (use `apply_migration`, named in snake_case). New tables/columns won't appear in the Data API until reloaded.
- **Never store secrets or full sensitive numbers** (card PANs, full ACH account numbers) — last-4 only, masked.

## Design system
Brand palette (tokens in `globals.css`): **marigold** `#F5A623` (primary/gold), **aubergine** `#2E1B30` (deep plum), **ivory** `#FCF9F2` / `ivory-200` borders, **peacock** `#0E8C7A` (success/positive), **durga** `#7C1F2C` (danger/red), **ink** / `ink-muted` text. Fonts: `font-display` (headings), `font-ui` (body), `font-mono` (labels/eyebrows), `font-editorial`.

Match the established look — don't invent new patterns:
- Cards: `rounded-2xl border border-ivory-200 bg-white`; section eyebrows in `font-mono text-[9px]/[10px] uppercase tracking-widest text-ink-muted`.
- Status as color-coded pills (`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full`).
- **Mobile-responsive by default**: tables become stacked cards below `md`; summary cards reflow 2→4. No horizontal scroll on phones.
- Standard page shape: loading spinner → empty state (icon + headline + CTA) → content. List pages: summary cards + search/filters + table/cards, rows link to a `[id]` detail page. Add CSV export where an organizer would analyze data.

## Working conventions
- **Build to the spec; don't over-engineer.** When a feature is explicitly scoped (e.g. "MVP, do not build X"), respect the boundary.
- **Don't remove or rename existing functionality** unless asked or it directly conflicts with a new instruction; when instructions genuinely conflict, prefer the newest explicit spec and say what you reconciled.
- **Unbuilt nav items** render grayed-out with a "Soon" tag rather than dead links (see organizer layout `comingSoon`).
- New nav entries: add the item **and** its page-title regex in the layout, and an active-state `match` when sub-routes exist.
- Keep emoji out of nav icons — use the inline SVG `icon(...)` helper (organizer) / inline `<svg>` (admin).
- Commit/push **only when asked.** Write detailed, multi-section commit messages; end with the `Co-Authored-By: Claude Opus 4.8` trailer. Verify a clean build before pushing.

## Gotchas
- Activity tracking for dispute evidence lives on `orders` (`purchase_ip`, `*_viewed_at`, `wallet_*_at`, `terms_*`) and is wired at the point of action (receipt view, wallet route, checkout). When adding member-facing ticket actions, consider whether they should record activity via an RPC.
- The member ticket QR is a **real** scannable code (`src/components/QRCode.tsx`), not decorative — keep it that way.
