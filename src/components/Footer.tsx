import Link from "next/link";
import { navLinks } from "@/lib/data";

export default function Footer() {
  const socials = [
    {
      label: "Instagram",
      path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    },
    {
      label: "X / Twitter",
      path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    },
  ];

  return (
    <footer style={{ background: "#2E1B30" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            {/* Horizontal UI lockup */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-marigold rounded-[8px] flex items-center justify-center">
                <span
                  className="font-display font-bold text-aubergine text-[18px] leading-none"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  R
                </span>
              </div>
              <span
                className="font-display font-bold text-white text-[17px] leading-none"
                style={{ letterSpacing: "-0.02em" }}
              >
                Rameelo
              </span>
            </div>

            <p className="font-ui text-sm leading-relaxed max-w-xs text-white/40 mb-6">
              A ticketing platform for the rhythm of raas garba. Built for the Gujarati
              diaspora and every dance-loving collegiate stage in between.
            </p>

            <div className="flex gap-4">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="text-white/30 hover:text-marigold transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-mono text-[10px] text-white/30 tracking-[0.12em] uppercase mb-5">
              Navigate
            </h4>
            <ul className="space-y-3 font-ui text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-mono text-[10px] text-white/30 tracking-[0.12em] uppercase mb-5">
              Support
            </h4>
            <ul className="space-y-3 font-ui text-sm">
              {["Help Center", "Contact Us", "Organizer Hub", "Privacy Policy", "Terms of Service"].map(
                (item) => (
                  <li key={item}>
                    <a href="#" className="text-white/50 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="h-px bg-white/8 mb-6" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
            © {new Date().getFullYear()} Rameelo · Made with love for the diaspora
          </p>
          <p className="font-mono text-[10px] text-white/20 tracking-widest uppercase">
            Built by FinityOne
          </p>
        </div>
      </div>
    </footer>
  );
}
