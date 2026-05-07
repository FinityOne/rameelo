"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { garbaEvents, artists } from "@/lib/events-data";
import { SEEDED_TICKETS } from "@/lib/auth";

const SCHEDULE = [
  { time: "6:00 PM", label: "Doors Open", desc: "Registration & welcome table. Collect your wristband.", icon: "🚪", highlight: false },
  { time: "6:30 PM", label: "Food Vendors Open", desc: "Soni's Snacks, Patel's Pav Bhaji, Gujarati Chai House", icon: "🍽️", highlight: false },
  { time: "7:00 PM", label: "Opening Ceremony", desc: "Welcome address, Ganesh Vandana & Aarti", icon: "🪔", highlight: false },
  { time: "7:30 PM", label: "Garba Begins", desc: "Traditional raas circles led by live dhol players", icon: "🥁", highlight: false },
  { time: "9:00 PM", label: "Headline Artist", desc: "Main stage performance begins", icon: "🎶", highlight: true },
  { time: "10:00 PM", label: "Garba Competition", desc: "Open floor competition — register at information desk by 8:30 PM", icon: "🏆", highlight: false },
  { time: "10:45 PM", label: "Dandiya Raas", desc: "Dandiya sticks provided at the door (limited supply)", icon: "🪃", highlight: false },
  { time: "11:30 PM", label: "Raffle & Prize Draw", desc: "Must be present to win. Tickets sold throughout the evening.", icon: "🎁", highlight: true },
  { time: "12:00 AM", label: "Grand Finale", desc: "Final set — dance floor reserved for all ages", icon: "✨", highlight: false },
];

const FOOD_VENDORS = [
  { name: "Soni's Snacks", items: ["Pav Bhaji", "Sev Puri", "Dabeli", "Masala Chai"], emoji: "🍛" },
  { name: "Patel's Sweets Corner", items: ["Jalebi", "Gulab Jamun", "Barfi", "Ladoo"], emoji: "🍯" },
  { name: "Gujarati Street Kitchen", items: ["Dhokla", "Khandvi", "Khakra", "Thepla"], emoji: "🥗" },
  { name: "Fresh Juice & Drinks", items: ["Sugarcane Juice", "Lassi", "Lemonade", "Water"], emoji: "🥤" },
];

const RAFFLE_PRIZES = [
  { prize: "Weekend Getaway", value: "$1,200", desc: "2-night stay at Marriott Courtyard for 2 + airfare credit", emoji: "✈️", tier: "Grand" },
  { prize: "MacBook Air", value: "$999", desc: "Apple MacBook Air M3 15-inch", emoji: "💻", tier: "Gold" },
  { prize: "Visa Gift Card", value: "$500", desc: "$500 Visa Gift Card — spend anywhere", emoji: "💳", tier: "Silver" },
  { prize: "Chaniya Choli Set", value: "$350", desc: "Custom embroidered chaniya choli from Kala Niketan", emoji: "👗", tier: "Silver" },
  { prize: "Jewelry Set", value: "$200", desc: "22k Gold-plated kundan necklace set", emoji: "💎", tier: "Bronze" },
  { prize: "Restaurant Vouchers", value: "$150", desc: "3 × $50 dining vouchers at top desi restaurants", emoji: "🍽️", tier: "Bronze" },
];

const SPONSORS = [
  { name: "Dr. Patel's Family Dentistry", tier: "Title Sponsor", desc: "Your community's smile specialists since 2003", color: "#2E1B30", emoji: "🦷" },
  { name: "Priya Singh Realty · Keller Williams", tier: "Gold Sponsor", desc: "First-generation homebuyer specialists in NJ, NY & CA", color: "#0E8C7A", emoji: "🏡" },
  { name: "Bay Area Chiro & Wellness", tier: "Silver Sponsor", desc: "Dr. Meera Choksi, DC — dance & performance recovery", color: "#D4891B", emoji: "💆" },
  { name: "Desi Threads Boutique", tier: "Community Sponsor", desc: "Traditional & fusion Indian wear — 20% off for attendees", color: "#7C1F2C", emoji: "👗" },
];

const ATTENDEES = [
  { name: "Priya Patel", initials: "PP", city: "Edison, NJ", color: "#7C1F2C", connected: false },
  { name: "Rohan Shah", initials: "RS", city: "New York, NY", color: "#0E8C7A", connected: true },
  { name: "Meera Desai", initials: "MD", city: "Jersey City, NJ", color: "#D4891B", connected: false },
  { name: "Kavya Nair", initials: "KN", city: "Edison, NJ", color: "#5a1e7a", connected: false },
  { name: "Arjun Bhatt", initials: "AB", city: "Princeton, NJ", color: "#892240", connected: false },
  { name: "Tara Modi", initials: "TM", city: "Woodbridge, NJ", color: "#1a4a5e", connected: false },
  { name: "Sanjay Vora", initials: "SV", city: "Newark, NJ", color: "#3D2543", connected: false },
  { name: "Divya Mehta", initials: "DM", city: "Edison, NJ", color: "#7C1F2C", connected: false },
  { name: "Neil Joshi", initials: "NJ", city: "Piscataway, NJ", color: "#0E8C7A", connected: false },
  { name: "Asha Trivedi", initials: "AT", city: "New Brunswick, NJ", color: "#D4891B", connected: true },
  { name: "Karan Patel", initials: "KP", city: "Iselin, NJ", color: "#5a1e7a", connected: false },
  { name: "Rekha Shah", initials: "RS", city: "Edison, NJ", color: "#892240", connected: false },
];

const TABS = ["Schedule", "Artist", "Food & Raffle", "Sponsors", "Who's Going"] as const;
type Tab = typeof TABS[number];

export default function EventLivePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<Tab>("Schedule");
  const [attendees, setAttendees] = useState(ATTENDEES);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);

  const event = garbaEvents.find((e) => e.id === eventId) ?? garbaEvents.find((e) => SEEDED_TICKETS.some((t) => t.eventTitle === e.title)) ?? garbaEvents[0];
  const artist = artists.find((a) => a.slug === event.artistSlug)!;
  const myTicket = SEEDED_TICKETS.find((t) => t.eventTitle === event.title) ?? SEEDED_TICKETS[0];

  const schedule = SCHEDULE.map((s) => s.label === "Headline Artist" ? { ...s, desc: `${artist.name} takes the main stage` } : s);

  function toggleConnect(name: string) {
    setAttendees((prev) => prev.map((a) => a.name === name ? { ...a, connected: !a.connected } : a));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Live announcement banner */}
      {!dismissedAnnouncement && (
        <div className="rounded-2xl overflow-hidden" style={{backgroundColor:"#7C1F2C"}}>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">Live Update</span>
            </div>
            <p className="font-ui text-sm text-white flex-1">
              <strong>Organizer:</strong> Doors open at 6:00 PM sharp. VIP lounge on Level 2. Parking in Lot B is full — use Lot D.
            </p>
            <button onClick={() => setDismissedAnnouncement(true)} className="text-white/40 hover:text-white transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Event hero */}
      <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${artist.color}EE 0%, #2E1B30 100%)` }}>
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-marigold bg-marigold/15 px-2 py-0.5 rounded-full">Your Event</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{event.category}</span>
          </div>
          <h1 className="font-display font-bold text-white text-xl leading-snug mb-2">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-white/60 text-xs font-ui mb-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              {event.date} · {event.time}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              {event.venue}, {event.city}
            </span>
          </div>

          {/* Ticket preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-marigold/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🎟️</span>
            </div>
            <div className="flex-1">
              <p className="font-ui text-white text-sm font-semibold">{myTicket.qty} × {myTicket.ticketType} · #{myTicket.orderId}</p>
              <p className="font-mono text-[10px] text-white/50">Show QR at entrance</p>
            </div>
            <Link href="/portal/tickets" className="px-3 py-1.5 rounded-lg bg-marigold text-aubergine font-ui font-semibold text-xs hover:bg-marigold-dark transition-all">
              View QR
            </Link>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-white rounded-2xl border border-ivory-200 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? "bg-aubergine text-white" : "text-ink-muted hover:text-ink"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ── */}
      {activeTab === "Schedule" && (
        <div className="space-y-2">
          {schedule.map((item, i) => (
            <div key={i} className={`flex gap-4 p-4 rounded-2xl border transition-all ${item.highlight ? "border-marigold/30 bg-marigold/5" : "border-ivory-200 bg-white"}`}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">{item.icon}</span>
                {i < schedule.length - 1 && <div className="w-px flex-1 bg-ivory-200 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`font-display font-bold text-sm ${item.highlight ? "text-marigold-dark" : "text-ink"}`}>{item.label}</p>
                  {item.highlight && <span className="font-mono text-[9px] uppercase tracking-widest text-marigold bg-marigold/15 px-1.5 py-0.5 rounded-full">Main Event</span>}
                </div>
                <p className="font-mono text-[10px] text-marigold-dark font-bold mb-1">{item.time}</p>
                <p className="font-ui text-xs text-ink-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ARTIST TAB ── */}
      {activeTab === "Artist" && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden bg-white border border-ivory-200">
            <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${artist.color} 0%, #2E1B30 100%)` }}>
              <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: artist.color }}>
                {artist.initials}
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-display font-bold text-ink text-xl">{artist.name}</h2>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{artist.title}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white bg-aubergine px-2.5 py-1 rounded-full">Headliner</span>
              </div>
              <div className="space-y-3 text-sm font-ui text-ink-muted leading-relaxed">
                <p>
                  {artist.name} is one of the most celebrated voices in the Raas Garba tradition, performing for South Asian diaspora communities across North America for over two decades. Known for blending authentic folk roots with contemporary energy, their performances draw thousands of attendees each Navratri season.
                </p>
                <p>
                  With a repertoire spanning traditional Gujarati folk songs to original compositions, {artist.name} creates an atmosphere that connects generations — from grandparents who grew up in Gujarat to second-generation Americans discovering their heritage through dance.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Years performing", value: "20+" },
                  { label: "Albums", value: "14" },
                  { label: "Live shows", value: "300+" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-ivory border border-ivory-200">
                    <p className="font-display font-bold text-aubergine text-xl">{s.value}</p>
                    <p className="font-mono text-[9px] uppercase tracking-wide text-ink-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Known songs */}
          <div className="rounded-2xl bg-white border border-ivory-200 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Popular Songs Tonight</p>
            <div className="space-y-2.5">
              {["Avo Re Avo Garba Khelo", "Dholi Taro Dhol Baaje", "Maro Dholaro", "Navratri Special Medley", "Jai Mata Di (Closing)"].map((song, i) => (
                <div key={song} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-ink-muted w-4">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-ivory border border-ivory-200 flex items-center justify-center text-sm">🎵</div>
                  <p className="font-ui text-sm text-ink">{song}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOD & RAFFLE TAB ── */}
      {activeTab === "Food & Raffle" && (
        <div className="space-y-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Food Vendors</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOOD_VENDORS.map((v) => (
                <div key={v.name} className="p-4 rounded-2xl bg-white border border-ivory-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{v.emoji}</span>
                    <p className="font-display font-bold text-ink text-sm">{v.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.items.map((item) => (
                      <span key={item} className="font-mono text-[10px] bg-ivory border border-ivory-200 text-ink-muted px-2 py-0.5 rounded-full">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Raffle Prizes</p>
              <span className="font-mono text-[9px] text-white bg-durga px-2 py-0.5 rounded-full">Raffle at 11:30 PM</span>
            </div>
            <div className="space-y-3">
              {RAFFLE_PRIZES.map((prize) => {
                const tierColors: Record<string,string> = { Grand:"#F5A623", Gold:"#D4891B", Silver:"#6B5E6E", Bronze:"#892240" };
                return (
                  <div key={prize.prize} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-ivory-200">
                    <span className="text-2xl">{prize.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-display font-bold text-ink text-sm">{prize.prize}</p>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full text-white" style={{backgroundColor: tierColors[prize.tier] ?? "#6B5E6E"}}>{prize.tier}</span>
                      </div>
                      <p className="font-ui text-xs text-ink-muted">{prize.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-ink text-base">{prize.value}</p>
                      <p className="font-mono text-[10px] text-ink-muted">value</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-4 rounded-xl bg-aubergine/5 border border-aubergine/10">
              <p className="font-ui text-xs text-ink-muted">
                🎟️ Raffle tickets: $5 each or 5 for $20. Purchase at the information table near the entrance. <strong className="text-ink">Must be present to win.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SPONSORS TAB ── */}
      {activeTab === "Sponsors" && (
        <div className="space-y-4">
          <p className="font-ui text-sm text-ink-muted">These businesses make this event possible. Show them some love.</p>
          {SPONSORS.map((sponsor) => (
            <div key={sponsor.name} className="rounded-2xl overflow-hidden border border-ivory-200 bg-white">
              <div className="px-1 py-1 flex justify-end">
                <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted px-2">{sponsor.tier}</span>
              </div>
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{backgroundColor: sponsor.color}}>
                  {sponsor.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-ink text-sm">{sponsor.name}</p>
                  <p className="font-ui text-xs text-ink-muted mt-0.5">{sponsor.desc}</p>
                </div>
                <button className="shrink-0 px-3 py-2 rounded-xl bg-ivory border border-ivory-200 text-ink font-ui font-semibold text-xs hover:border-aubergine/30 transition-all">
                  Visit →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WHO'S GOING TAB ── */}
      {activeTab === "Who's Going" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-ui text-sm text-ink-muted">{attendees.length * 30}+ people are going · Showing people near you</p>
            <button className="font-mono text-[10px] text-marigold-dark hover:text-marigold">Filter</button>
          </div>

          <div className="space-y-2">
            {attendees.map((a) => (
              <div key={a.name} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-ivory-200 hover:border-marigold/20 transition-all">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: a.color }}>
                  {a.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui font-semibold text-ink text-sm">{a.name}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{a.city}</p>
                </div>
                <button
                  onClick={() => toggleConnect(a.name)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl font-ui font-semibold text-xs transition-all ${a.connected ? "bg-peacock/10 text-peacock border border-peacock/20" : "bg-aubergine text-white hover:bg-aubergine-light"}`}
                >
                  {a.connected ? "✓ Connected" : "Connect"}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-5 text-center">
            <p className="font-display font-bold text-ink text-base mb-1">Know who else is going?</p>
            <p className="font-ui text-ink-muted text-sm mb-3">Invite your friends and meet up at the event.</p>
            <button className="px-5 py-2.5 rounded-xl bg-marigold text-aubergine font-ui font-bold text-sm hover:bg-marigold-dark transition-all">
              Share Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
