"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificationAudience = "user" | "admin";

export type NotificationIconKey =
  | "bell" | "ticket" | "event" | "group" | "friend" | "payout"
  | "alert" | "check" | "star" | "user" | "collegiate" | "org";

export type Notification = {
  id: string;
  user_id: string | null;
  audience: NotificationAudience;
  type: string;
  title: string;
  body: string;
  href: string | null;
  icon_key: NotificationIconKey;
  read: boolean;
  created_at: string;
};

type UseNotificationsOptions = {
  audience: NotificationAudience;
  limit?: number;
};

export function useNotifications({ audience, limit = 30 }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const query = supabase
      .from("notifications")
      .select("*")
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data } = await query;
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [audience, limit]);

  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${audience}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `audience=eq.${audience}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, limit));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `audience=eq.${audience}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, audience, limit]);

  const markRead = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    const supabase = createClient();
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unread.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", unread);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}
