"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createUser, saveUser, signOut as clearLocalUser, type RameeloUser, type UserRole } from "@/lib/auth";
import Logo from "@/components/Logo";
import { NotificationDropdown } from "@/components/NotificationDropdown";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  highlight?: boolean;
  external?: boolean;
  groupStart?: string; // renders a mini sub-divider above this item
};

const MEMBER_NAV: NavItem[] = [
  {
    href: "/portal",
    label: "Dashboard",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: "/portal/tickets",
    label: "My Tickets",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  },
  {
    href: "/portal/community",
    label: "Community",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    badge: "🔴",
  },
  {
    href: "/portal/friends",
    label: "Friends",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    badge: "4",
  },
  {
    href: "/portal/groups",
    label: "My Groups",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  },
  {
    href: "/portal/feed",
    label: "Activity Feed",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
  },
  {
    href: "/portal/refer",
    label: "Refer & Earn",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>,
    highlight: true,
  },
  {
    href: "/events",
    label: "Find Events",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    external: true,
  },
  {
    href: "/portal/profile",
    label: "Profile",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
];

const ORGANIZER_NAV: NavItem[] = [
  {
    href: "/portal/organizer",
    label: "Hub",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: "/portal/organizer/events",
    label: "My Events",
    groupStart: "Events",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    href: "/portal/organizer/tickets",
    label: "Attendees",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    href: "/portal/organizer/sales",
    label: "Analytics",
    groupStart: "Money",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    href: "/portal/organizer/financials",
    label: "Earnings",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    href: "/portal/organizer/payouts",
    label: "Payouts",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  },
  {
    href: "/portal/organizer/organization",
    label: "My Organization",
    groupStart: "Settings",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    href: "/portal/admin",
    label: "Admin Panel",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    href: "/portal/admin/events",
    label: "Event Review",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    href: "/portal/admin/users",
    label: "User Management",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    href: "/portal/admin/organizations",
    label: "Organizations",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    href: "/portal/admin/artists",
    label: "Artists",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
  },
  {
    href: "/portal/admin/financials",
    label: "Financials",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    href: "/portal/admin/community",
    label: "Community",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    href: "/portal/admin/collegiate",
    label: "Collegiate Teams",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>,
  },
  {
    href: "/portal/admin/platform",
    label: "Platform Settings",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
  },
  {
    href: "/portal/admin/notifications",
    label: "Notifications",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  },
];

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const active = !item.external && (
    item.href === "/portal/organizer" ? pathname === "/portal/organizer" :
    item.href === "/portal" ? pathname === "/portal" :
    item.href === "/portal/groups" ? pathname.startsWith("/portal/groups") || pathname.startsWith("/portal/group-chat") :
    pathname.startsWith(item.href)
  );
  const isHighlight = !!item.highlight;

  return (
    <>
      {item.groupStart && (
        <div className="px-3 pt-3 pb-0.5 flex items-center gap-2">
          <span className="font-mono text-[8px] uppercase tracking-widest text-white/15">{item.groupStart}</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>
      )}
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
          active ? "bg-marigold/15 text-marigold"
          : isHighlight ? "bg-marigold/10 text-marigold hover:bg-marigold/20"
          : "text-white/50 hover:text-white hover:bg-white/5"
        }`}
      >
        <span className={`shrink-0 ${active || isHighlight ? "text-marigold" : "text-white/40 group-hover:text-white/70"}`}>
          {item.icon}
        </span>
        <span className={`font-ui font-medium text-sm ${isHighlight ? "text-marigold" : ""}`}>{item.label}</span>
        {item.badge === "🔴" && <span className="ml-auto w-2 h-2 bg-durga rounded-full animate-pulse" />}
        {item.badge && item.badge !== "🔴" && (
          <span className="ml-auto bg-marigold text-aubergine text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
        )}
        {item.external && (
          <svg className="w-3 h-3 ml-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </Link>
    </>
  );
}

const ROLE_META: Record<UserRole, { label: string; sublabel: string; cls: string; dot: string }> = {
  user:      { label: 'Khelaiya',  sublabel: 'Community Member', cls: 'bg-marigold/20 text-aubergine',         dot: 'bg-marigold' },
  organizer: { label: 'Aayojak',   sublabel: 'Event Organizer',  cls: 'bg-peacock/15 text-peacock',             dot: 'bg-peacock' },
  admin:     { label: 'Mukhiya',   sublabel: 'Platform Admin',   cls: 'bg-durga/15 text-durga',                 dot: 'bg-durga' },
};

function RoleBadge({ role, size = 'sm' }: { role: UserRole; size?: 'sm' | 'lg' }) {
  const meta = ROLE_META[role];
  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${meta.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest">{meta.label}</span>
      </div>
    );
  }
  return (
    <span className={`ml-auto text-[9px] font-bold font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-full ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function NavDivider({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1 flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-widest text-white/20">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ticketCount, setTicketCount] = useState<number>(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) {
        router.replace("/auth/signin");
        return;
      }

      // Fetch profile + ticket count in parallel
      const [{ data: profile }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, email, phone, city, state, role, avatar_url")
          .eq("id", authUser.id)
          .single(),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("status", "confirmed"),
      ]);
      setTicketCount(count ?? 0);

      const meta = authUser.user_metadata ?? {};
      const firstName = profile?.first_name || meta.firstName || authUser.email?.split("@")[0] || "Member";
      const lastName  = profile?.last_name  || meta.lastName  || "";
      const role = (profile?.role ?? 'user') as UserRole;

      const rameeloUser = createUser({
        firstName,
        lastName,
        email: profile?.email || authUser.email || "",
        phone: profile?.phone || meta.phone || "",
        city:  profile?.city  || meta.city  || "",
        state: profile?.state || meta.state || "",
        role,
        avatarUrl: profile?.avatar_url || undefined,
      });
      saveUser(rameeloUser);
      setUser(rameeloUser);
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalUser();
    router.push("/auth/signin");
  }

  const role = user?.role ?? 'user';

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FCF9F2" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 240, backgroundColor: "#2E1B30", flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <Link href="/portal" onClick={() => setSidebarOpen(false)} className="block">
            <Logo variant="white" height={26} href="" />
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 leading-none mt-1.5 pl-0.5">Member Portal</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">

          {/* Member section — everyone */}
          <NavDivider label="Member" />
          {MEMBER_NAV.map((item) => {
            const navItem = item.href === "/portal/tickets" && ticketCount > 0
              ? { ...item, badge: String(ticketCount) }
              : item;
            return <NavLink key={item.href} item={navItem} pathname={pathname} onClick={() => setSidebarOpen(false)} />;
          })}

          {/* Organizer section */}
          {(role === 'organizer' || role === 'admin') && (
            <>
              <NavDivider label="Organizer" />
              {ORGANIZER_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setSidebarOpen(false)} />
              ))}
            </>
          )}

          {/* Admin section */}
          {role === 'admin' && (
            <>
              <NavDivider label="Admin" />
              {ADMIN_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setSidebarOpen(false)} />
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/8">
          <Link
            href="/portal/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: user.avatarColor }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui font-semibold text-white text-sm truncate">{user.firstName} {user.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1 h-1 rounded-full shrink-0 ${ROLE_META[role].dot}`} />
                <p className="font-mono text-[9px] text-white/40 truncate">{ROLE_META[role].label}</p>
              </div>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="font-ui text-xs">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 border-b border-ivory-200" style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-4 px-4 sm:px-6 py-3.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="flex-1">
              <p className="font-display font-bold text-ink text-sm">
                {pathname === "/portal" && `Good evening, ${user.firstName} 👋`}
                {pathname === "/portal/tickets" && "My Tickets"}
                {pathname === "/portal/feed" && "Activity Feed"}
                {pathname === "/portal/refer" && "Refer & Earn"}
                {pathname === "/portal/profile" && "Profile"}
                {pathname === "/portal/organizer" && "Organizer Hub"}
                {pathname === "/portal/organizer/events" && "My Events"}
                {/^\/portal\/organizer\/events\/[^/]+$/.test(pathname) && "Event Details"}
                {pathname === "/portal/organizer/sales" && "Analytics"}
                {pathname === "/portal/organizer/tickets" && "Attendees"}
                {pathname === "/portal/organizer/payouts" && "Payouts"}
                {pathname === "/portal/admin" && "Admin Panel"}
                {pathname === "/portal/admin/events" && "Event Review"}
                {/^\/portal\/admin\/events\/[^/]+$/.test(pathname) && "Review Event"}
                {pathname === "/portal/admin/users" && "User Management"}
                {pathname === "/portal/admin/organizations" && "Organizations"}
                {/^\/portal\/admin\/organizations\/[^/]+$/.test(pathname) && "Organization Details"}
                {pathname === "/portal/admin/artists" && "Artists"}
                {pathname === "/portal/admin/financials" && "Financial Overview"}
                {pathname === "/portal/admin/community" && "Community Moderation"}
                {pathname === "/portal/community" && "Community"}
                {pathname === "/portal/friends" && "Friends"}
                {pathname === "/portal/groups" && "My Groups"}
                {pathname === "/portal/admin/platform" && "Platform Settings"}
                {pathname === "/portal/admin/notifications" && "Admin Notifications"}
                {pathname === "/portal/organizer/financials" && "Earnings"}
                {pathname === "/portal/organizer/organization" && "My Organization"}
                {pathname.startsWith("/portal/events/") && "Event Details"}
                {pathname.startsWith("/portal/group-chat/") && "Group Chat"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Role chip — top right */}
              <div className="hidden sm:block">
                <RoleBadge role={role} size="lg" />
              </div>

              <NotificationDropdown role={role} />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border border-ivory-200 hover:border-aubergine/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: user.avatarColor }}>
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
                  </div>
                  <span className="font-ui text-sm font-medium text-ink hidden sm:block">{user.firstName}</span>
                  <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-ivory-200 shadow-lg overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-ivory-200">
                        <p className="font-ui font-semibold text-ink text-sm">{user.firstName} {user.lastName}</p>
                        <p className="font-mono text-[10px] text-ink-muted truncate mb-2">{user.email}</p>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${ROLE_META[role].cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_META[role].dot}`} />
                          <span className="font-mono text-[9px] font-bold uppercase tracking-widest">{ROLE_META[role].label}</span>
                          <span className="font-ui text-[9px] text-current opacity-60">· {ROLE_META[role].sublabel}</span>
                        </div>
                      </div>
                      <div className="py-1">
                        {[
                          { href: "/portal", label: "Dashboard" },
                          { href: "/portal/tickets", label: "My Tickets" },
                          { href: "/portal/profile", label: "Edit Profile" },
                        ].map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} className="block px-4 py-2.5 font-ui text-sm text-ink hover:bg-ivory transition-colors">
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-ivory-200 mt-1 pt-1">
                          <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 font-ui text-sm text-durga hover:bg-ivory transition-colors">
                            Sign out
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
