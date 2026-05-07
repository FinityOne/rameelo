"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ChatMessage {
  id: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  isMe?: boolean;
  isSystem?: boolean;
}

interface GroupInfo {
  groupId: string;
  eventTitle: string;
  eventDate: string;
  eventCity: string;
  artistColor: string;
  members: { name: string; initials: string; color: string; paid: boolean }[];
  targetSize: number;
  discountPct: number;
}

const GROUP_DATA: Record<string, GroupInfo> = {
  "RM-GROUP01": {
    groupId: "RM-GROUP01",
    eventTitle: "Kinjal Dave — Chicago Navratri Nite",
    eventDate: "Oct 06, 2026",
    eventCity: "Chicago, IL",
    artistColor: "#F5A623",
    members: [
      { name: "You",     initials: "ME", color: "#2E1B30", paid: true },
      { name: "Rohan",   initials: "RS", color: "#0E8C7A", paid: true },
      { name: "Meera",   initials: "MD", color: "#D4891B", paid: true },
      { name: "Kavya",   initials: "KN", color: "#5a1e7a", paid: true },
      { name: "Arjun",   initials: "AB", color: "#892240", paid: false },
      { name: "Tara",    initials: "TM", color: "#1a4a5e", paid: false },
      { name: "Sanjay",  initials: "SV", color: "#3D2543", paid: true },
      { name: "Divya",   initials: "DM", color: "#7C1F2C", paid: false },
    ],
    targetSize: 8,
    discountPct: 12,
  },
};

const SEEDED_MESSAGES: ChatMessage[] = [
  { id:"m1", sender:"Rohan",  initials:"RS", color:"#0E8C7A", text:"Hey everyone!! So pumped for Chicago Navratri 🎉 Who's all confirmed?", time:"2 days ago" },
  { id:"m2", sender:"Meera",  initials:"MD", color:"#D4891B", text:"I'm in! Already got my chaniya choli ready from last year 😂", time:"2 days ago" },
  { id:"m3", sender:"Kavya",  initials:"KN", color:"#5a1e7a", text:"Same! This is going to be amazing. Kinjal Dave is literally my fav 🧡", time:"2 days ago" },
  { id:"sys1", sender:"System", initials:"R", color:"#F5A623", text:"Arjun joined the group", time:"2 days ago", isSystem:true },
  { id:"m4", sender:"Arjun",  initials:"AB", color:"#892240", text:"yo what's the plan for getting there? Should we carpool?", time:"2 days ago" },
  { id:"m5", sender:"Rohan",  initials:"RS", color:"#0E8C7A", text:"I can drive from Evanston, can fit 4 people in my car. Who needs a ride?", time:"2 days ago" },
  { id:"m6", sender:"Sanjay", initials:"SV", color:"#3D2543", text:"Rohan count me in! I'm near you anyway 🙌", time:"1 day ago" },
  { id:"sys2", sender:"System", initials:"R", color:"#F5A623", text:"Group discount of 12% unlocked! All 8 members joined 🎉", time:"1 day ago", isSystem:true },
  { id:"m7", sender:"Meera",  initials:"MD", color:"#D4891B", text:"YESSS the discount unlocked!! Everyone who hasn't paid yet — go pay so we're all confirmed 👆", time:"1 day ago" },
  { id:"m8", sender:"Kavya",  initials:"KN", color:"#5a1e7a", text:"What time is everyone meeting before? Dinner first?", time:"1 day ago" },
  { id:"m9", sender:"Rohan",  initials:"RS", color:"#0E8C7A", text:"There's a great spot called Patel's Kitchen like 5 mins from Rosemont. 5:30 PM? Then we head over together for doors at 7", time:"23 hours ago" },
  { id:"m10", sender:"Meera", initials:"MD", color:"#D4891B", text:"5:30 works for me! ✅", time:"23 hours ago" },
  { id:"m11", sender:"Arjun", initials:"AB", color:"#892240", text:"Same 👍", time:"22 hours ago" },
  { id:"m12", sender:"Divya", initials:"DM", color:"#7C1F2C", text:"Sorry just saw this! I can make 5:30. What's the address for Patel's?", time:"5 hours ago" },
  { id:"m13", sender:"Sanjay", initials:"SV", color:"#3D2543", text:"9845 Mannheim Rd, Rosemont — it's right by the venue! They have amazing pav bhaji", time:"5 hours ago" },
  { id:"m14", sender:"Kavya", initials:"KN", color:"#5a1e7a", text:"Can't wait!! This is going to be the best Navratri ever 🔥🥁", time:"3 hours ago" },
];

function MessageBubble({ msg, showAvatar }: { msg: ChatMessage; showAvatar: boolean }) {
  if (msg.isSystem) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-ivory-200" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-marigold/10 border border-marigold/20">
          <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-dark font-bold">{msg.text}</span>
        </div>
        <div className="h-px flex-1 bg-ivory-200" />
      </div>
    );
  }

  if (msg.isMe) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[75%]">
          <div className="bg-aubergine text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="font-ui text-sm leading-relaxed">{msg.text}</p>
          </div>
          <p className="font-mono text-[9px] text-ink-muted mt-1 text-right">{msg.time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      {showAvatar ? (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: msg.color }}>
          {msg.initials}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="max-w-[75%]">
        {showAvatar && (
          <p className="font-mono text-[10px] text-ink-muted mb-1">{msg.sender}</p>
        )}
        <div className="bg-white border border-ivory-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="font-ui text-sm text-ink leading-relaxed">{msg.text}</p>
        </div>
        <p className="font-mono text-[9px] text-ink-muted mt-1">{msg.time}</p>
      </div>
    </div>
  );
}

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [messages, setMessages] = useState<ChatMessage[]>(SEEDED_MESSAGES);
  const [input, setInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const group = GROUP_DATA[groupId] ?? GROUP_DATA["RM-GROUP01"];
  const paidCount = group.members.filter((m) => m.paid).length;

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
        initials: "ME",
        color: "#2E1B30",
        text,
        time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
        isMe: true,
      },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 88px)" }}>
      {/* Chat header */}
      <div className="rounded-2xl overflow-hidden mb-3 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "#2E1B30" }}>
          <Link href="/portal/tickets" className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>

          <div className="flex -space-x-2 shrink-0">
            {group.members.slice(0, 4).map((m, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: m.color, borderColor: "#2E1B30" }}>
                {m.initials}
              </div>
            ))}
            {group.members.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 bg-white/10 flex items-center justify-center text-white/60 text-[9px] font-bold" style={{ borderColor: "#2E1B30" }}>
                +{group.members.length - 4}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm truncate">{group.eventTitle}</p>
            <p className="font-mono text-[10px] text-white/40">{group.members.length} members · {group.eventDate}</p>
          </div>

          <button onClick={() => setShowInfo(!showInfo)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>

        {/* Discount status bar */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${paidCount >= group.targetSize ? "bg-peacock" : "bg-marigold/90"}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <p className="font-ui text-xs font-bold text-white">
              {paidCount >= group.targetSize
                ? `${group.discountPct}% group discount unlocked for everyone! 🎉`
                : `${paidCount}/${group.targetSize} paid · ${group.discountPct}% off unlocks when all pay`}
            </p>
          </div>
          <div className="flex gap-1">
            {group.members.map((m, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${m.paid ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </div>

        {/* Group info panel */}
        {showInfo && (
          <div className="bg-white border-x border-b border-ivory-200 px-4 py-4 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">Members ({group.members.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {group.members.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: m.color }}>
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-xs font-semibold text-ink">{m.name}</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${m.paid ? "bg-peacock" : "bg-ivory-200"}`}>
                      {m.paid && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/portal/tickets" className="flex-1 py-2.5 rounded-xl bg-ivory border border-ivory-200 text-ink font-ui font-semibold text-xs text-center hover:border-aubergine/30 transition-all">
                View My Tickets
              </Link>
              <Link href={`/portal/events/${group.groupId}`} className="flex-1 py-2.5 rounded-xl bg-marigold text-aubergine font-ui font-semibold text-xs text-center hover:bg-marigold-dark transition-all">
                Event Details
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2" style={{ scrollbarWidth: "none" }}>
        <p className="font-mono text-[10px] text-ink-muted text-center py-2">Group created 2 days ago · {group.members.length} members</p>
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1];
          const showAvatar = !msg.isMe && !msg.isSystem && (prevMsg?.sender !== msg.sender || !!prevMsg?.isSystem);
          return <MessageBubble key={msg.id} msg={msg} showAvatar={showAvatar} />;
        })}
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
            className="flex-1 font-ui text-sm text-ink placeholder-ink-muted/50 bg-transparent focus:outline-none resize-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-ivory transition-all flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            </button>
            <button className="w-8 h-8 rounded-xl text-ink-muted hover:text-ink hover:bg-ivory transition-all flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() ? "bg-aubergine text-white hover:bg-aubergine-light" : "bg-ivory text-ink-muted cursor-not-allowed"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] text-ink-muted text-center mt-1.5">Messages visible to all {group.members.length} group members</p>
      </div>
    </div>
  );
}
