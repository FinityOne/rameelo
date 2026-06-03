"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createUser, saveUser, signOut as clearLocalUser, type RameeloUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import { useNotifications } from "@/hooks/useNotifications";

// ── Nav structure ──────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  match?: (pathname: string) => boolean;
  badgeKey?: "pendingEvents";
};
type NavSection = { id: string; label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        exact: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        href: "/admin/organizations",
        label: "Organizations",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        href: "/admin/artists",
        label: "Artists",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        ),
      },
      {
        href: "/admin/collegiate",
        label: "Collegiate",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "events",
    label: "Events",
    items: [
      {
        href: "/admin/events/review",
        label: "Review Queue",
        badgeKey: "pendingEvents",
        match: (p) => p.startsWith("/admin/events/review"),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
      {
        href: "/admin/events",
        label: "All Events",
        // Active on the catalog + event detail/edit, but not the review/create sub-pages.
        match: (p) =>
          p === "/admin/events" ||
          (/^\/admin\/events\/[^/]+/.test(p) && !p.startsWith("/admin/events/review") && !p.startsWith("/admin/events/create")),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        href: "/admin/events/create",
        label: "Create Event",
        match: (p) => p.startsWith("/admin/events/create"),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      {
        href: "/admin/community/groups",
        label: "Groups",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
      {
        href: "/admin/community",
        label: "Moderation",
        exact: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        match: (p) => p.startsWith("/admin/orders"),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
          </svg>
        ),
      },
      {
        href: "/admin/financials",
        label: "Revenue",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        href: "/admin/pipeline",
        label: "Pipeline",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        ),
      },
      {
        href: "/admin/passport",
        label: "Passport Generator",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      },
      {
        href: "/admin/platform",
        label: "Settings",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

// ── Page titles ────────────────────────────────────────────────────────────────

const PAGE_TITLES: Array<{ test: (p: string) => boolean; title: string }> = [
  { test: (p) => p === "/admin",                                  title: "Dashboard" },
  { test: (p) => p === "/admin/users",                            title: "User Management" },
  { test: (p) => /^\/admin\/users\/[^/]+$/.test(p),              title: "User Details" },
  { test: (p) => p === "/admin/organizations",                    title: "Organizations" },
  { test: (p) => /^\/admin\/organizations\/[^/]+$/.test(p),      title: "Organization Details" },
  { test: (p) => p === "/admin/artists",                          title: "Artists" },
  { test: (p) => p === "/admin/collegiate",                       title: "Collegiate Teams" },
  { test: (p) => /^\/admin\/collegiate\/[^/]+\/edit$/.test(p),   title: "Edit Team" },
  { test: (p) => p === "/admin/collegiate/applications",          title: "Applications" },
  { test: (p) => p === "/admin/collegiate/create",                title: "Add Team" },
  { test: (p) => p === "/admin/events",                           title: "All Events" },
  { test: (p) => p === "/admin/events/review",                    title: "Review Queue" },
  { test: (p) => p === "/admin/events/create",                    title: "Create Event" },
  { test: (p) => /^\/admin\/events\/[^/]+\/edit$/.test(p),       title: "Edit Event" },
  { test: (p) => /^\/admin\/events\/[^/]+$/.test(p),             title: "Event Details" },
  { test: (p) => p === "/admin/community",                        title: "Moderation" },
  { test: (p) => p === "/admin/community/groups",                 title: "Community Groups" },
  { test: (p) => p === "/admin/orders",                           title: "Orders" },
  { test: (p) => /^\/admin\/orders\/[^/]+$/.test(p),             title: "Order Details" },
  { test: (p) => p === "/admin/financials",                       title: "Revenue" },
  { test: (p) => p === "/admin/notifications",                    title: "Notifications" },
  { test: (p) => p === "/admin/platform",                         title: "Platform Settings" },
  { test: (p) => p === "/admin/pipeline",                         title: "Sales Pipeline" },
  { test: (p) => p === "/admin/pipeline/new",                     title: "New Lead" },
  { test: (p) => /^\/admin\/pipeline\/[^/]+$/.test(p),           title: "Lead Detail" },
];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find((r) => r.test(pathname))?.title ?? "Admin";
}

// ── Nav item component ─────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
  badge,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
  onClick?: () => void;
}) {
  const active = item.match
    ? item.match(pathname)
    : item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-ui font-medium transition-all group ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-white/40 hover:text-white/75 hover:bg-white/[0.04]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-marigold" />
      )}
      <span className={`shrink-0 transition-colors ${active ? "text-marigold" : "text-white/30 group-hover:text-white/55"}`}>
        {item.icon}
      </span>
      <span className="flex-1 leading-none">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-bold font-mono bg-durga/90 text-white px-1.5 py-0.5 rounded-full leading-none">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingEvents, setPendingEvents] = useState(0);
  const { unreadCount } = useNotifications({ audience: "admin", limit: 1 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace("/auth/signin"); return; }

      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, email, role, avatar_url").eq("id", authUser.id).single(),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      ]);

      if (profile?.role !== "admin") { setUnauthorized(true); return; }

      setPendingEvents(count ?? 0);

      const rameeloUser = createUser({
        firstName: profile.first_name || "",
        lastName:  profile.last_name  || "",
        email:     profile.email      || authUser.email || "",
        phone: "", city: "", state: "",
        role: "admin",
        avatarUrl: profile.avatar_url || undefined,
      });
      saveUser(rameeloUser);
      setUser(rameeloUser);
    });
  }, [router]);

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    document.title = `Admin · ${pageTitle} | Rameelo`;
  }, [pageTitle]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalUser();
    router.push("/auth/signin");
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-display font-bold text-ink text-lg mb-1">Admin access required</p>
          <p className="font-ui text-ink-muted text-sm mb-6">You don&apos;t have permission to view this area.</p>
          <Link href="/portal" className="inline-flex items-center gap-2 bg-aubergine text-white font-ui font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all">
            Back to portal
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0F0B10" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F3F0" }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 220, backgroundColor: "#0F0B10", flexShrink: 0 }}
      >
        {/* Logo + admin badge */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <Link href="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 group">
            <Logo variant="white" height={22} href="" />
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(220,38,38,0.25)", color: "#FCA5A5" }}
            >
              Admin
            </span>
          </Link>
          {/* Platform status dot */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">Production</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="px-3 mb-1 font-mono text-[9px] uppercase tracking-widest text-white/18 select-none">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    badge={item.badgeKey === "pendingEvents" ? pendingEvents : undefined}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — back to portal + user */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-1">
          <Link
            href="/portal"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-ui text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            <span>Member Portal</span>
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui text-[12px] text-white/55 truncate leading-tight">{user.firstName} {user.lastName}</p>
              <p className="font-mono text-[9px] text-white/20 truncate">Mukhiya</p>
            </div>
            <button onClick={handleSignOut} title="Sign out" className="text-white/20 hover:text-white/50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-5 sm:px-7"
          style={{ height: 52, backgroundColor: "rgba(245,243,240,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-ink/50 hover:text-ink hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Portal label + page title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="hidden sm:inline-flex font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#EF4444" }}>
              Admin
            </span>
            <h1 className="font-display font-bold text-ink/80 truncate" style={{ fontSize: 14, letterSpacing: "-0.01em" }}>
              {pageTitle}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Search hint */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/10 bg-white/70 hover:bg-white hover:border-black/20 transition-all">
              <svg className="w-3.5 h-3.5 text-ink/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-mono text-[11px] text-ink/30">Search</span>
              <span className="font-mono text-[10px] text-ink/20 border border-black/10 rounded px-1 py-px">⌘K</span>
            </button>

            {/* Notification bell */}
            <Link
              href="/admin/notifications"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-ink/50 hover:text-ink hover:bg-black/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-durga rounded-full" />
              )}
            </Link>

            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-2 ring-white/80 ring-offset-1"
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.avatarInitials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
