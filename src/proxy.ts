import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Root domain(s) that serve the normal app (everything else hitting us is treated
// as a potential artist vanity domain). Override with NEXT_PUBLIC_ROOT_DOMAIN.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'rameelo.com').toLowerCase()

// Normalize a host header to a bare hostname: lowercase, no port, no leading www.
function normalizeHost(raw: string | null): string {
  if (!raw) return ''
  return raw.split(':')[0].toLowerCase().replace(/^www\./, '').trim()
}

// Is this one of our own domains (not an artist vanity domain)?
function isPrimaryHost(host: string): boolean {
  return (
    host === ROOT_DOMAIN ||
    host === '' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app')
  )
}

// Tiny best-effort cache of host → artist slug (refetched if the instance is cold;
// correctness never depends on it). null = looked up, no match.
const vanityCache = new Map<string, { slug: string | null; at: number }>()
const VANITY_TTL = 5 * 60 * 1000

async function resolveArtistSlug(host: string): Promise<string | null> {
  const cached = vanityCache.get(host)
  if (cached && Date.now() - cached.at < VANITY_TTL) return cached.slug

  let slug: string | null = null
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    // Pull the (small) set of artists that have a custom domain and match in JS,
    // so we tolerate however the domain was stored (protocol/www/trailing slash).
    const res = await fetch(
      `${url}/rest/v1/artists?select=slug,custom_domain&custom_domain=not.is.null&is_active=eq.true`,
      { headers: { apikey: key, authorization: `Bearer ${key}` }, cache: 'no-store' }
    )
    if (res.ok) {
      const rows = (await res.json()) as { slug: string; custom_domain: string | null }[]
      const match = rows.find(r => normalizeHost((r.custom_domain ?? '').replace(/^https?:\/\//, '')) === host)
      slug = match?.slug ?? null
    }
  } catch { /* fall through — no vanity match */ }

  vanityCache.set(host, { slug, at: Date.now() })
  return slug
}

export async function proxy(request: NextRequest) {
  // ── Artist vanity-domain routing ──
  // When a custom artist domain points at this app, land its homepage on that
  // artist's page (deeper paths still work as the normal app).
  const host = normalizeHost(request.headers.get('host'))
  if (!isPrimaryHost(host) && request.nextUrl.pathname === '/') {
    const slug = await resolveArtistSlug(host)
    if (slug) {
      const url = request.nextUrl.clone()
      url.pathname = `/artists/${slug}`
      return NextResponse.rewrite(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // RequestCookies.set only takes name+value (no options); options go on the response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() not getSession() for security
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAdmin     = path === '/admin' || path.startsWith('/admin/')
  const isOrganizer = path === '/organizer' || path.startsWith('/organizer/')

  // Not signed in → send to sign-in (return here after) for any gated area.
  if (!user && (isAdmin || isOrganizer || path.startsWith('/portal'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  // Signed in → enforce role for organizer/admin areas; wrong role lands on the
  // member portal (never a dead end).
  if (user && (isAdmin || isOrganizer)) {
    // Claim any pending org invites first, so a freshly-invited member is
    // promoted to organizer before we check their role.
    if (isOrganizer) {
      try { await supabase.rpc('claim_org_invitations') } catch { /* best-effort */ }
    }
    const { data: role } = await supabase.rpc('get_my_role')
    const allowed = isAdmin ? role === 'admin' : (role === 'organizer' || role === 'admin')
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  // Exclude `/api/*` so middleware never runs on route handlers (webhooks, etc.).
  // API routes do their own auth (RLS / service-role / signature verification) and
  // must never be touched by session refresh or auth redirects.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
