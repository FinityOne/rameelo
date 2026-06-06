"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Top-of-dashboard pill that claims any pending org-team invitation for this
// member's email, then — if they belong to an organization — offers a one-click
// path into the organizer portal. Hidden when there's nothing to show.
export default function OrganizerAccessBanner() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgCount, setOrgCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Claim any pending team invites addressed to this account (idempotent —
      // adds the org membership and promotes the member to organizer).
      try { await supabase.rpc("claim_org_invitations"); } catch { /* best-effort */ }

      const { data } = await supabase
        .from("organization_members")
        .select("org_id, organizations(name)")
        .eq("user_id", user.id);
      const orgs = (data ?? []) as unknown as { org_id: string; organizations: { name: string } | { name: string }[] | null }[];
      if (orgs.length > 0) {
        setOrgCount(orgs.length);
        const first = orgs[0].organizations;
        const name = Array.isArray(first) ? first[0]?.name : first?.name;
        setOrgName(name ?? null);
      }
    })();
  }, []);

  if (orgCount === 0 || dismissed) return null;

  const more = orgCount > 1 ? ` +${orgCount - 1} more` : "";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 sm:px-5" style={{ background: "#2E1B30" }}>
      <span className="w-9 h-9 rounded-xl bg-marigold/20 flex items-center justify-center text-lg shrink-0">🎪</span>
      <div className="flex-1 min-w-[180px]">
        <p className="font-ui text-sm font-semibold text-white leading-tight">
          You&rsquo;re on the team at {orgName ? <span className="text-marigold">{orgName}</span> : "an organization"}{more}
        </p>
        <p className="font-ui text-xs text-white/55 mt-0.5">You have organizer access — manage events, orders &amp; your team.</p>
      </div>
      <Link
        href="/organizer"
        className="shrink-0 inline-flex items-center gap-1.5 bg-marigold text-aubergine font-display font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-all"
      >
        Open organizer portal
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </Link>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss"
        className="shrink-0 text-white/35 hover:text-white/70 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
