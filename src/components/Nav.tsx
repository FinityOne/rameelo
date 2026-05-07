"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navLinks } from "@/lib/data";

function RLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
      {/* Monogram: R on marigold rounded square */}
      <div className="w-8 h-8 bg-marigold rounded-[8px] flex items-center justify-center shadow-sm">
        <span
          className="font-display font-bold text-aubergine text-[18px] leading-none"
          style={{ letterSpacing: "-0.03em" }}
        >
          R
        </span>
      </div>
      <span
        className="font-display font-bold text-ink text-[17px] leading-none hidden sm:block"
        style={{ letterSpacing: "-0.02em" }}
      >
        Rameelo
      </span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
                      active
                        ? "text-aubergine bg-aubergine-faint"
                        : "text-ink-muted hover:text-ink hover:bg-ivory-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
        </ul>

        {/* CTA group */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/events"
            className="font-ui text-sm font-medium text-ink-muted hover:text-ink px-3 py-2 rounded-[8px] hover:bg-ivory-200 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/events"
            className="bg-marigold text-aubergine font-ui text-sm font-semibold px-5 py-2.5 rounded-[10px] hover:bg-marigold-dark transition-colors shadow-sm"
          >
            List an event
          </Link>
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
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-[8px] font-ui text-sm font-medium transition-colors ${
                  active
                    ? "bg-aubergine-faint text-aubergine font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-ivory-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 pb-1 grid grid-cols-2 gap-2">
            <Link
              href="/events"
              onClick={() => setMobileOpen(false)}
              className="block border border-ink/20 text-ink font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] text-center hover:bg-ivory-200 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/events"
              onClick={() => setMobileOpen(false)}
              className="block bg-marigold text-aubergine font-ui text-sm font-semibold px-4 py-2.5 rounded-[10px] text-center hover:bg-marigold-dark transition-colors"
            >
              List an event
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
