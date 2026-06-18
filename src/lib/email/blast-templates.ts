// ── Email-blast template catalog ─────────────────────────────────────────────
// Selectable, pre-designed blast templates for the admin Email Blast tool. The
// admin picks a template instead of writing the subject/body by hand. This file
// is client-safe metadata only (no rendering) — the actual HTML builders live in
// build-blast.ts (server). Add a template here + a branch in build-blast.ts.

export type BlastTemplateKey = "tickets-live" | "custom";

export type BlastTemplateMeta = {
  key: BlastTemplateKey;
  name: string;
  emoji: string;
  description: string;
  /** Must an event be selected for this template to send? */
  requiresEvent: boolean;
  /** Does the admin supply the subject/body (free compose) rather than the template generating it? */
  custom: boolean;
};

export const BLAST_TEMPLATES: BlastTemplateMeta[] = [
  {
    key: "tickets-live",
    name: "Tickets are live",
    emoji: "🎟️",
    description: "An on-sale announcement for the selected event — lists the ticket tiers & prices and builds urgency off the sale-close date. One “Get tickets” CTA. Subject & copy are written for you.",
    requiresEvent: true,
    custom: false,
  },
  {
    key: "custom",
    name: "Custom message",
    emoji: "✍️",
    description: "Write your own subject and message. Optionally feature an event card with a “Get tickets” button.",
    requiresEvent: false,
    custom: true,
  },
];

export const blastTemplate = (key: string): BlastTemplateMeta | undefined =>
  BLAST_TEMPLATES.find(t => t.key === key);
