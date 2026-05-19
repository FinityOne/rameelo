import { createClient as createServerClient } from "@/lib/supabase/server";
import type { NotificationIconKey } from "@/hooks/useNotifications";

type InsertNotification = {
  user_id?: string | null;
  audience?: "user" | "admin";
  type: string;
  title: string;
  body?: string;
  href?: string;
  icon_key?: NotificationIconKey;
};

export async function createNotification(n: InsertNotification) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: n.user_id ?? null,
    audience: n.audience ?? "user",
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    href: n.href ?? null,
    icon_key: n.icon_key ?? "bell",
  });
  if (error) console.error("[notifications] insert error", error.message);
}

export async function createAdminNotification(n: Omit<InsertNotification, "user_id" | "audience">) {
  return createNotification({ ...n, user_id: null, audience: "admin" });
}
