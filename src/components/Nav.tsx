"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { navLinks } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

const AVATAR_COLORS = ["#7C1F2C", "#0E8C7A", "#2E1B30", "#D4891B", "#5a1e7a", "#892240", "#1a4a5e"];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

type NavProfile = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

function RLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
      <div className="w-8 h-8 bg-marigold rounded-[8px] flex items-center justify-center shadow-sm">
        <span className="font-display font-bold text-aubergine text-[18px] leading-none" style={{ letterSpacing: "-0.03em" }}>R</span>
      </div>
      <span className="font-display font-bold text-ink text-[17px] leading-none hidden sm:block" style={{ letterSpacing: "-0.02em" }}>Rameelo</span>
    </Link>
  );
}

function Avatar({ profile, size = 28 }: { profile: NavProfile; size?: number }) {
  const initials = ((profile.firstName[0] ?? "") + (profile.lastName[0] ?? "")).toUpperCase() || "?";
  const color = avatarColor(profile.firstName);
  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.firstName} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthChecked(true); return; }
      supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setProfile({
            firstName: data?.first_name || user.email?.split("@")[0] || "Member",
            lastName: data?.last_name || "",
            avatarUrl: data?.avatar_url ?? null,
          });
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

  return (
    <header className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-sm border-b border-ivory-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <RLogo />

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-0.5">
          {navLinks
            .filter((l) => l.label !== "Home")
            .map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`relative px-3.5 py-2 font-ui text-sm font-medium transition-colors rounded-[8px] ${
                      active ? "text-aubergine bg-aubergine-faint" : "text-ink-muted hover:text-ink hover:bg-ivory-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Avatar + name */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-[8px]">
                <Avatar profile={profile!} size={28} />
                <span className="font-ui text-sm font-medium text-ink">{profile!.firstName}</span>
              </div>

              {/* Portal button */}
              <Link
                href="/portal"
                className="flex items-center gap-1.5 bg-aubergine text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] hover:bg-aubergine-light transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                My Portal
              </Link>
            </>
          ) : (
            <>
              {/* Only show auth buttons once check is done to avoid flash */}
              {authChecked && (
                <>
                  <Link
                    href="/auth/signin"
                    className="font-ui text-sm font-medium text-ink-muted hover:text-ink px-3 py-2 rounded-[8px] hover:bg-ivory-200 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="relative flex items-center gap-2 bg-aubergine text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] hover:bg-aubergine-light transition-colors shadow-sm"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
                    </span>
                    Join Rameelo
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-[8px] text-ink-muted hover:bg-ivory-200 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ivory-200 bg-ivory px-4 py-3 space-y-0.5">
          {/* Logged-in profile strip */}
          {isLoggedIn && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-[10px] bg-white border border-ivory-200">
              <Avatar profile={profile!} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-ui text-sm font-semibold text-ink truncate">{profile!.firstName} {profile!.lastName}</p>
                <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">Member</p>
              </div>
            </div>
          )}

          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-[8px] font-ui text-sm font-medium transition-colors ${
                  active ? "bg-aubergine-faint text-aubergine font-semibold" : "text-ink-muted hover:text-ink hover:bg-ivory-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 pb-1 space-y-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/portal"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-aubergine text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] text-center hover:bg-aubergine-light transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to My Portal
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full block border border-ink/15 text-ink-muted font-ui text-sm font-medium px-4 py-2.5 rounded-[10px] text-center hover:bg-ivory-200 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              authChecked && (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block border border-ink/15 text-ink font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] text-center hover:bg-ivory-200 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 bg-aubergine text-white font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] text-center hover:bg-aubergine-light transition-colors"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-marigold" />
                    </span>
                    Join Rameelo — it&apos;s free
                  </Link>
                  <p className="text-center font-mono text-[10px] text-ink-muted tracking-widest uppercase pt-1">
                    Founding member spots open
                  </p>
                </>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
