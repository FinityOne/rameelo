"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { approveApplication, rejectApplication } from "@/lib/actions/collegiate-applications";

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

const STATUS_STYLE = {
  pending:  "bg-marigold/15 text-marigold border-marigold/25",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected: "bg-red-500/15 text-red-400 border-red-500/25",
};

export default function ApplicationCard({ application: app }: { application: Application }) {
  const [expanded, setExpanded]     = useState(false);
  const [rejectNotes, setRejectNotes] = useState(app.admin_notes ?? "");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [result, setResult]         = useState<{ approved?: boolean; rejected?: boolean; teamId?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReviewed = app.status !== "pending";

  function handleApprove() {
    startTransition(async () => {
      const res = await approveApplication(app.id);
      if (res.error) { setResult({ error: res.error }); return; }
      setResult({ approved: true, teamId: res.teamId });
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectApplication(app.id, rejectNotes);
      if (res.error) { setResult({ error: res.error }); return; }
      setResult({ rejected: true });
      setRejectOpen(false);
    });
  }

  return (
    <div className={`bg-white/3 border rounded-2xl overflow-hidden transition-all ${
      app.status === "pending" ? "border-white/10 hover:border-white/20" : "border-white/6"
    }`}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-bold text-white text-base" style={{ letterSpacing: "-0.02em" }}>
                {app.team_name}
              </p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider border ${STATUS_STYLE[app.status]}`}>
                {app.status}
              </span>
            </div>
            <p className="font-ui text-white/40 text-xs mt-0.5">
              {app.university_name} · {app.region}{app.state ? `, ${app.state}` : ""} · submitted by {app.contact_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="font-mono text-[9px] text-white/25">{new Date(app.created_at).toLocaleDateString()}</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/8 px-5 py-5 space-y-5">

          {/* Two-column info grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoSection title="Contact">
              <InfoRow label="Name"  value={app.contact_name} />
              <InfoRow label="Email" value={<a href={`mailto:${app.contact_email}`} className="text-peacock hover:underline">{app.contact_email}</a>} />
              <InfoRow label="Role"  value={app.contact_role} />
            </InfoSection>
            <InfoSection title="Team Details">
              {app.tagline    && <InfoRow label="Tagline"  value={app.tagline} />}
              {app.founded_year && <InfoRow label="Founded" value={String(app.founded_year)} />}
              {app.members_count && <InfoRow label="Members" value={String(app.members_count)} />}
              {app.performance_style && <InfoRow label="Style" value={app.performance_style} />}
            </InfoSection>
          </div>

          {app.bio && (
            <InfoSection title="Description">
              <p className="font-ui text-white/60 text-sm leading-relaxed">{app.bio}</p>
            </InfoSection>
          )}

          {app.achievements_summary && (
            <InfoSection title="Achievements">
              <p className="font-ui text-white/60 text-sm leading-relaxed whitespace-pre-line">{app.achievements_summary}</p>
            </InfoSection>
          )}

          {/* Links */}
          {(app.mix_url || app.instagram_url || app.youtube_url || app.tiktok_url || app.website_url) && (
            <InfoSection title="Links">
              <div className="flex flex-wrap gap-2">
                {app.mix_url        && <ExtLink label="Mix" href={app.mix_url} />}
                {app.instagram_url  && <ExtLink label="Instagram" href={app.instagram_url} />}
                {app.youtube_url    && <ExtLink label="YouTube" href={app.youtube_url} />}
                {app.tiktok_url     && <ExtLink label="TikTok" href={app.tiktok_url} />}
                {app.website_url    && <ExtLink label="Website" href={app.website_url} />}
              </div>
            </InfoSection>
          )}

          {app.how_did_you_hear && (
            <InfoSection title="How they heard about us">
              <p className="font-ui text-white/60 text-sm">{app.how_did_you_hear}</p>
            </InfoSection>
          )}

          {app.extra_notes && (
            <InfoSection title="Additional notes">
              <p className="font-ui text-white/60 text-sm leading-relaxed whitespace-pre-line">{app.extra_notes}</p>
            </InfoSection>
          )}

          {/* Result / error */}
          {result?.error && (
            <p className="font-ui text-sm text-durga">{result.error}</p>
          )}
          {result?.approved && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-ui font-semibold text-emerald-400 text-sm">Team created successfully</p>
                {result.teamId && (
                  <Link href={`/admin/collegiate/${result.teamId}/edit`} className="font-mono text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
                    Edit full profile →
                  </Link>
                )}
              </div>
            </div>
          )}
          {result?.rejected && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <span className="text-lg">❌</span>
              <p className="font-ui font-semibold text-red-400 text-sm">Application rejected</p>
            </div>
          )}

          {/* Actions for pending */}
          {!isReviewed && !result?.approved && !result?.rejected && (
            <div className="border-t border-white/8 pt-4 space-y-3">
              {!rejectOpen ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-emerald-500 text-white font-display font-bold text-sm rounded-xl hover:bg-emerald-400 disabled:opacity-60 transition-all"
                  >
                    {isPending ? "Creating team…" : "✓ Approve & Create Team"}
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                    className="px-5 py-2.5 border border-red-500/30 text-red-400 font-ui font-medium text-sm rounded-xl hover:bg-red-500/10 disabled:opacity-60 transition-all"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">Reason for rejection (optional)</p>
                  <textarea
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Duplicate application, insufficient info..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 font-ui text-sm focus:outline-none focus:border-red-400/40 transition-colors resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleReject} disabled={isPending}
                      className="flex-1 py-2 bg-red-500/80 text-white font-ui font-semibold text-sm rounded-xl hover:bg-red-500 disabled:opacity-60 transition-all">
                      {isPending ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button onClick={() => setRejectOpen(false)}
                      className="px-4 py-2 border border-white/10 text-white/40 font-ui text-sm rounded-xl hover:bg-white/5 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already reviewed — show link to edit */}
          {app.status === "approved" && app.created_team_id && (
            <div className="border-t border-white/8 pt-4">
              <Link href={`/admin/collegiate/${app.created_team_id}/edit`}
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-marigold/60 hover:text-marigold transition-colors">
                Edit team profile →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-white/25 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="font-ui text-xs text-white/30 shrink-0 w-20">{label}</span>
      <span className="font-ui text-xs text-white/70">{value}</span>
    </div>
  );
}

function ExtLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1 bg-white/6 border border-white/10 rounded-lg font-mono text-[9px] uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-all">
      {label}
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
