import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ token: string }> };

// Branded share card — solid horizontal Rameelo logo (1600×400, non-transparent
// so it renders cleanly on every platform). metadataBase is set on the root layout.
const OG_IMAGE = {
  url: "/logo/rameelo-horizontal-red.png",
  width: 1600,
  height: 400,
  alt: "Rameelo — The home for Garba in America",
  type: "image/png",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  let orgName = "";
  let orgDescription = "";
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_onboarding", { p_token: token });
    const res = data as { found?: boolean; org?: { name?: string | null; description?: string | null } } | null;
    if (res?.found) {
      orgName = res.org?.name?.trim() ?? "";
      orgDescription = res.org?.description?.trim() ?? "";
    }
  } catch {
    // Fall back to generic copy if the lookup fails — never block rendering.
  }

  const title = orgName ? `Event Onboarding · ${orgName}` : "Event Onboarding";
  const description = (
    orgDescription
      ? `${orgName ? `${orgName}: ` : ""}${orgDescription}`
      : orgName
        ? `${orgName} is getting set up on Rameelo. Complete your onboarding to launch ticketing, marketing, and check-in for your Garba & Navratri events.`
        : "Complete your onboarding with Rameelo — America's home for Raas Garba & Navratri events — to launch ticketing, marketing, and check-in."
  ).slice(0, 200);

  return {
    title,
    description,
    // Private invite links — don't index or follow.
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      title: `${title} | Rameelo`,
      description,
      images: [OG_IMAGE],
      type: "website",
      siteName: "Rameelo",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Rameelo`,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
