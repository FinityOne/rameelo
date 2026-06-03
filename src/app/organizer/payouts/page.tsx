"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Earnings and Payouts are now one page. Keep this route working for old links.
export default function PayoutsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/organizer/financials"); }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
    </div>
  );
}
