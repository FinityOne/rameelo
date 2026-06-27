import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves which admins should receive a given admin-targeted email, applying the
// per-email routing configured on /admin/emails/routing (all admins vs a selected
// subset). Backed by the get_admin_recipients RPC. Fails OPEN: on any RPC error we
// return the caller's fallback (typically the full admin list the notify RPC
// already fetched) so a config/availability hiccup never silently drops an alert.
//
// The set of email keys that are actually routable through this — i.e. broadcast
// admin alerts whose notify routes consult getAdminRecipients. Kept here so the
// control UI and the routes agree on exactly one list.
export const ROUTABLE_ADMIN_EMAILS = [
  "new-user-signup",
  "organizer-login",
  "sponsorship-inquiry",
  "promotion-entry",
  "event-interest",
  "onboarding-signed",
] as const;

export type RoutableAdminEmailKey = (typeof ROUTABLE_ADMIN_EMAILS)[number];

export async function getAdminRecipients(
  supabase: SupabaseClient,
  emailKey: RoutableAdminEmailKey,
  fallback: string[] = [],
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_admin_recipients", { p_email_key: emailKey });
  if (error) return fallback.filter(Boolean);
  return (Array.isArray(data) ? (data as string[]) : []).filter(Boolean);
}
