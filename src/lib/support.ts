// Shared taxonomy for the customer support-request system: issue types shown in
// the public form + admin filters, lifecycle statuses, and the human-friendly
// reference number. One source of truth for the form, the admin Support tab, and
// the notification emails.

export type SupportStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export const ISSUE_TYPES: { value: string; label: string }[] = [
  { value: "cant_find_tickets", label: "I can't find my tickets" },
  { value: "wrong_email",       label: "I used the wrong email at checkout" },
  { value: "no_confirmation",   label: "I didn't receive my confirmation email" },
  { value: "refund",            label: "Refund or cancellation" },
  { value: "transfer",          label: "Ticket transfer issue" },
  { value: "payment",           label: "Payment or billing problem" },
  { value: "event_change",      label: "Event date, details, or cancellation" },
  { value: "account_access",    label: "Account access or login" },
  { value: "group_order",       label: "Group order issue" },
  { value: "other",             label: "Something else" },
];

export const ISSUE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_TYPES.map((t) => [t.value, t.label]),
);

export function issueTypeLabel(value: string): string {
  return ISSUE_TYPE_LABEL[value] ?? value;
}

// Lifecycle. Ordered for the admin status picker; `tone` maps to brand colors.
export const STATUSES: {
  value: SupportStatus;
  label: string;
  pill: string;   // tailwind classes for a status pill
  dot: string;    // tailwind bg for a dot
}[] = [
  { value: "open",        label: "Open",                pill: "bg-marigold/20 text-[#a06b00]", dot: "bg-marigold" },
  { value: "in_progress", label: "In progress",         pill: "bg-aubergine/10 text-aubergine", dot: "bg-aubergine" },
  { value: "waiting",     label: "Waiting on customer", pill: "bg-[#3B4A6B]/12 text-[#3B4A6B]", dot: "bg-[#3B4A6B]" },
  { value: "resolved",    label: "Resolved",            pill: "bg-peacock/15 text-peacock", dot: "bg-peacock" },
  { value: "closed",      label: "Closed",              pill: "bg-ivory-200 text-ink-muted", dot: "bg-ink-muted" },
];

export const STATUS_META: Record<SupportStatus, { label: string; pill: string; dot: string }> =
  Object.fromEntries(STATUSES.map((s) => [s.value, { label: s.label, pill: s.pill, dot: s.dot }])) as Record<
    SupportStatus,
    { label: string; pill: string; dot: string }
  >;

// Canonical reference shown to customers + admins: SR- + first 8 hex of the id.
export function srRef(id: string): string {
  return "SR-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
