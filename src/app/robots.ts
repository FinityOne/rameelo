import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const PUBLIC = [
    "/",
    "/events",
    "/garba-events",
    "/artists",
    "/artists/",
    "/organizers",
    "/collegiate",
    "/blog",
    "/community",
    "/pricing",
    "/about",
    "/changelog",
  ];

  const DISALLOW = ["/portal/", "/auth/", "/group/", "/tickets/claim/", "/api/", "/portal/admin/"];

  return {
    rules: [
      // Default: all crawlers
      {
        userAgent: "*",
        allow: PUBLIC,
        disallow: DISALLOW,
      },
      // Google
      { userAgent: "Googlebot",        allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "Googlebot-Image",  allow: ["/"] },
      { userAgent: "Googlebot-Video",  allow: ["/"] },
      // Bing
      { userAgent: "Bingbot",          allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "msnbot",           allow: PUBLIC, disallow: DISALLOW },
      // Apple
      { userAgent: "Applebot",         allow: PUBLIC, disallow: DISALLOW },
      // DuckDuckGo
      { userAgent: "DuckDuckBot",      allow: PUBLIC, disallow: DISALLOW },
      // OpenAI — allow full crawl so ChatGPT/SearchGPT knows about Rameelo
      { userAgent: "GPTBot",           allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "ChatGPT-User",     allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "OAI-SearchBot",    allow: PUBLIC, disallow: DISALLOW },
      // Anthropic — allow Claude/Claude.ai to index content
      { userAgent: "anthropic-ai",     allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "ClaudeBot",        allow: PUBLIC, disallow: DISALLOW },
      // Perplexity
      { userAgent: "PerplexityBot",    allow: PUBLIC, disallow: DISALLOW },
      // Meta
      { userAgent: "FacebookBot",      allow: PUBLIC, disallow: DISALLOW },
      // Common AI research crawlers
      { userAgent: "cohere-ai",        allow: PUBLIC, disallow: DISALLOW },
      { userAgent: "YouBot",           allow: PUBLIC, disallow: DISALLOW },
    ],
    sitemap: "https://www.rameelo.com/sitemap.xml",
    host: "https://www.rameelo.com",
  };
}
