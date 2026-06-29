// Authorizes organizer access to an event the same way the events list does, and
// the events RLS allows (policy `org_members_view_org_events`): the caller's own
// personal event (organizer_id) OR any event belonging to one of their
// organizations (org_id). Returns a PostgREST `.or()` filter string to combine
// with `.eq("id", id)` on an events query.
//
// Why this exists: events are routinely set up by the Rameelo team or an org
// owner, so a managing org member is frequently NOT the event's organizer_id —
// and org events can even have a null organizer_id. Scoping reads by
// organizer_id alone locked those members out, bouncing every event subpage
// straight back to the events list.
export function eventAccessOrFilter(userId: string, orgIds: string[]): string {
  const parts = [`organizer_id.eq.${userId}`];
  if (orgIds.length > 0) parts.push(`org_id.in.(${orgIds.join(",")})`);
  return parts.join(",");
}
