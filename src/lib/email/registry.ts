// ── Platform email registry ──────────────────────────────────────────────────
// One transparent catalog of every Rameelo email: what it is, who it's for,
// how it fires (automatic vs manual), and whether it's live yet. Powers the
// admin Emails page. When you ship a new email, add/flip an entry here.

export type EmailTrigger = "automatic" | "manual" | "both";
export type EmailStatus = "live" | "planned";
export type EmailCategory = "Member" | "Orders & Tickets" | "Organizer" | "Payments" | "Platform";

export type EmailDef = {
  key: string;
  name: string;
  description: string;
  audience: string;
  category: EmailCategory;
  status: EmailStatus;
  trigger: EmailTrigger;
  fires: string; // plain-language: when/how it sends
};

export const EMAIL_REGISTRY: EmailDef[] = [
  {
    key: "welcome",
    name: "Welcome email",
    description: "Warm intro inviting a new member to log in, explore Garba 2026 events, buy tickets, and start their Garba Passport.",
    audience: "New members",
    category: "Member",
    status: "live",
    trigger: "both",
    fires: "Automatically on account creation · Manual resend from a user's detail page",
  },
  {
    key: "org-invite",
    name: "Organization invite",
    description: "Invites someone to join an organization's team, with a claim-on-login link.",
    audience: "Organizers",
    category: "Organizer",
    status: "live",
    trigger: "automatic",
    fires: "When an organizer or admin invites a team member",
  },
  {
    key: "password-reset",
    name: "Password reset",
    description: "A secure link (valid 24 hours) for a member to set a new password — branded, not Supabase's default email.",
    audience: "Members",
    category: "Member",
    status: "live",
    trigger: "manual",
    fires: "Triggered by an admin from a user's detail page",
  },

  // ── Planned (not yet built) ──
  {
    key: "group-created",
    name: "Group link created",
    description: "Sends the group's creator their shareable link, explains how group orders work, and (when the event has discounts) encourages hitting the headcount for bigger savings.",
    audience: "Members",
    category: "Orders & Tickets",
    status: "live",
    trigger: "automatic",
    fires: "When someone creates a group order link",
  },
  {
    key: "group-joined",
    name: "Group member joined",
    description: "Notifies the group host when someone joins their group link, with the event info and a link to the group page.",
    audience: "Members",
    category: "Orders & Tickets",
    status: "live",
    trigger: "automatic",
    fires: "When someone joins a group order link",
  },
  {
    key: "group-ticket-claim",
    name: "Group ticket claim",
    description: "Tells a group member that someone paid for the group and reserved tickets for them, with a link to sign in / create an account and claim them.",
    audience: "Buyers",
    category: "Orders & Tickets",
    status: "live",
    trigger: "automatic",
    fires: "When one person checks out a group order — each other member gets a claim link",
  },
  {
    key: "order-confirmation",
    name: "Order confirmation & receipt",
    description: "Receipt after a purchase: pricing breakdown, total tickets, event summary with directions, and links to view tickets in the portal (account required) and buy more.",
    audience: "Buyers",
    category: "Orders & Tickets",
    status: "live",
    trigger: "both",
    fires: "Automatically on a confirmed order · Manual resend from an order's detail page",
  },
  {
    key: "event-reminder",
    name: "Event reminder",
    description: "A nudge a few days before an event the member holds tickets to.",
    audience: "Buyers",
    category: "Orders & Tickets",
    status: "planned",
    trigger: "automatic",
    fires: "Scheduled before the event date",
  },
  {
    key: "ticket-transfer",
    name: "Ticket transfer",
    description: "Notifies the recipient when a ticket is transferred to them.",
    audience: "Members",
    category: "Orders & Tickets",
    status: "planned",
    trigger: "automatic",
    fires: "On a ticket transfer",
  },
  {
    key: "tickets-live",
    name: "Tickets-now-live alert",
    description: "Tells interested fans when a “coming soon” event's tickets go on sale.",
    audience: "Interested fans",
    category: "Orders & Tickets",
    status: "planned",
    trigger: "manual",
    fires: "When an admin flips an event to selling and notifies its interest list",
  },
  {
    key: "payout-status",
    name: "Payout status",
    description: "Updates an organizer when a payout request is approved, paid, or declined.",
    audience: "Organizers",
    category: "Payments",
    status: "planned",
    trigger: "automatic",
    fires: "On a payout status change",
  },
  {
    key: "refund-dispute",
    name: "Refund & dispute notice",
    description: "Notifies the buyer and organizer on refunds, chargebacks, and dispute updates.",
    audience: "Members & Organizers",
    category: "Payments",
    status: "planned",
    trigger: "automatic",
    fires: "On a refund or dispute event",
  },
  {
    key: "sponsorship-inquiry",
    name: "Sponsorship inquiry alert",
    description: "Notifies all platform admins, with the full form details, when someone submits the /sponsor advertising form.",
    audience: "Admins",
    category: "Platform",
    status: "live",
    trigger: "automatic",
    fires: "When a sponsorship inquiry is submitted",
  },
  {
    key: "onboarding-invite",
    name: "Organizer onboarding link",
    description: "Emails a lead the onboarding questionnaire link (currently copy-pasted from the admin org page).",
    audience: "Organizer leads",
    category: "Organizer",
    status: "planned",
    trigger: "manual",
    fires: "Sent by an admin from the organization page",
  },
];
