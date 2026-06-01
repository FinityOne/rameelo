import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RAMEELO_HOSTS = [
  "rameelo.com",
  "www.rameelo.com",
];

function isRameeloHost(host: string): boolean {
  if (RAMEELO_HOSTS.includes(host)) return true;
  if (host.endsWith(".rameelo.com")) return true;
  if (host.endsWith(".vercel.app")) return true;
  if (host === "localhost" || host.startsWith("localhost:")) return true;
  if (host.endsWith(".localhost")) return true;
  return false;
}

// Simple TTL cache — module-level state persists within an edge worker
const domainCache: Record<string, { slug: string | null; name: string | null; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

async function lookupArtist(domain: string): Promise<{ slug: string; name: string } | null> {
  const cached = domainCache[domain];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.slug ? { slug: cached.slug, name: cached.name! } : null;
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const url = `${supabaseUrl}/rest/v1/artists?custom_domain=eq.${encodeURIComponent(domain)}&is_active=eq.true&select=slug%2Cname&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ slug: string; name: string }>;
    const artist = rows[0] ?? null;
    domainCache[domain] = { slug: artist?.slug ?? null, name: artist?.name ?? null, ts: Date.now() };
    return artist ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const host   = req.headers.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");

  // Let Rameelo's own domains pass through unchanged
  if (isRameeloHost(domain)) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Skip Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const artist = await lookupArtist(domain);
  if (!artist) return NextResponse.next();

  const url = req.nextUrl.clone();

  if (pathname === "/" || pathname === "") {
    url.pathname = `/artists/${artist.slug}`;
  }

  url.searchParams.set("via", domain);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/:path*",
};
