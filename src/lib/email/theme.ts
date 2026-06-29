// ── Rameelo email theme ──────────────────────────────────────────────────────
// One source of truth for brand colors, fonts, and addresses used across every
// transactional email (welcome, orders, notifications, …). Keep email-safe:
// inline styles + table layouts are applied in layout.ts using these tokens.

export const EMAIL = {
  site: "https://www.rameelo.com",
  // Sent from the verified Resend subdomain (mail.rameelo.com) so SPF/DKIM/DMARC
  // pass; replies route to support. Two From identities on the SAME verified domain:
  //  • from        — general/account mail (welcome, invites, password reset, …)
  //  • fromTickets — ticketing/order/purchase mail (receipts, comps, order alerts).
  // Splitting the identity makes order mail read as official and lets it build a
  // focused sending reputation. Both inherit the domain's existing DNS auth.
  from: "Rameelo <hello@mail.rameelo.com>",
  fromTickets: "Rameelo Tickets <tickets@mail.rameelo.com>",
  replyTo: "support@rameelo.com",
  support: "support@rameelo.com",
  // Absolute, production-hosted assets (email clients can't use relative paths).
  logoWhite: "https://www.rameelo.com/logo/rameelo-horizontal-white-transparent.png",
  logoRed: "https://www.rameelo.com/logo/rameelo-horizontal-red-transparent.png",
} as const;

// Brand palette (mirrors the app's design tokens in globals.css).
export const C = {
  marigold: "#F5A623",
  marigoldDark: "#B8780F",
  aubergine: "#2E1B30",
  aubergineLight: "#3D2543",
  ivory: "#FCF9F2",
  ivory200: "#ECE6DA",
  peacock: "#0E8C7A",
  durga: "#7C1F2C",
  ink: "#241C26",
  inkMuted: "#6E6675",
  inkFaint: "#A9A2B0",
  white: "#FFFFFF",
} as const;

// Web fonts are loaded via <link> in the head with robust system fallbacks
// (many clients ignore web fonts — the stack keeps the brand feel regardless).
export const FONT_HEAD = "'Bricolage Grotesque','Trebuchet MS',Helvetica,Arial,sans-serif";
export const FONT_BODY = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
