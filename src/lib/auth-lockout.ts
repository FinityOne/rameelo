import type { SupabaseClient } from "@supabase/supabase-js";

// Account lockout: after LOCKOUT_MAX_FAILED wrong sign-in codes, the email is
// locked for LOCKOUT_MINUTES. Backed by the service-role-only
// auth_login_lockouts table, so a client can't read or tamper with it. A burst
// of failures within the window counts toward the lock; an idle gap longer than
// the window resets the counter.

export const LOCKOUT_MAX_FAILED = 3;
export const LOCKOUT_MINUTES = 30;
const WINDOW_MS = LOCKOUT_MINUTES * 60_000;

type Admin = SupabaseClient;

/** Is this email currently locked? Returns minutes remaining when locked. */
export async function getLockout(admin: Admin, email: string): Promise<{ locked: boolean; minutesLeft: number }> {
  const { data } = await admin
    .from("auth_login_lockouts")
    .select("locked_until")
    .eq("email", email)
    .maybeSingle();
  const until = data?.locked_until ? new Date(data.locked_until as string).getTime() : 0;
  if (until > Date.now()) return { locked: true, minutesLeft: Math.max(1, Math.ceil((until - Date.now()) / 60_000)) };
  return { locked: false, minutesLeft: 0 };
}

/** Record one failed attempt; locks the email once the threshold is reached. */
export async function recordFailedAttempt(admin: Admin, email: string): Promise<{ locked: boolean; minutesLeft: number }> {
  const now = Date.now();
  const { data } = await admin
    .from("auth_login_lockouts")
    .select("failed_attempts, updated_at")
    .eq("email", email)
    .maybeSingle();

  const lastUpdate = data?.updated_at ? new Date(data.updated_at as string).getTime() : 0;
  // Reset a stale window (no failures for longer than the lock duration).
  let failed = now - lastUpdate > WINDOW_MS ? 0 : (data?.failed_attempts ?? 0);
  failed += 1;

  if (failed >= LOCKOUT_MAX_FAILED) {
    await admin.from("auth_login_lockouts").upsert(
      { email, failed_attempts: 0, locked_until: new Date(now + WINDOW_MS).toISOString(), updated_at: new Date(now).toISOString() },
      { onConflict: "email" },
    );
    return { locked: true, minutesLeft: LOCKOUT_MINUTES };
  }

  await admin.from("auth_login_lockouts").upsert(
    { email, failed_attempts: failed, locked_until: null, updated_at: new Date(now).toISOString() },
    { onConflict: "email" },
  );
  return { locked: false, minutesLeft: 0 };
}

/** Clear any lockout / failure count (called after a successful sign-in). */
export async function clearLockout(admin: Admin, email: string): Promise<void> {
  await admin.from("auth_login_lockouts").delete().eq("email", email);
}
