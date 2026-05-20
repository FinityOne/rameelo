"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createUser, saveUser, signOut as clearLocalUser, type RameeloUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import { OrgProvider, type OrgOption } from "./org-context";

// ── Nav structure ──────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  cta?: boolean;
};
type NavSection = { id: string; label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/organizer",
        label: "Hub",
        exact: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        href: "/organizer/sales",
        label: "Analytics",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
        href: "/organizer/events",
        label: "My Events",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        href: "/organizer/events/create",
        label: "Create Event",
        cta: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "audience",
    label: "Audience",
    items: [
      {
        href: "/organizer/tickets",
        label: "Orders",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      {
        href: "/organizer/financials",
        label: "Earnings",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: "/organizer/payouts",
        label: "Payouts",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "org",
    label: "Organization",
    items: [
      {
        href: "/organizer/organization",
        label: "Settings",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
    ],
  },
];

// ── Page titles ────────────────────────────────────────────────────────────────

const PAGE_TITLES: Array<{ test: (p: string) => boolean; title: string }> = [
  { test: (p) => p === "/organizer",                               title: "Hub" },
  { test: (p) => p === "/organizer/events",                        title: "My Events" },
  { test: (p) => p === "/organizer/events/create",                 title: "Create Event" },
  { test: (p) => /^\/organizer\/events\/[^/]+$/.test(p),          title: "Event Overview" },
  { test: (p) => /^\/organizer\/events\/[^/]+\/edit$/.test(p),    title: "Edit Event" },
  { test: (p) => /^\/organizer\/events\/[^/]+\/groups$/.test(p),  title: "Group Orders" },
  { test: (p) => /^\/organizer\/events\/[^/]+\/orders$/.test(p),  title: "Orders" },
  { test: (p) => p === "/organizer/tickets",                       title: "Orders" },
  { test: (p) => p === "/organizer/sales",                         title: "Analytics" },
  { test: (p) => p === "/organizer/financials",                    title: "Earnings" },
  { test: (p) => p === "/organizer/payouts",                       title: "Payouts" },
  { test: (p) => p === "/organizer/organization",                  title: "Organization Settings" },
];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find((r) => r.test(pathname))?.title ?? "Organizer Portal";
}

// ── Org Switcher ───────────────────────────────────────────────────────────────

function OrgSwitcher({
  orgs,
  activeOrg,
  onChange,
  onSetup,
}: {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  onChange: (org: OrgOption) => void;
  onSetup: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (orgs.length === 0) {
    return (
      <button
        onClick={onSetup}
        className="flex items-center gap-1.5 text-white/30 hover:text-marigold/70 transition-colors w-full"
      >
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest">Set up organization</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full group hover:opacity-90 transition-opacity"
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: "rgba(245,166,35,0.2)", border: "1px solid rgba(245,166,35,0.25)" }}
        >
          {activeOrg?.name[0] ?? "?"}
        </div>
        <p className="font-ui text-[11px] text-white/50 truncate flex-1 text-left leading-none">
          {activeOrg?.name ?? "Select org"}
        </p>
        {orgs.length > 1 && (
          <svg
            className={`w-3 h-3 text-white/25 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && orgs.length > 1 && (
        <div
          className="absolute left-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{ background: "#1A0826", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="px-3 pt-3 pb-1.5 font-mono text-[9px] uppercase tracking-widest text-white/25">
            Your Organizations
          </p>
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => { onChange(org); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/[0.06] transition-colors group"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{
                  background: activeOrg?.id === org.id ? "rgba(245,166,35,0.25)" : "rgba(255,255,255,0.1)",
                  border: `1px solid ${activeOrg?.id === org.id ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {org.name[0]}
              </div>
              <span className="font-ui text-[12px] text-white/60 group-hover:text-white/90 transition-colors flex-1 text-left truncate leading-none">
                {org.name}
              </span>
              {activeOrg?.id === org.id && (
                <svg className="w-3.5 h-3.5 text-marigold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-white/[0.07] mt-1">
            <Link
              href="/organizer/organization"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 font-ui text-[11px] text-white/30 hover:text-marigold/70 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add organization
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav item component ─────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = item.exact ? pathname === item.href : (
    item.href === "/organizer/events"
      ? pathname === "/organizer/events" || (/^\/organizer\/events\/[^/]+/.test(pathname) && !pathname.endsWith("/create"))
      : pathname.startsWith(item.href)
  );

  if (item.cta) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-ui font-semibold transition-all mt-1"
        style={{
          background: active ? "rgba(245,166,35,0.25)" : "rgba(245,166,35,0.12)",
          color: "#F5A623",
          border: "1px solid rgba(245,166,35,0.2)",
        }}
      >
        <span style={{ color: "#F5A623" }}>{item.icon}</span>
        <span className="flex-1 leading-none">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-ui font-medium transition-all group ${
        active ? "bg-white/[0.09] text-white" : "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-marigold" />
      )}
      <span className={`shrink-0 transition-colors ${active ? "text-marigold" : "text-white/30 group-hover:text-white/55"}`}>
        {item.icon}
      </span>
      <span className="flex-1 leading-none">{item.label}</span>
    </Link>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RameeloUser | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [activeOrg, setActiveOrgState] = useState<OrgOption | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setActiveOrg = useCallback((org: OrgOption) => {
    setActiveOrgState(org);
    try { localStorage.setItem("rameelo_active_org", JSON.stringify(org)); } catch { /* ignore */ }
  }, []);

  const pageTitle = getPageTitle(pathname);
  const isCreateEvent = pathname === "/organizer/events/create";

  useEffect(() => {
    document.title = `Organizer · ${pageTitle} | Rameelo`;
  }, [pageTitle]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace("/auth/signin"); return; }

      const [{ data: profile }, { data: orgRows }] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, email, role, avatar_url").eq("id", authUser.id).single(),
        supabase.from("org_members")
          .select("organizations(id, name, logo_url)")
          .eq("user_id", authUser.id),
      ]);

      if (profile?.role !== "organizer" && profile?.role !== "admin") {
        setUnauthorized(true);
        return;
      }

      // @ts-expect-error nested join type
      const orgList: OrgOption[] = (orgRows ?? []).map(r => r.organizations).filter(Boolean);
      setOrgs(orgList);

      // Restore saved org or default to first
      try {
        const saved = JSON.parse(localStorage.getItem("rameelo_active_org") ?? "null") as OrgOption | null;
        const valid = saved && orgList.find(o => o.id === saved.id);
        setActiveOrgState(valid ? saved : (orgList[0] ?? null));
      } catch {
        setActiveOrgState(orgList[0] ?? null);
      }

      const rameeloUser = createUser({
        firstName: profile.first_name || "",
        lastName:  profile.last_name  || "",
        email:     profile.email      || authUser.email || "",
        phone: "", city: "", state: "",
        role: profile.role,
        avatarUrl: profile.avatar_url || undefined,
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

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FCF9F2" }}>
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-display font-bold text-ink text-lg mb-1">Organizer access required</p>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, #1A0826 0%, #2D0C1A 100%)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-marigold animate-spin" />
      </div>
    );
  }

  return (
    <OrgProvider orgs={orgs} activeOrg={activeOrg} setActiveOrg={setActiveOrg}>
      <div className="min-h-screen flex" style={{ backgroundColor: "#FAF8F5" }}>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`fixed lg:sticky top-0 h-screen z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          style={{ width: 220, background: "linear-gradient(180deg, #1A0826 0%, #2D0C1A 60%, #1E0814 100%)", flexShrink: 0 }}
        >
          {/* Logo + org switcher */}
          <div className="px-4 pt-5 pb-4 border-b border-white/[0.07]">
            <Link href="/organizer" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 group mb-3">
              <Logo variant="white" height={22} href="" />
              <span
                className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "rgba(245,166,35,0.18)", color: "#F5A623" }}
              >
                Pro
              </span>
            </Link>
            <OrgSwitcher
              orgs={orgs}
              activeOrg={activeOrg}
              onChange={setActiveOrg}
              onSetup={() => { router.push("/organizer/organization"); setSidebarOpen(false); }}
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
            {SECTIONS.map((section) => (
              <div key={section.id}>
                <p className="px-3 mb-1 font-mono text-[9px] uppercase tracking-widest select-none" style={{ color: "rgba(255,255,255,0.15)" }}>
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-2 py-3 border-t border-white/[0.07] space-y-1">
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
                <p className="font-mono text-[9px] text-white/20 truncate">Aayojak</p>
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
            className="sticky top-0 z-30 flex items-center gap-3 px-5 sm:px-7"
            style={{ height: 52, backgroundColor: "rgba(250,248,245,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-ink/50 hover:text-ink hover:bg-black/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "rgba(245,166,35,0.12)", color: "#c97b00" }}>
                Organizer
              </span>
              <h1 className="font-display font-bold text-ink/75" style={{ fontSize: 14, letterSpacing: "-0.01em" }}>
                {pageTitle}
              </h1>
            </div>

            {/* Active org indicator — only when user has orgs */}
            {activeOrg && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0"
                style={{ background: "rgba(245,166,35,0.08)", borderColor: "rgba(245,166,35,0.2)" }}>
                <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ background: "rgba(245,166,35,0.25)", color: "#c97b00" }}>
                  {activeOrg.name[0]}
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: "#c97b00" }}>
                  {activeOrg.name}
                </span>
              </div>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {!isCreateEvent && (
                <Link
                  href="/organizer/events/create"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-ui font-semibold text-[12px] transition-all"
                  style={{ background: "linear-gradient(135deg, #F5A623, #E8901A)", color: "#1A0826", boxShadow: "0 1px 8px rgba(245,166,35,0.3)" }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Event
                </Link>
              )}

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
    </OrgProvider>
  );
}
