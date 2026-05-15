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
    default: "Rameelo — The home for Raas Garba in America",
    template: "%s | Rameelo",
  },
  description:
    "Find Garba, Dandiya, and Navratri events near you. Group tickets, exclusive discounts, and the best artists — all on Rameelo.",
  keywords: ["garba", "navratri", "dandiya", "raas garba", "Indian dance", "South Asian events", "gujarati events", "navratri tickets"],
  openGraph: {
    type: "website",
    siteName: "Rameelo",
    title: "Rameelo — The home for Raas Garba in America",
    description:
      "Find Garba, Dandiya, and Navratri events near you. Group tickets, exclusive discounts, and the best artists — all on Rameelo.",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "Rameelo — Raas Garba ticketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rameelo — The home for Raas Garba in America",
    description: "Find Garba, Dandiya, and Navratri events near you. Group tickets, exclusive discounts, and the best artists.",
    images: ["/og-default.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
