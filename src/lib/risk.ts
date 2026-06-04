// ── Rameelo risk engine ──────────────────────────────────────────────────────
// Computes a 0–100 fraud-risk score per order from configurable indicators.
// Used by the organizer Risk & Disputes list + detail pages. Tune RISK_INDICATORS
// (weights / thresholds) in one place to recalibrate platform-wide.

export type RiskLevel = "Low" | "Medium" | "High";

export type RiskOrder = {
  id: string;
  user_id: string | null;
  created_at: string;
  purchase_ip: string | null;
  first_viewed_at: string | null;
  wallet_generated_at: string | null;
  checked_in_count: number;
  failed_payment_attempts: number;
};
export type RiskProfile = {
  created_at: string | null;
  last_login_at: string | null;
  total_logins: number | null;
} | null;

export type RiskContext = {
  order: RiskOrder;
  profile: RiskProfile;
  eventPassed: boolean;          // event date has passed
  sameIpAccounts: number;        // distinct accounts sharing this purchase IP (in org)
  samePaymentAccounts: number;   // distinct accounts sharing payment fingerprint (0 if untracked)
};

export type Indicator = {
  id: string;
  label: string;
  description: string;
  weight: number;
  triggered: (c: RiskContext) => boolean;
};

const NEW_ACCOUNT_WINDOW_MS = 60 * 60 * 1000; // account created < 1h before purchase

// Configurable indicator set (weights sum can exceed 100; score is clamped).
export const RISK_INDICATORS: Indicator[] = [
  {
    id: "new_account",
    label: "Account created shortly before purchase",
    description: "The buyer's account was created less than an hour before this order — a common pattern for throwaway accounts.",
    weight: 22,
    triggered: (c) => !!c.profile?.created_at &&
      (new Date(c.order.created_at).getTime() - new Date(c.profile.created_at).getTime()) < NEW_ACCOUNT_WINDOW_MS &&
      (new Date(c.order.created_at).getTime() - new Date(c.profile.created_at).getTime()) >= 0,
  },
  {
    id: "same_ip_accounts",
    label: "Multiple accounts from the same IP address",
    description: "This purchase IP is shared by two or more different accounts buying from your events.",
    weight: 24,
    triggered: (c) => c.sameIpAccounts >= 2,
  },
  {
    id: "same_payment",
    label: "Multiple accounts using the same payment method",
    description: "The same card / bank fingerprint has been used across multiple accounts.",
    weight: 24,
    triggered: (c) => c.samePaymentAccounts >= 2,
  },
  {
    id: "failed_payments",
    label: "Multiple failed payment attempts before success",
    description: "Several declined attempts preceded the successful charge — often card-testing behavior.",
    weight: 20,
    triggered: (c) => c.order.failed_payment_attempts >= 2,
  },
  {
    id: "never_viewed",
    label: "Ticket never viewed",
    description: "The buyer has never opened the ticket in the portal — unusual for a genuine attendee.",
    weight: 16,
    triggered: (c) => !c.order.first_viewed_at,
  },
  {
    id: "no_login_after",
    label: "Customer never logged in after purchase",
    description: "No login activity recorded after the order was placed.",
    weight: 14,
    triggered: (c) => !!c.profile && (!c.profile.last_login_at || new Date(c.profile.last_login_at) < new Date(c.order.created_at)),
  },
  {
    id: "not_scanned",
    label: "Ticket not scanned at the event",
    description: "The event has passed and no ticket from this order was ever checked in at the door.",
    weight: 22,
    triggered: (c) => c.eventPassed && (c.order.checked_in_count ?? 0) === 0,
  },
  {
    id: "no_ip",
    label: "Unusual / missing IP signal",
    description: "No purchase IP address was captured for this order, limiting fraud verification.",
    weight: 8,
    triggered: (c) => !c.order.purchase_ip,
  },
  {
    id: "guest_checkout",
    label: "Guest checkout (no account)",
    description: "Purchased without creating a Rameelo account, reducing identity signal.",
    weight: 8,
    triggered: (c) => !c.order.user_id,
  },
];

export const RISK_THRESHOLDS = { medium: 30, high: 60 }; // score >= → level

export function levelOf(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) return "High";
  if (score >= RISK_THRESHOLDS.medium) return "Medium";
  return "Low";
}

export function computeRisk(c: RiskContext): { score: number; level: RiskLevel; triggered: Indicator[] } {
  const triggered = RISK_INDICATORS.filter((ind) => {
    try { return ind.triggered(c); } catch { return false; }
  });
  const score = Math.min(100, triggered.reduce((s, i) => s + i.weight, 0));
  return { score, level: levelOf(score), triggered };
}

export const RISK_BADGE: Record<RiskLevel, string> = {
  Low: "bg-peacock/12 text-peacock",
  Medium: "bg-marigold/20 text-[#a06b00]",
  High: "bg-durga/15 text-durga",
};
