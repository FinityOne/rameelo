import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Garba & Navratri Events Near You — Rameelo",
  description: "Browse and buy tickets for raas garba, dandiya, and Navratri events across the USA. New Jersey, Houston, Chicago, Atlanta, Bay Area, and more. Group discounts up to 15% off.",
  keywords: [
    "garba events near me", "navratri events 2025", "dandiya events usa",
    "raas garba tickets", "navratri near me", "garba new jersey",
    "garba houston", "garba chicago", "garba atlanta", "navratri tickets",
  ],
  openGraph: {
    title: "Garba & Navratri Events Near You — Rameelo",
    description: "Browse raas garba, dandiya, and Navratri events across the USA. Group discounts up to 15% off.",
    type: "website",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
