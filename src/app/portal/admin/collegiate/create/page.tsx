import type { Metadata } from "next";
import CollegiateTeamForm from "../_components/CollegiateTeamForm";

export const metadata: Metadata = { title: "Add Collegiate Team — Admin | Rameelo" };

export default function AdminCollegiateCreatePage() {
  return (
    <div className="min-h-screen bg-[#f7f5f2] px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <CollegiateTeamForm mode="create" />
      </div>
    </div>
  );
}
