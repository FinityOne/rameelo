"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  let slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const { data } = await supabase.from("collegiate_teams").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    attempt++;
  }
}

export async function approveApplication(applicationId: string) {
  const supabase = await createClient();

  const { data: app, error: fetchErr } = await supabase
    .from("team_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !app) return { error: "Application not found." };

  const slug = await uniqueSlug(`${app.team_name}-${app.university_name}`, supabase);

  const { data: team, error: insertErr } = await supabase
    .from("collegiate_teams")
    .insert({
      slug,
      team_name: app.team_name,
      university_name: app.university_name,
      tagline: app.tagline ?? null,
      region: app.region,
      state: app.state ?? null,
      city: app.city ?? null,
      founded_year: app.founded_year ?? null,
      bio: app.bio ?? null,
      performance_style: app.performance_style ?? null,
      instagram_url: app.instagram_url ?? null,
      youtube_url: app.youtube_url ?? null,
      tiktok_url: app.tiktok_url ?? null,
      mix_url: app.mix_url ?? null,
      website_url: app.website_url ?? null,
      members: [],
      achievements: [],
      upcoming_competitions: [],
      donate_enabled: false,
      is_active: true,
      is_featured: false,
      is_verified: false,
    })
    .select("id")
    .single();

  if (insertErr || !team) return { error: insertErr?.message ?? "Failed to create team." };

  await supabase
    .from("team_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      created_team_id: team.id,
    })
    .eq("id", applicationId);

  revalidatePath("/portal/admin/collegiate/applications");
  revalidatePath("/portal/admin/collegiate");

  return { teamId: team.id, slug };
}

export async function rejectApplication(applicationId: string, adminNotes: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_applications")
    .update({
      status: "rejected",
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/portal/admin/collegiate/applications");
  return { success: true };
}

export async function updateTeam(teamId: string, payload: Record<string, unknown>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("collegiate_teams")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", teamId);

  if (error) return { error: error.message };

  revalidatePath("/portal/admin/collegiate");
  revalidatePath("/portal/admin/collegiate/applications");

  return { success: true };
}
