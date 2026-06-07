// Ticket sales stay open until doors open — measured in the event's own local
// time (the city/state it's listed in), not the buyer's browser timezone.
//
// We don't store an IANA timezone per event, so we map the US state to its
// predominant timezone. For the handful of states that span two zones we pick
// the one most events fall in; this is a sales cutoff, so being off by an hour
// at the very edge is acceptable.

const US_STATE_TZ: Record<string, string> = {
  AL: "America/Chicago",   AK: "America/Anchorage", AZ: "America/Phoenix",
  AR: "America/Chicago",   CA: "America/Los_Angeles", CO: "America/Denver",
  CT: "America/New_York",  DE: "America/New_York",  DC: "America/New_York",
  FL: "America/New_York",  GA: "America/New_York",  HI: "Pacific/Honolulu",
  ID: "America/Boise",     IL: "America/Chicago",   IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",   KS: "America/Chicago",   KY: "America/New_York",
  LA: "America/Chicago",   ME: "America/New_York",  MD: "America/New_York",
  MA: "America/New_York",  MI: "America/New_York",  MN: "America/Chicago",
  MS: "America/Chicago",   MO: "America/Chicago",   MT: "America/Denver",
  NE: "America/Chicago",   NV: "America/Los_Angeles", NH: "America/New_York",
  NJ: "America/New_York",  NM: "America/Denver",    NY: "America/New_York",
  NC: "America/New_York",  ND: "America/Chicago",   OH: "America/New_York",
  OK: "America/Chicago",   OR: "America/Los_Angeles", PA: "America/New_York",
  RI: "America/New_York",  SC: "America/New_York",  SD: "America/Chicago",
  TN: "America/Chicago",   TX: "America/Chicago",   UT: "America/Denver",
  VT: "America/New_York",  VA: "America/New_York",  WA: "America/Los_Angeles",
  WV: "America/New_York",  WI: "America/Chicago",   WY: "America/Denver",
};

const DEFAULT_TZ = "America/New_York";

export function tzForState(state: string | null | undefined): string {
  return US_STATE_TZ[(state ?? "").toUpperCase().trim()] ?? DEFAULT_TZ;
}

// Offset (ms) of a timezone at a given instant.
function tzOffsetMs(tz: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a; }, {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

// Epoch ms for a wall-clock date/time interpreted in `tz`.
function wallTimeToEpoch(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = tzOffsetMs(tz, new Date(guess));
  return guess - offset;
}

export interface EventTimeFields {
  start_date: string;            // "YYYY-MM-DD"
  start_time?: string | null;    // "HH:MM" or "HH:MM:SS"
  state?: string | null;
}

// The instant doors open, in the event's local timezone. If no start_time is
// set we fall back to end-of-day so sales aren't cut off early.
export function eventDoorsEpoch(ev: EventTimeFields): number {
  const [y, mo, d] = ev.start_date.split("-").map(Number);
  let h = 23, mi = 59;
  if (ev.start_time) {
    const [hh, mm] = ev.start_time.split(":").map(Number);
    if (!Number.isNaN(hh)) { h = hh; mi = Number.isNaN(mm) ? 0 : mm; }
  }
  return wallTimeToEpoch(y, mo, d, h, mi, tzForState(ev.state));
}

// True once doors have opened in the event's city — ticket sales are closed.
export function salesClosedForEvent(ev: EventTimeFields): boolean {
  if (!ev.start_date) return false;
  return Date.now() >= eventDoorsEpoch(ev);
}
