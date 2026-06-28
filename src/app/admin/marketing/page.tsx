import { redirect } from "next/navigation";

// The Email Blast tool became "Campaigns" — keep this path working for any
// existing bookmarks / links by redirecting to the new home.
export default function MarketingRedirect() {
  redirect("/admin/campaigns");
}
