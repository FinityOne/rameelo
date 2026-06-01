import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RAMEELO_HOSTS = new Set([
  "rameelo.com",
  "www.rameelo.com",
  "localhost",
]);

function isRameeloHost(host: string) {
  if (RAMEELO_HOSTS.has(host)) return true;
  if (host.endsWith(".rameelo.com")) return true;
  if (host.endsWith(".vercel.app")) return true;
  if (host.endsWith(".localhost")) return true;
  if (/^localhost:\d+$/.test(host)) return true;
  return false;
}

// Simple in-process cache so we don't hit Supabase on every request
const domainCache = new Map<string, { slug: string | null; name: string | null; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function lookupArtistByDomain(domain: string): Promise<{ slug: string; name: string } | null> {
  const cached = domainCache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.slug ? { slug: cached.slug, name: cached.name! } : null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/artists?custom_domain=eq.${encodeURIComponent(domain)}&is_active=eq.true&select=slug,name&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json() as { slug: string; name: string }[];
    const result = rows[0] ?? null;
    domainCache.set(domain, { slug: result?.slug ?? null, name: result?.name ?? null, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // Strip port for comparison
  const domain = host.replace(/:\d+$/, "");

  if (isRameeloHost(domain)) return NextResponse.next();

  // Only handle the root and direct paths — skip API, _next, assets
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const artist = await lookupArtistByDomain(domain);
  if (!artist) return NextResponse.next();

  // Rewrite: / → /artists/[slug]?via=[domain]
  // Any sub-path gets forwarded so /events etc still works
  const url = req.nextUrl.clone();

  if (pathname === "/" || pathname === "") {
    url.pathname = `/artists/${artist.slug}`;
    url.searchParams.set("via", domain);
    return NextResponse.rewrite(url);
  }

  // Sub-paths: /events → /events with via param preserved in header
  // (organizer can link directly to their event pages)
  url.searchParams.set("via", domain);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
