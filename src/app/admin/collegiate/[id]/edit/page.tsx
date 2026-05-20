import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CollegiateTeamForm from "../../_components/CollegiateTeamForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("collegiate_teams").select("team_name").eq("id", id).single();
  return { title: `Edit ${data?.team_name ?? "Team"} — Admin | Rameelo` };
}

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("collegiate_teams")
    .select("*")
    .eq("id", id)
    .single();

  if (!team) notFound();

  return (
    <div className="min-h-screen bg-[#f7f5f2] px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <CollegiateTeamForm mode="edit" team={team} />
      </div>
    </div>
  );
}
