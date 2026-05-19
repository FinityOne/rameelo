import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Fraunces,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["italic"],
  weight: ["500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rameelo.com"),
  title: {
    default: "Rameelo — The Home for Raas Garba & Navratri Events in America",
    template: "%s | Rameelo",
  },
  description:
    "America's dedicated platform for raas garba, dandiya, and Navratri events. Find events near you in New Jersey, Houston, Chicago, Atlanta, and the Bay Area. Group tickets with up to 15% off.",
  keywords: [
    "garba events usa", "navratri 2025", "raas garba tickets", "dandiya events near me",
    "navratri near me", "garba new jersey", "garba houston", "garba chicago",
    "gujarati events usa", "navratri tickets online", "group garba tickets", "rameelo",
  ],
  authors: [{ name: "Rameelo", url: "https://rameelo.com" }],
  creator: "Rameelo",
  publisher: "Rameelo",
  icons: {
    icon: [
      { url: "/logo/rameelo-icon-goldred.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo/rameelo-icon-goldred.png", type: "image/png" },
    ],
    shortcut: "/logo/rameelo-icon-goldred.png",
  },
  openGraph: {
    type: "website",
    siteName: "Rameelo",
    locale: "en_US",
    title: "Rameelo — The Home for Raas Garba & Navratri Events in America",
    description:
      "America's dedicated platform for raas garba, dandiya, and Navratri events. Group tickets with up to 15% off.",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "Rameelo — America's home for Raas Garba" }],
    url: "https://rameelo.com",
  },
  twitter: {
    card: "summary_large_image",
    site: "@rameelo",
    title: "Rameelo — Raas Garba & Navratri Events in America",
    description: "Find garba, dandiya, and Navratri events near you. Group discounts up to 15% off.",
    images: ["/og-default.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "https://rameelo.com" },
};

const JSON_LD_ORG = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://rameelo.com/#organization",
      name: "Rameelo",
      url: "https://rameelo.com",
      logo: {
        "@type": "ImageObject",
        url: "https://rameelo.com/og-default.jpg",
        width: 1200,
        height: 630,
      },
      description: "America's dedicated ticketing platform for raas garba, dandiya, and Navratri events.",
      foundingDate: "2024",
      areaServed: "US",
      knowsAbout: ["Raas Garba", "Dandiya Raas", "Navratri", "Gujarati Culture", "South Asian Events"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://rameelo.com/about",
        availableLanguage: "English",
      },
      sameAs: [
        "https://instagram.com/rameelo",
        "https://twitter.com/rameelo",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://rameelo.com/#website",
      url: "https://rameelo.com",
      name: "Rameelo",
      description: "America's home for raas garba, dandiya, and Navratri events — find tickets, organize events, and join the community.",
      publisher: { "@id": "https://rameelo.com/#organization" },
      potentialAction: [
        {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://rameelo.com/events?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      ],
    },
    {
      "@type": "SiteLinksSearchBox",
      url: "https://rameelo.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://rameelo.com/events?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORG) }}
        />
        {children}
      </body>
    </html>
  );
}
