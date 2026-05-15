---
name: Rameelo project initialization
description: Next.js 16 app structure, pages, components, brand system, and design tokens for the Rameelo platform
type: project
---

## Stack
- Next.js 16.2.2 (App Router, Turbopack)
- React 19, TypeScript 5, Tailwind CSS v4

## Brand Guide — Rameelo 2026

### Colors
- Marigold 400: #F5A623 — PRIMARY ACTION (buttons, fills)
- Aubergine 500: #2E1B30 — HERO/DEPTH background
- Ivory 50: #FCF9F2 — CANVAS (page background)
- Ivory 200: #ECE3CC — SURFACE (cards, sub-surfaces)
- Peacock 400: #0E8C7A — ACCENT/LIVE events
- Durga 500: #7C1F2C — HERITAGE/festival marketing
- Ink 700: #3B2F3E — BODY text
- Ink 500: #6B5E6E — MUTED text

**Important**: Marigold-on-ivory is ONLY for fills/badges/iconography, NEVER body copy.

### Typography
- Display/Headline: Bricolage Grotesque 700, -2.5% tracking (72-96px display, 36-48px h1)
- UI Body/Label: Inter 400/600
- Editorial flourish: Fraunces Italic 500 (use ≤1 italic per layout)
- Eyebrow/Mono: JetBrains Mono 500, 12% tracking (10-13px)

### Design Principles
- Festive, never frantic
- Group-first, every screen
- Cultural, not costume

### Radius family: 6 / 10 / 16 / 24 / pill

### Audience
- Gujarati & South Asian diaspora
- Collegiate Raas teams
- Garba organizers

## File Structure
```
src/
  app/
    globals.css          — Tailwind v4 @theme brand tokens + keyframe animations
    layout.tsx           — Loads 4 Google Fonts with CSS variables
    page.tsx             — Homepage
    about/ events/ community/ tickets/ pricing/
  components/
    Nav.tsx              — R monogram logo, marigold CTA
    Footer.tsx           — Aubergine bg, brand footer
    ui/
      index.ts           — Re-exports all UI components
      Button.tsx         — primary/secondary/ghost/heritage variants
      Eyebrow.tsx        — JetBrains Mono eyebrow label
      Badge.tsx          — marigold/aubergine/peacock/durga/ivory/outline variants
      EventCard.tsx      — Ticket-shaped card with gradient header
      Avatar.tsx         — Initials avatar
  lib/
    data.ts              — Mock events, stats, testimonials, communityGroups, navLinks
```

## Tailwind v4 Font CSS Variables
- `--font-bricolage` → `font-display` class
- `--font-inter` → `font-ui` class  
- `--font-fraunces` → `font-editorial` class
- `--font-jetbrains` → `font-mono` class

**Why:** brand guide specifies exact fonts and sizes — reference globals.css @theme and component files.
