"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, signOut, type RameeloUser } from "@/lib/auth";

const NAV_ITEMS = [
  {
    href: "/portal",
    label: "Dashboard",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: "/portal/tickets",
    label: "My Tickets",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    badge: "3",
  },
  {
    href: "/portal/feed",
    label: "Activity Feed",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    badge: "🔴",
  },
  {
    href: "/portal/group-chat/RM-GROUP01",
    label: "Group Chat",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
    badge: "🔴",
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

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/auth/signin");
    } else {
      setUser(u);
    }
  }, [router]);

  function handleSignOut() {
    signOut();
    router.push("/auth/signin");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="w-10 h-10 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FCF9F2" }}>
      {/* Sidebar overlay (mobile) */}
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
          <Link href="/portal" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#F5A623" }}>
              <span className="font-display font-bold text-aubergine">R</span>
            </div>
            <div>
              <p className="font-display font-bold text-white text-base leading-none">Rameelo</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 leading-none mt-0.5">Member Portal</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = !item.external && (item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href));
            const isHighlight = (item as { highlight?: boolean }).highlight;
            const badge = (item as { badge?: string }).badge;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${active ? "bg-marigold/15 text-marigold" : isHighlight ? "bg-marigold/10 text-marigold hover:bg-marigold/20" : "text-white/50 hover:text-white hover:bg-white/5"}`}
              >
                <span className={`shrink-0 transition-colors ${active || isHighlight ? "text-marigold" : "text-white/40 group-hover:text-white/70"}`}>
                  {item.icon}
                </span>
                <span className={`font-ui font-medium text-sm ${isHighlight ? "text-marigold" : ""}`}>{item.label}</span>
                {badge === "🔴" && (
                  <span className="ml-auto w-2 h-2 bg-durga rounded-full animate-pulse" />
                )}
                {badge && badge !== "🔴" && (
                  <span className="ml-auto bg-marigold text-aubergine text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
                {item.external && (
                  <svg className="w-3 h-3 ml-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user profile */}
        <div className="px-3 py-4 border-t border-white/8">
          <Link
            href="/portal/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: user.avatarColor }}>
              {user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-ui font-semibold text-white text-sm truncate">{user.firstName} {user.lastName}</p>
              <p className="font-mono text-[10px] text-white/30 truncate">{user.email}</p>
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
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 border-b border-ivory-200" style={{ backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-4 px-4 sm:px-6 py-3.5">
            {/* Hamburger (mobile) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Page title area */}
            <div className="flex-1">
              <p className="font-display font-bold text-ink text-sm">
                {pathname === "/portal" && `Good evening, ${user.firstName} 👋`}
                {pathname === "/portal/tickets" && "My Tickets"}
                {pathname === "/portal/feed" && "Activity Feed"}
                {pathname === "/portal/refer" && "Refer & Earn"}
                {pathname === "/portal/profile" && "Profile"}
                {pathname.startsWith("/portal/events/") && "Event Details"}
                {pathname.startsWith("/portal/group-chat/") && "Group Chat"}
              </p>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Notification */}
              <button className="relative w-9 h-9 rounded-xl border border-ivory-200 flex items-center justify-center text-ink-muted hover:text-ink hover:border-aubergine/30 transition-all">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:18,height:18}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-durga rounded-full" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border border-ivory-200 hover:border-aubergine/30 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: user.avatarColor }}>
                    {user.avatarInitials}
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
                        <p className="font-mono text-[10px] text-ink-muted truncate">{user.email}</p>
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

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
