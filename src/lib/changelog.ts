export type AudienceTag = 'attendees' | 'members' | 'organizers' | 'platform';

export type ReleaseFeature = {
  title: string;
  body: string;
  tags: AudienceTag[];
  highlight?: boolean;
};

export type Release = {
  slug: string;
  version: string;
  name: string;
  date: string; // ISO
  summary: string;
  features: ReleaseFeature[];
};

export const RELEASES: Release[] = [
  {
    slug: 'v1-0-foundation',
    version: '1.0',
    name: 'The Foundation',
    date: '2026-05-20',
    summary:
      'Rameelo is officially live. The first dedicated ticketing and community platform for raas garba and Navratri events across the United States — built entirely around how this community moves, connects, and celebrates.',
    features: [
      {
        title: 'Rameelo platform launches',
        body: 'Rameelo.com is live. A purpose-built home for the garba and Navratri community in the US — event discovery, ticketing, artist profiles, organizer tools, and community all in one place. Not adapted from a generic events tool. Built from scratch for this.',
        tags: ['platform'],
        highlight: true,
      },
      {
        title: 'Member accounts',
        body: 'Anyone can create a Rameelo account, build a profile, follow artists they love, and start connecting with the broader community. Members get a personal dashboard, notification preferences, order history, and a feed of what\'s happening in their area.',
        tags: ['members', 'attendees'],
        highlight: true,
      },
      {
        title: 'Organizer accounts & organization profiles',
        body: 'Event organizers can register an organization, invite team members, and manage everything from one place. Each organization gets a dedicated profile page, member directory, and is linked directly to their events. Role-based access (owner, admin, member) is live from day one.',
        tags: ['organizers'],
        highlight: true,
      },
      {
        title: 'Event creation & ticketing',
        body: 'Organizers can create events with a full multi-step flow — event basics, schedule, venue, cover art, and ticket tier configuration. Support for multi-night Navratri events is built in natively. Each tier supports custom group discount thresholds that unlock automatically when a group hits the minimum.',
        tags: ['organizers'],
      },
      {
        title: 'Artist profiles — 100+ garba artists',
        body: 'Rameelo launches with over 100 garba and raas artists fully profiled — biography, genres, performance style, instruments, social links, YouTube videos, and their upcoming show schedule. Artists are searchable and discoverable. Events automatically link to artist pages so fans follow their favorite performers wherever they perform.',
        tags: ['attendees', 'members'],
        highlight: true,
      },
      {
        title: 'Community groups',
        body: 'A new layer of social infrastructure for the garba world. Members can join interest-based community groups — Fashion, Dance, Hangout, Food, Beginner Circles, Planning, Marketplace, and more — with real-time group chat. Private groups let friends coordinate, share links, and plan their Navratri together. Community groups are moderated and organized by the Rameelo team.',
        tags: ['members'],
        highlight: true,
      },
      {
        title: 'Group order system',
        body: 'The feature the community has needed for years. Any attendee can start a group order, share a link in their group chat or Instagram story, and let their circle commit on their own time. When the group hits the minimum threshold set by the organizer, every member automatically gets the group rate. Rameelo sends smart nudge reminders to uncommitted members.',
        tags: ['attendees', 'organizers'],
      },
      {
        title: 'Event discovery & public browse',
        body: 'The public events page lets anyone browse garba events across the US — filterable by city, state, category (Garba, Raas, Dandiya, Workshop), and date. Event cards show multi-night date ranges, artist, city, and a demand signal. No account required to browse.',
        tags: ['attendees'],
      },
      {
        title: 'Admin review pipeline',
        body: 'All events go through an internal review queue before publishing. The Rameelo admin team can approve, reject (with a note), or request changes — ensuring quality, accuracy, and community standards across every listing.',
        tags: ['platform'],
      },
      {
        title: 'Organizer portal',
        body: 'Organizers get a dedicated portal with an overview of their events, sales data, team management, and organization settings. Multi-organization support is live — organizers who run more than one org can switch between them in a single session.',
        tags: ['organizers'],
      },
    ],
  },
];

export function getReleaseBySlug(slug: string): Release | undefined {
  return RELEASES.find((r) => r.slug === slug);
}

export const TAG_META: Record<AudienceTag, { label: string; cls: string; dot: string }> = {
  attendees:  { label: 'Attendees',  cls: 'bg-marigold/15 text-[#a06b00] border-marigold/20',   dot: '#F5A623' },
  members:    { label: 'Members',    cls: 'bg-peacock/12 text-peacock border-peacock/20',         dot: '#0E8C7A' },
  organizers: { label: 'Organizers', cls: 'bg-aubergine/10 text-aubergine border-aubergine/20',   dot: '#2E1B30' },
  platform:   { label: 'Platform',   cls: 'bg-ivory-200 text-ink-muted border-ivory-200',         dot: '#9ca3af' },
};
