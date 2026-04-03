"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navLinks } from "@/lib/data";

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream border-b border-cream-dark shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="text-xl leading-none">🪔</span>
          <span className="text-lg font-bold tracking-tight text-brand">Rameelo</span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                    active
                      ? "text-brand"
                      : "text-ink-secondary hover:text-brand hover:bg-brand-faint"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gold rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/events"
            className="bg-brand text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-brand-hover transition-colors shadow-sm"
          >
            Find Events
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-ink-secondary hover:bg-brand-faint transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-cream-dark bg-cream px-4 py-3 space-y-0.5">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-faint text-brand font-semibold"
                    : "text-ink-secondary hover:text-brand hover:bg-brand-faint"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 pb-1">
            <Link
              href="/events"
              onClick={() => setMobileOpen(false)}
              className="block bg-brand text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center hover:bg-brand-hover transition-colors"
            >
              Find Events
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
