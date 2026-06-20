import type { SupabaseClient } from "@supabase/supabase-js";

// Records a sent (or failed) email into email_logs via the SECURITY DEFINER RPC.
// Best-effort: never throws, so a logging hiccup can't break the send flow.
export async function recordEmailLog(
  supabase: SupabaseClient,
  p: {
    userId?: string | null;
    toEmail: string;
    type: string;
    subject?: string;
    status: "sent" | "failed";
    trigger: "automatic" | "manual";
    providerId?: string | null;
    error?: string | null;
    orderId?: string | null;
  },
): Promise<void> {
  try {
    await supabase.rpc("record_email_log", {
      p_user_id: p.userId ?? null,
      p_to_email: p.toEmail,
      p_type: p.type,
      p_subject: p.subject ?? "",
      p_status: p.status,
      p_trigger: p.trigger,
      p_provider_id: p.providerId ?? "",
      p_error: p.error ?? "",
      p_order_id: p.orderId ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
}
