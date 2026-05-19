"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MsgReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  emoji: string;
  color1: string;
  color2: string;
  text: string;
  time: string;
  isMe?: boolean;
  isSystem?: boolean;
  isInvite?: boolean;
  inviteEvent?: { title: string; date: string; city: string; price: number; color1: string; color2: string };
  reactions: MsgReaction[];
}

interface GroupMember {
  name: string;
  emoji: string;
  color1: string;
  color2: string;
  paid: boolean;
}

interface GroupInfo {
  groupId: string;
  eventTitle: string;
  eventDate: string;
  eventCity: string;
  members: GroupMember[];
  targetSize: number;
  discountPct: number;
}

interface LinkedEvent {
  id: string;
  title: string;
  date: string;
  city: string;
  price: number;
  color1: string;
  color2: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const UPCOMING_EVENTS: LinkedEvent[] = [
  { id:"e1", title:"Kinjal Dave — Chicago Navratri",       date:"Oct 3–5, 2026",  city:"Chicago, IL",    price:45, color1:"#F5A623", color2:"#D4891B" },
  { id:"e2", title:"NYC Garba Mahotsav 2026",              date:"Oct 10, 2026",   city:"New York, NY",   price:55, color1:"#0E8C7A", color2:"#1ab89e" },
  { id:"e3", title:"Houston Raas Night — Falguni Pathak",  date:"Oct 17, 2026",   city:"Houston, TX",    price:60, color1:"#892240", color2:"#7C1F2C" },
  { id:"e4", title:"Bay Area Garba Festival 2026",         date:"Oct 24, 2026",   city:"Fremont, CA",    price:50, color1:"#5a1e7a", color2:"#2E1B30" },
  { id:"e5", title:"Atlanta Navratri Bash",                date:"Nov 1, 2026",    city:"Atlanta, GA",    price:40, color1:"#3D2543", color2:"#6B3A7A" },
];

const GROUP_DATA: Record<string, GroupInfo> = {
  "RM-GROUP01": {
    groupId: "RM-GROUP01",
    eventTitle: "Kinjal Dave — Chicago Navratri Nite",
    eventDate: "Oct 06, 2026",
    eventCity: "Chicago, IL",
    members: [
      { name:"You",    emoji:"👤", color1:"#2E1B30", color2:"#4a2850", paid:true },
      { name:"Priya",  emoji:"🦚", color1:"#5a1e7a", color2:"#8B2FC9", paid:true },
      { name:"Rohan",  emoji:"🐯", color1:"#892240", color2:"#D4891B", paid:true },
      { name:"Aisha",  emoji:"🦋", color1:"#0E8C7A", color2:"#1ab89e", paid:true },
      { name:"Dev",    emoji:"🦁", color1:"#D4891B", color2:"#F5A623", paid:false },
      { name:"Mia",    emoji:"🦜", color1:"#1a4a5e", color2:"#2a7a9e", paid:false },
      { name:"Sanjay", emoji:"🐻", color1:"#3D2543", color2:"#6B3A7A", paid:true },
      { name:"Nivi",   emoji:"🦩", color1:"#D4891B", color2:"#E8A53D", paid:false },
    ],
    targetSize: 8,
    discountPct: 12,
  },
};

const DEFAULT_GROUP: GroupInfo = {
  groupId: "RM-GROUP-NEW",
  eventTitle: "Your Group",
  eventDate: "",
  eventCity: "",
  members: [
    { name:"You",   emoji:"👤", color1:"#2E1B30", color2:"#4a2850", paid:false },
    { name:"Priya", emoji:"🦚", color1:"#5a1e7a", color2:"#8B2FC9", paid:false },
    { name:"Rohan", emoji:"🐯", color1:"#892240", color2:"#D4891B", paid:false },
  ],
  targetSize: 8,
  discountPct: 8,
};

const SEEDED_MESSAGES: ChatMessage[] = [
  { id:"m1",   sender:"Priya",  emoji:"🦚", color1:"#5a1e7a", color2:"#8B2FC9", text:"Hey everyone!! So pumped for Chicago Navratri 🎉 Who's all confirmed?",                   time:"2 days ago",   reactions:[] },
  { id:"m2",   sender:"Rohan",  emoji:"🐯", color1:"#892240", color2:"#D4891B", text:"I'm in! Already got my chaniya choli ready from last year 😂",                            time:"2 days ago",   reactions:[{ emoji:"😂", count:3, reactedByMe:false }] },
  { id:"m3",   sender:"Aisha",  emoji:"🦋", color1:"#0E8C7A", color2:"#1ab89e", text:"Same! This is going to be amazing. Kinjal Dave is literally my fav 🧡",                  time:"2 days ago",   reactions:[{ emoji:"🧡", count:4, reactedByMe:true }, { emoji:"🎉", count:2, reactedByMe:false }] },
  { id:"sys1", sender:"System", emoji:"R",  color1:"#F5A623", color2:"#D4891B", text:"Dev joined the group",                                                                    time:"2 days ago",   isSystem:true, reactions:[] },
  { id:"m4",   sender:"Dev",    emoji:"🦁", color1:"#D4891B", color2:"#F5A623", text:"yo what's the plan for getting there? Should we carpool?",                                time:"2 days ago",   reactions:[] },
  { id:"m5",   sender:"Rohan",  emoji:"🐯", color1:"#892240", color2:"#D4891B", text:"I can drive from Evanston, can fit 4 people in my car. Who needs a ride?",               time:"2 days ago",   reactions:[{ emoji:"🙌", count:2, reactedByMe:false }] },
  { id:"m6",   sender:"Sanjay", emoji:"🐻", color1:"#3D2543", color2:"#6B3A7A", text:"Rohan count me in! I'm near you anyway 🙌",                                              time:"1 day ago",    reactions:[] },
  { id:"sys2", sender:"System", emoji:"R",  color1:"#F5A623", color2:"#D4891B", text:"Group discount of 12% unlocked! All 8 members joined 🎉",                                time:"1 day ago",    isSystem:true, reactions:[] },
  { id:"m7",   sender:"Priya",  emoji:"🦚", color1:"#5a1e7a", color2:"#8B2FC9", text:"YESSS the discount unlocked!! Everyone who hasn't paid yet — go pay so we're all confirmed 👆", time:"1 day ago", reactions:[{ emoji:"🔥", count:5, reactedByMe:true }] },
  { id:"m8",   sender:"Aisha",  emoji:"🦋", color1:"#0E8C7A", color2:"#1ab89e", text:"What time is everyone meeting before? Dinner first?",                                    time:"1 day ago",    reactions:[] },
  { id:"m9",   sender:"Rohan",  emoji:"🐯", color1:"#892240", color2:"#D4891B", text:"There's a great spot called Patel's Kitchen 5 mins from Rosemont. 5:30 PM?",            time:"23 hours ago", reactions:[{ emoji:"✅", count:3, reactedByMe:false }] },
  { id:"m10",  sender:"Priya",  emoji:"🦚", color1:"#5a1e7a", color2:"#8B2FC9", text:"5:30 works for me! ✅",                                                                  time:"23 hours ago", reactions:[] },
  { id:"m11",  sender:"Dev",    emoji:"🦁", color1:"#D4891B", color2:"#F5A623", text:"Same 👍",                                                                                time:"22 hours ago", reactions:[] },
  { id:"m12",  sender:"Mia",    emoji:"🦜", color1:"#1a4a5e", color2:"#2a7a9e", text:"Sorry just saw this! I can make 5:30. What's the address for Patel's?",                   time:"5 hours ago",  reactions:[] },
  { id:"m13",  sender:"Sanjay", emoji:"🐻", color1:"#3D2543", color2:"#6B3A7A", text:"9845 Mannheim Rd, Rosemont — right by the venue! Amazing pav bhaji there 🤌",            time:"5 hours ago",  reactions:[{ emoji:"🤌", count:2, reactedByMe:false }] },
  { id:"m14",  sender:"Aisha",  emoji:"🦋", color1:"#0E8C7A", color2:"#1ab89e", text:"Can't wait!! This is going to be the best Navratri ever 🔥🥁",                          time:"3 hours ago",  reactions:[{ emoji:"🔥", count:6, reactedByMe:true }, { emoji:"🥁", count:3, reactedByMe:false }] },
];

const QUICK_REACTIONS = ["🔥", "🎉", "🥁", "😂", "🧡", "🙌"];

// ─── Invite Event Card (system message variant) ───────────────────────────────
function InviteCard({ event }: { event: NonNullable<ChatMessage["inviteEvent"]> }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-marigold/30 mt-2 max-w-[85%]">
      <div className="h-12 relative" style={{ background: `linear-gradient(135deg, ${event.color1}, ${event.color2})` }}>
        <div className="absolute inset-0 flex items-center px-3 gap-2">
          <span className="text-2xl">🎉</span>
          <p className="font-display font-bold text-white text-sm truncate">{event.title}</p>
        </div>
      </div>
      <div className="bg-white px-3 py-2.5 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] text-ink-muted">{event.date} · {event.city}</p>
          <p className="font-mono text-[10px] font-bold text-[#D4891B] mt-0.5">From ${event.price}/ticket · buy together for group discount</p>
        </div>
        <Link
          href="/events"
          className="shrink-0 px-3 py-1.5 rounded-xl bg-marigold text-aubergine font-ui font-bold text-xs hover:bg-[#E8A53D] transition-all"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  showAvatar,
  onReact,
}: {
  msg: ChatMessage;
  showAvatar: boolean;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const [showReactionBar, setShowReactionBar] = useState(false);

  if (msg.isSystem) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-ivory-200" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-marigold/10 border border-marigold/20">
          <span className="font-mono text-[9px] uppercase tracking-wide text-[#D4891B] font-bold">{msg.text}</span>
        </div>
        <div className="h-px flex-1 bg-ivory-200" />
      </div>
    );
  }

  if (msg.isMe) {
    return (
      <div className="flex justify-end gap-2 group/msg">
        <div className="max-w-[75%]">
          <div
            className="relative"
            onMouseEnter={() => setShowReactionBar(true)}
            onMouseLeave={() => setShowReactionBar(false)}
          >
            {showReactionBar && (
              <div className="absolute right-0 -top-9 flex items-center gap-1 bg-white border border-ivory-200 rounded-full px-2 py-1 shadow-lg z-10">
                {QUICK_REACTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => { onReact(msg.id, em); setShowReactionBar(false); }}
                    className="text-base hover:scale-125 transition-transform"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
            <div className="bg-aubergine text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
              <p className="font-ui text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
          {msg.inviteEvent && <InviteCard event={msg.inviteEvent} />}
          {msg.reactions.length > 0 && (
            <div className="flex gap-1 mt-1.5 justify-end flex-wrap">
              {msg.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    r.reactedByMe
                      ? "bg-aubergine/10 border-aubergine/30 text-aubergine"
                      : "bg-ivory border-ivory-200 text-ink-muted hover:border-aubergine/20"
                  }`}
                >
                  {r.emoji} <span className="font-mono text-[10px]">{r.count}</span>
                </button>
              ))}
            </div>
          )}
          <p className="font-mono text-[9px] text-ink-muted mt-1 text-right">{msg.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 group/msg">
      {showAvatar ? (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
          style={{ background: `linear-gradient(135deg, ${msg.color1}, ${msg.color2})` }}
        >
          {msg.emoji}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="max-w-[75%]">
        {showAvatar && (
          <p className="font-mono text-[10px] text-ink-muted mb-1">{msg.sender}</p>
        )}
        <div
          className="relative"
          onMouseEnter={() => setShowReactionBar(true)}
          onMouseLeave={() => setShowReactionBar(false)}
        >
          {showReactionBar && (
            <div className="absolute left-0 -top-9 flex items-center gap-1 bg-white border border-ivory-200 rounded-full px-2 py-1 shadow-lg z-10">
              {QUICK_REACTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => { onReact(msg.id, em); setShowReactionBar(false); }}
                  className="text-base hover:scale-125 transition-transform"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
          <div className="bg-white border border-ivory-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <p className="font-ui text-sm text-ink leading-relaxed">{msg.text}</p>
          </div>
        </div>
        {msg.inviteEvent && <InviteCard event={msg.inviteEvent} />}
        {msg.reactions.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(msg.id, r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                  r.reactedByMe
                    ? "bg-peacock/10 border-peacock/30 text-peacock"
                    : "bg-ivory border-ivory-200 text-ink-muted hover:border-aubergine/20"
                }`}
              >
                {r.emoji} <span className="font-mono text-[10px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}
        <p className="font-mono text-[9px] text-ink-muted mt-1">{msg.time}</p>
      </div>
    </div>
  );
}

// ─── Invite to Event Modal ────────────────────────────────────────────────────
function InviteEventModal({
  groupName,
  onClose,
  onSend,
}: {
  groupName: string;
  onClose: () => void;
  onSend: (event: LinkedEvent) => void;
}) {
  const [selected, setSelected] = useState<LinkedEvent | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Invite group</p>
            <h3 className="font-display font-bold text-ink text-base mt-0.5">{groupName}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-ivory flex items-center justify-center text-ink-muted hover:text-ink transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-4 space-y-2 max-h-80 overflow-y-auto">
          {UPCOMING_EVENTS.map((ev) => {
            const isSel = selected?.id === ev.id;
            return (
              <button
                key={ev.id}
                onClick={() => setSelected(isSel ? null : ev)}
                className={`w-full text-left rounded-xl overflow-hidden border-2 transition-all ${isSel ? "border-aubergine" : "border-ivory-200 hover:border-aubergine/30"}`}
              >
                <div className="h-10 flex items-center px-3 gap-2" style={{ background: `linear-gradient(135deg, ${ev.color1}, ${ev.color2})` }}>
                  <span className="text-white font-display font-bold text-sm truncate">{ev.title}</span>
                  {isSel && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-ink-muted">{ev.date}</span>
                  <span className="text-ink-muted/30">·</span>
                  <span className="font-mono text-[10px] text-ink-muted">{ev.city}</span>
                  <span className="ml-auto font-mono text-[10px] font-bold text-[#D4891B]">${ev.price}/ticket</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={() => { if (selected) { onSend(selected); onClose(); } }}
            disabled={!selected}
            className={`w-full py-3 rounded-2xl font-display font-bold text-sm transition-all ${selected ? "bg-marigold text-aubergine hover:bg-[#E8A53D]" : "bg-ivory text-ink-muted cursor-not-allowed"}`}
          >
            {selected ? "Send Invite to Group" : "Pick an event first"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [messages, setMessages] = useState<ChatMessage[]>(SEEDED_MESSAGES);
  const [input, setInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isInterestGroup = groupId.startsWith("INT-");
  const group = GROUP_DATA[groupId] ?? DEFAULT_GROUP;
  const paidCount = group.members.filter((m) => m.paid).length;

  // Interest groups start empty
  const visibleMessages = isInterestGroup ? messages.filter((m) => !SEEDED_MESSAGES.includes(m)) : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    setMessages((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        sender: "You",
        emoji: "👤",
        color1: "#2E1B30",
        color2: "#4a2850",
        text,
        time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
        isMe: true,
        reactions: [],
      },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleReact(msgId: string, emoji: string) {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        const existing = msg.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...msg,
            reactions: msg.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe }
                  : r
              )
              .filter((r) => r.count > 0),
          };
        }
        return { ...msg, reactions: [...msg.reactions, { emoji, count: 1, reactedByMe: true }] };
      })
    );
  }

  function handleSendInvite(event: LinkedEvent) {
    const now = new Date();
    setMessages((prev) => [
      ...prev,
      {
        id: `inv${Date.now()}`,
        sender: "You",
        emoji: "👤",
        color1: "#2E1B30",
        color2: "#4a2850",
        text: `I'm inviting everyone to ${event.title}! Buy tickets together and we all save ${group.discountPct}% 🎉`,
        time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
        isMe: true,
        isInvite: true,
        inviteEvent: event,
        reactions: [],
      },
      {
        id: `sys${Date.now()}`,
        sender: "System",
        emoji: "R",
        color1: "#F5A623",
        color2: "#D4891B",
        text: `Event invite sent · buy together for group discount 🎟️`,
        time: "",
        isSystem: true,
        reactions: [],
      },
    ]);
  }

  const FRIENDS_TO_ADD = [
    { name:"Arjun",  emoji:"🦊", color1:"#7C1F2C", color2:"#B82D40" },
    { name:"Tara",   emoji:"🦄", color1:"#5a1e7a", color2:"#7B3FA3" },
    { name:"Kavya",  emoji:"🦅", color1:"#1a4a5e", color2:"#2a6a7e" },
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 88px)" }}>
      {showInvite && (
        <InviteEventModal
          groupName={group.eventTitle || "Your Group"}
          onClose={() => setShowInvite(false)}
          onSend={handleSendInvite}
        />
      )}

      {/* Chat header */}
      <div className="rounded-2xl overflow-hidden mb-3 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#2E1B30" }}>
          <Link href="/portal/groups" className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Member stack */}
          <div className="flex -space-x-2 shrink-0">
            {group.members.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-xl border-2 flex items-center justify-center text-base"
                style={{ background: `linear-gradient(135deg, ${m.color1}, ${m.color2})`, borderColor: "#2E1B30" }}
              >
                {m.emoji}
              </div>
            ))}
            {group.members.length > 4 && (
              <div className="w-8 h-8 rounded-xl border-2 bg-white/10 flex items-center justify-center text-white/60 text-[9px] font-bold" style={{ borderColor: "#2E1B30" }}>
                +{group.members.length - 4}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm truncate">{group.eventTitle}</p>
            <p className="font-mono text-[10px] text-white/40">{group.members.length} members{group.eventDate ? ` · ${group.eventDate}` : ""}</p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowInvite(true)}
              className="h-8 px-2.5 rounded-xl bg-marigold/20 text-marigold flex items-center gap-1.5 hover:bg-marigold/30 transition-all"
              title="Invite group to event"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-mono text-[9px] font-bold hidden sm:block">Invite</span>
            </button>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              title="Add member"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Discount bar */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${paidCount >= group.targetSize ? "bg-peacock" : "bg-marigold/90"}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <p className="font-ui text-xs font-bold text-white">
              {paidCount >= group.targetSize
                ? `${group.discountPct}% group discount unlocked for everyone! 🎉`
                : `${paidCount}/${group.members.length} paid · ${group.discountPct}% off unlocks when all pay`}
            </p>
          </div>
          <div className="flex gap-1">
            {group.members.map((m, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${m.paid ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </div>

        {/* Add member panel */}
        {showAddMember && (
          <div className="bg-white border-x border-b border-ivory-200 px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">Invite friends to group</p>
            <div className="space-y-2">
              {FRIENDS_TO_ADD.map((f) => (
                <div key={f.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: `linear-gradient(135deg, ${f.color1}, ${f.color2})` }}>
                    {f.emoji}
                  </div>
                  <span className="font-ui text-sm text-ink flex-1">{f.name}</span>
                  <button
                    onClick={() => {
                      setMessages((prev) => [...prev, {
                        id: `sys${Date.now()}`, sender:"System", emoji:"R", color1:"#F5A623", color2:"#D4891B",
                        text:`${f.name} joined the group`, time:"just now", isSystem:true, reactions:[],
                      }]);
                      setShowAddMember(false);
                    }}
                    className="h-7 px-3 rounded-lg bg-aubergine text-white font-ui text-xs font-semibold hover:opacity-90 transition-all"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group info panel */}
        {showInfo && (
          <div className="bg-white border-x border-b border-ivory-200 px-4 py-4 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Members ({group.members.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {group.members.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `linear-gradient(135deg, ${m.color1}, ${m.color2})` }}>
                      {m.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-xs font-semibold text-ink">{m.name}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
                      {m.paid && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/portal/tickets" className="flex-1 py-2.5 rounded-xl bg-ivory border border-ivory-200 text-ink font-ui font-semibold text-xs text-center hover:border-aubergine/30 transition-all">
                My Tickets
              </Link>
              <button
                onClick={() => setShowInvite(true)}
                className="flex-1 py-2.5 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-xs text-center hover:bg-[#E8A53D] transition-all"
              >
                Invite to Event 🎉
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2" style={{ scrollbarWidth: "none" }}>
        {isInterestGroup && visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl shadow-lg" style={{ background: "linear-gradient(135deg, #2E1B30, #4a2850)" }}>
              👋
            </div>
            <div className="text-center max-w-xs">
              <p className="font-display font-bold text-ink text-lg">Be the first to say hi!</p>
              <p className="font-ui text-sm text-ink-muted mt-1.5 leading-relaxed">
                This community just got a new member — you. Drop an intro and get the conversation started.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["👋 Hey everyone!", "Just joined — excited to be here!", "Who else is going to a garba event this year?"].map((starter) => (
                <button
                  key={starter}
                  onClick={() => setInput(starter)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-ivory-200 text-ink font-ui text-xs hover:border-aubergine/30 transition-all"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="font-mono text-[10px] text-ink-muted text-center py-2">
              {isInterestGroup
                ? `Community · ${group.members.length}+ members · hover messages to react`
                : `Group created · ${group.members.length} members · hover messages to react`}
            </p>
            {visibleMessages.map((msg, i) => {
              const prevMsg = visibleMessages[i - 1];
              const showAvatar = !msg.isMe && !msg.isSystem && (prevMsg?.sender !== msg.sender || !!prevMsg?.isSystem);
              return (
                <MessageBubble key={msg.id} msg={msg} showAvatar={showAvatar} onReact={handleReact} />
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3">
        <div className="flex gap-2 items-end bg-white border border-ivory-200 rounded-2xl px-3 py-2.5 focus-within:border-aubergine/40 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Message your group…"
            className="flex-1 font-ui text-sm text-ink placeholder-ink-muted/50 bg-transparent focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowInvite(true)}
              className="w-8 h-8 rounded-xl text-marigold-dark hover:bg-marigold/10 transition-all flex items-center justify-center"
              title="Invite to event"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-ivory transition-all flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                input.trim() ? "bg-aubergine text-white hover:opacity-90" : "bg-ivory text-ink-muted cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] text-ink-muted text-center mt-1.5">
          Messages visible to all {group.members.length} members
        </p>
      </div>
    </div>
  );
}
