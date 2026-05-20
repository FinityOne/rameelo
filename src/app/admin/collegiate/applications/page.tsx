import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ApplicationCard from "./ApplicationCard";

export const metadata: Metadata = { title: "Team Applications — Admin | Rameelo" };

type Application = {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_role: string;
  team_name: string;
  university_name: string;
  tagline: string | null;
  region: string;
  state: string | null;
  city: string | null;
  founded_year: number | null;
  members_count: number | null;
  bio: string | null;
  performance_style: string | null;
  achievements_summary: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  mix_url: string | null;
  website_url: string | null;
  how_did_you_hear: string | null;
  extra_notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_team_id: string | null;
  created_at: string;
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  const query = supabase
    .from("team_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query.eq("status", status);
  }

  const { data } = await query;
  const applications: Application[] = data ?? [];

  // Counts for tab badges
  const { data: counts } = await supabase
    .from("team_applications")
    .select("status");

  const pending  = counts?.filter(r => r.status === "pending").length  ?? 0;
  const approved = counts?.filter(r => r.status === "approved").length ?? 0;
  const rejected = counts?.filter(r => r.status === "rejected").length ?? 0;

  const tabs = [
    { key: "pending",  label: "Pending",  count: pending  },
    { key: "approved", label: "Approved", count: approved },
    { key: "rejected", label: "Rejected", count: rejected },
    { key: "all",      label: "All",      count: (counts?.length ?? 0) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/collegiate" className="font-mono text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
              Collegiate Teams
            </Link>
            <span className="text-white/20">›</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-marigold">Applications</span>
          </div>
          <h1 className="font-display font-bold text-white text-2xl" style={{ letterSpacing: "-0.025em" }}>Team Applications</h1>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-marigold/10 border border-marigold/25 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-marigold rounded-full animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-marigold font-bold">{pending} pending</span>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6">
        {tabs.map(tab => (
          <Link
            key={tab.key}
            href={`/admin/collegiate/applications?status=${tab.key}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-ui text-sm transition-all ${
              status === tab.key
                ? "bg-marigold text-aubergine font-semibold"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                status === tab.key ? "bg-aubergine/20 text-aubergine" : "bg-white/10 text-white/40"
              }`}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Application list */}
      {applications.length === 0 ? (
        <div className="text-center py-20 bg-white/3 border border-white/8 rounded-2xl">
          <p className="text-3xl mb-3">
            {status === "pending" ? "📭" : status === "approved" ? "✅" : "❌"}
          </p>
          <p className="font-display font-bold text-white text-lg mb-1" style={{ letterSpacing: "-0.02em" }}>
            No {status === "all" ? "" : status} applications
          </p>
          <p className="font-ui text-white/40 text-sm">
            {status === "pending" ? "New applications will appear here for review." : "Nothing to show here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}
