import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/events", "/collegiate", "/blog", "/organizers", "/artists", "/pricing", "/about", "/community"],
        disallow: ["/portal/", "/auth/", "/group/", "/tickets/claim/", "/api/"],
      },
    ],
    sitemap: "https://rameelo.com/sitemap.xml",
    host: "https://rameelo.com",
  };
}
