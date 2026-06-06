"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { useNearestMetro } from "@/hooks/useNearestMetro";

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}
type NavProfile = { firstName: string; lastName: string; avatarUrl: string | null };

function NavAvatar({ profile, size = 28 }: { profile: NavProfile; size?: number }) {
  const initials = ((profile.firstName[0] ?? "") + (profile.lastName[0] ?? "")).toUpperCase() || "?";
  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.firstName} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, backgroundColor: avatarColor(profile.firstName), fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ─── Coming-soon tooltip wrapper ─────────────────────────────────────────────
function ComingSoon({ children, label = "Coming soon" }: { children: React.ReactNode; label?: string }) {
  return (
    <span className="relative group/cs">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-[999]
        opacity-0 group-hover/cs:opacity-100 transition-opacity duration-150">
        {/* Arrow */}
        <span className="block w-2 h-2 bg-ink rotate-45 mx-auto -mb-1 relative z-10" />
        <span className="block px-3 py-1.5 bg-ink text-white font-mono text-[9px] uppercase tracking-widest rounded-lg whitespace-nowrap shadow-xl">
          {label}
        </span>
      </span>
    </span>
  );
}

// ─── Category nav item (with subtitle + optional badge) ───────────────────────
function CatItem({
  href, label, sub, badge, active, comingSoon,
}: {
  href: string; label: string; sub: string; badge?: string; active?: boolean; comingSoon?: boolean;
}) {
  const inner = (
    <span className={`flex flex-col items-start px-4 py-3 rounded-xl transition-colors ${
      active ? "bg-aubergine/6" : "hover:bg-ink/5"
    }`}>
      <span className="flex items-center gap-1.5">
        <span className={`font-ui font-semibold text-[13px] leading-none ${active ? "text-aubergine" : "text-ink"}`}>
          {label}
        </span>
        {badge && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wide bg-red-500 text-white leading-none">
            {badge}
          </span>
        )}
        {comingSoon && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] font-medium uppercase tracking-wide bg-ink/8 text-ink/35 leading-none">
            Soon
          </span>
        )}
      </span>
      <span className={`font-ui text-[11px] mt-1 leading-none ${active ? "text-aubergine/55" : "text-ink/45"}`}>
        {sub}
      </span>
    </span>
  );

  if (comingSoon) {
    return (
      <ComingSoon>
        <span className="cursor-default">{inner}</span>
      </ComingSoon>
    );
  }

  return <Link href={href}>{inner}</Link>;
}

// ─── Main Nav ─────────────────────────────────────────────────────────────────
export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthChecked(true); return; }
      supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single()
        .then(({ data }) => {
          setProfile({ firstName: data?.first_name || user.email?.split("@")[0] || "Member", lastName: data?.last_name || "", avatarUrl: data?.avatar_url ?? null });
          setAuthChecked(true);
        });
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  const isLoggedIn = authChecked && profile !== null;
  const locationState = useNearestMetro();
  const locationLabel =
    locationState.status === "resolved"
      ? `${locationState.metro.city}, ${locationState.metro.state}`
      : locationState.status === "pending"
      ? null
      : null;

  const CATEGORIES = [
    { href: "/events",     label: "Events",      sub: "Buy tickets",          live: true, badge: "NEW" },
    { href: "/artists",    label: "Artists",      sub: "Singers · DJs · Dholis", live: true  },
    { href: "/collegiate", label: "Collegiate",   sub: "Teams & competitions", live: true },
    { href: "/community",  label: "Communities",  sub: "Circles · chats",      live: false },
    { href: "/photos",     label: "Photos",       sub: "Garba memory book",    live: false },
    { href: "/blog",       label: "Blog",         sub: "Culture & guides",     live: true  },
  ];

  return (
    <header className="sticky top-0 z-50 shadow-sm">

      {/* ── Tier 1: Announcement + utility ── */}
      <div style={{ background: "#1C0C26" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          {/* Left: event announcement */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marigold" />
            </span>
            <span className="font-mono text-[10px] text-white/55 tracking-wide">
              Navratri Oct 11 – 20 · season pass live
            </span>
          </div>

          {/* Right: utility links */}
          <div className="hidden sm:flex items-center gap-4">
            <ComingSoon label="Location selector coming soon">
              <span className="flex items-center gap-1 font-mono text-[10px] text-white/50 hover:text-white/80 transition-colors cursor-default">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locationState.status === "pending" ? (
                  <span className="inline-block w-14 h-2 rounded bg-white/15 animate-pulse" />
                ) : (
                  locationLabel ?? "Near you"
                )}
                <svg className="w-2.5 h-2.5 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </ComingSoon>

            <span className="h-3 w-px bg-white/15 shrink-0" />

            <Link href="/help" className="font-mono text-[10px] text-white/45 hover:text-white/80 transition-colors">
              Help
            </Link>

            <span className="h-3 w-px bg-white/15 shrink-0" />

            <Link href="/organizers" className="font-mono text-[10px] text-white/45 hover:text-white/80 transition-colors">
              Sell on Rameelo
            </Link>

            <span className="h-3 w-px bg-white/15 shrink-0" />

            <ComingSoon label="App coming soon">
              <span className="font-mono text-[10px] font-bold text-marigold hover:text-marigold/80 transition-colors cursor-default">
                Download app
              </span>
            </ComingSoon>
          </div>
        </div>
      </div>

      {/* ── Tier 2: Logo + Search + Auth ── */}
      <div className="bg-ivory border-b border-ivory-200">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[60px]">

          {/* Logo */}
          <div className="shrink-0">
            <Logo variant="red" height={28} />
          </div>

          {/* Search bar — compact + centered */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
            <div className="flex items-center gap-2.5 bg-ink/[0.06] border border-ink/[0.07] rounded-full px-4 py-1.5 hover:bg-ink/[0.09] transition-colors cursor-text">
              <svg className="w-4 h-4 text-ink/35 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="flex-1 font-ui text-[13px] text-ink/45 select-none">Search events, artists, cities…</span>
              <kbd className="flex items-center gap-0.5 font-mono text-[10px] bg-white/50 border border-ink/10 text-ink/40 px-1.5 py-0.5 rounded-md">
                <span style={{ fontSize: 11 }}>⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Right: wishlist, cart, auth */}
          <div className="flex items-center gap-1">
            {/* Wishlist */}
            <ComingSoon label="Wishlists coming soon">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-ivory-200 transition-colors cursor-default text-ink/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
            </ComingSoon>

            {/* Cart */}
            <ComingSoon label="Cart coming soon">
              <span className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-ivory-200 transition-colors cursor-default text-ink/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </span>
            </ComingSoon>

            <div className="w-px h-5 bg-ink/10 mx-1 hidden md:block" />

            {/* Auth area */}
            {authChecked && (
              <>
                {isLoggedIn ? (
                  <>
                    <div className="hidden md:flex items-center gap-2 px-2 py-1.5 rounded-[8px]">
                      <NavAvatar profile={profile!} size={26} />
                      <span className="font-ui text-sm font-medium text-ink">{profile!.firstName}</span>
                    </div>
                    <Link
                      href="/portal"
                      className="hidden md:flex items-center gap-1.5 bg-ink text-white font-ui text-sm font-semibold px-4 py-2 rounded-xl hover:bg-ink/85 transition-colors shadow-sm"
                    >
                      My Portal
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </>
                ) : (
                  <div className="hidden md:flex items-center gap-1">
                    <Link href="/auth/signin" className="font-ui text-sm font-medium text-ink-muted hover:text-ink px-3 py-2 rounded-xl hover:bg-ivory-200 transition-colors">
                      Sign in
                    </Link>
                    <Link
                      href="/portal"
                      className="flex items-center gap-1.5 bg-ink text-white font-ui text-sm font-semibold px-4 py-2 rounded-xl hover:bg-ink/85 transition-colors shadow-sm"
                    >
                      My Portal
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:bg-ivory-200 transition-colors ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tier 3: Category nav ── */}
      <div className="bg-[#f0ebe3] border-b border-ink/8 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Left: primary categories — negative side margin so item padding aligns with page edge */}
          <div className="flex items-center -ml-4">
            {CATEGORIES.map((cat) => (
              <CatItem
                key={cat.href}
                href={cat.href}
                label={cat.label}
                sub={cat.sub}
                badge={cat.badge}
                active={pathname.startsWith(cat.href) && cat.href !== "/"}
                comingSoon={!cat.live}
              />
            ))}
          </div>

          {/* Right: utility links */}
          <div className="flex items-center gap-6 shrink-0 py-3">
            <ComingSoon label="Sponsorship info coming soon">
              <span className="font-ui text-[13px] font-medium text-ink/40 cursor-default whitespace-nowrap">
                Sponsor with us
              </span>
            </ComingSoon>
            <Link
              href="/pricing"
              className={`font-ui text-[13px] font-medium transition-colors whitespace-nowrap ${pathname === "/pricing" ? "text-aubergine" : "text-ink/55 hover:text-ink"}`}
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div ref={mobileRef} className="md:hidden border-t border-ivory-200 bg-ivory px-4 py-3 space-y-0.5">
          {isLoggedIn && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-[10px] bg-white border border-ivory-200">
              <NavAvatar profile={profile!} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-ink truncate">{profile!.firstName} {profile!.lastName}</p>
                <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">Member</p>
              </div>
            </div>
          )}

          {/* Search bar mobile */}
          <div className="flex items-center gap-2.5 bg-white border border-ivory-200 rounded-xl px-4 py-2.5 mb-3">
            <svg className="w-4 h-4 text-ink/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="font-ui text-sm text-ink/30">Search events, artists, cities…</span>
          </div>

          {CATEGORIES.map((cat) => {
            const active = pathname.startsWith(cat.href) && cat.href !== "/";
            return (
              <div key={cat.href}>
                {cat.live ? (
                  <Link
                    href={cat.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-[8px] font-ui text-sm font-medium transition-colors ${
                      active ? "bg-aubergine/5 text-aubergine" : "text-ink-muted hover:text-ink hover:bg-ivory-200"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="font-mono text-[9px] text-ink/30">{cat.sub}</span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-[8px] text-ink/30">
                    <span className="font-ui text-sm font-medium">{cat.label}</span>
                    <span className="font-mono text-[9px] bg-ink/6 px-2 py-0.5 rounded">Coming soon</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-ink/6 pt-2 mt-2 space-y-0.5">
            <Link href="/organizers" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-[8px] font-ui text-sm text-ink-muted hover:text-ink hover:bg-ivory-200 transition-colors">Sell on Rameelo</Link>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-[8px] text-ink/30">
              <span className="font-ui text-sm">Sponsor with us</span>
              <span className="font-mono text-[9px] bg-ink/6 px-2 py-0.5 rounded">Coming soon</span>
            </div>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-[8px] font-ui text-sm text-ink-muted hover:text-ink hover:bg-ivory-200 transition-colors">Pricing</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-[8px] font-ui text-sm text-ink-muted hover:text-ink hover:bg-ivory-200 transition-colors">About</Link>
          </div>

          <div className="pt-3 pb-1 space-y-2">
            {isLoggedIn ? (
              <>
                <Link href="/portal" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-ink text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-xl text-center hover:bg-ink/85 transition-colors">
                  My Portal →
                </Link>
                <button onClick={handleSignOut}
                  className="w-full border border-ink/15 text-ink-muted font-ui text-sm font-medium px-4 py-2.5 rounded-xl text-center hover:bg-ivory-200 transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              authChecked && (
                <>
                  <Link href="/auth/signin" onClick={() => setMobileOpen(false)}
                    className="block border border-ink/15 text-ink font-ui text-sm font-semibold px-4 py-2.5 rounded-xl text-center hover:bg-ivory-200 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/auth/signup" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 bg-aubergine text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-xl text-center hover:bg-aubergine-light transition-colors">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
                    </span>
                    Join Rameelo — it&apos;s free
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
