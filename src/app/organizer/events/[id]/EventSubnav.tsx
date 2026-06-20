"use client";

import Link from "next/link";

// Shared in-event navigation so an organizer can move between an event's sections
// (overview, orders, groups, comp tickets) without bouncing back to the events list.
// `active` marks the current tab. Edit stays a separate primary action on each page.

type TabKey = "overview" | "orders" | "groups" | "comp" | "manual";

const TABS: { key: TabKey; label: string; suffix: string; icon: React.ReactNode }[] = [
  {
    key: "overview", label: "Overview", suffix: "",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />,
  },
  {
    key: "orders", label: "Orders", suffix: "/orders",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  },
  {
    key: "groups", label: "Groups", suffix: "/groups",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.83-4" />,
  },
  {
    key: "comp", label: "Comp Tickets", suffix: "/comp",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 8V4m0 4a3 3 0 01-3-3 1.5 1.5 0 013-1 1.5 1.5 0 013 1 3 3 0 01-3 3zM4 8h16v4H4z" />,
  },
  {
    key: "manual", label: "Manual Order", suffix: "/manual",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />,
  },
];

export default function EventSubnav({ eventId, active }: { eventId: string; active: TabKey }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <div className="flex items-center gap-1 bg-ivory rounded-2xl p-1 w-fit border border-ivory-200 min-w-fit">
        {TABS.map(tab => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={`/organizer/events/${eventId}${tab.suffix}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-ui font-semibold text-sm whitespace-nowrap transition-all ${
                isActive
                  ? "bg-white text-ink shadow-sm border border-ivory-200"
                  : "text-ink-muted hover:text-ink border border-transparent"
              }`}
            >
              <svg className={`w-4 h-4 ${isActive ? "text-aubergine" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
