import type { Metadata } from "next";
import { breadcrumbSchema, ld } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Garba & Navratri Events Near You — Rameelo",
  description: "Browse and buy tickets for raas garba, dandiya, and Navratri events across the USA. New Jersey, Houston, Chicago, Atlanta, Bay Area, and more. Group discounts up to 15% off.",
  keywords: [
    "garba events near me", "navratri events 2026", "dandiya events usa",
    "raas garba tickets", "navratri near me", "garba new jersey",
    "garba houston", "garba chicago", "garba atlanta", "navratri tickets",
    "garba san jose", "navratri bay area",
  ],
  alternates: { canonical: "https://www.rameelo.com/events" },
  openGraph: {
    title: "Garba & Navratri Events Near You — Rameelo",
    description: "Browse raas garba, dandiya, and Navratri events across the USA. Group discounts up to 15% off.",
    type: "website",
    url: "https://www.rameelo.com/events",
    siteName: "Rameelo",
    images: [{ url: "https://www.rameelo.com/og-default.jpg", width: 1200, height: 630, alt: "Find Garba Events — Rameelo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Garba & Navratri Events Near You — Rameelo",
    description: "Every verified garba and Navratri event in America. Group discounts up to 15% off.",
    images: ["https://www.rameelo.com/og-default.jpg"],
  },
};

const crumbs = breadcrumbSchema([
  { name: "Home", url: "https://www.rameelo.com" },
  { name: "Events", url: "https://www.rameelo.com/events" },
]);

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbs) }} />
      {children}
    </>
  );
}
