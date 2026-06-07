import { redirect } from "next/navigation";

// Event creation is an admin-only action — organizers manage/edit existing
// events but don't create them. Any direct visit goes back to their events.
// (The Step* components in this folder are reused by the admin create flow.)
export default function OrganizerCreateEventRedirect() {
  redirect("/organizer/events");
}
