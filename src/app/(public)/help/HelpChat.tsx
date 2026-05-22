"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = {
  role: "bot" | "user";
  text: string;
  cta?: { label: string; href: string };
};

const QA = [
  {
    question: "Where are my tickets?",
    answer: "Your tickets live in your Rameelo account under My Tickets. We also send a confirmation email to the address used at checkout — check your spam folder if it hasn't arrived within a few minutes.",
    cta: { label: "View My Tickets →", href: "/portal/tickets" },
  },
  {
    question: "How do group discounts work?",
    answer: "When 10 or more people buy tickets together through a Rameelo group order, everyone gets 15% off automatically — no promo code needed. One person starts the group, shares the link, and the discount applies once the minimum headcount is met.",
    cta: { label: "Browse events →", href: "/events" },
  },
  {
    question: "How do I get a refund?",
    answer: "Refund policies are set by each event organizer. Email hello@rameelo.com with your order ID and we'll work with the organizer on your behalf. Most events allow full refunds up to 7 days before the event date.",
    cta: { label: "Contact support →", href: "/contact" },
  },
  {
    question: "How do I list my event?",
    answer: "Head to the Organizer Hub to get started. Create an organizer account, add your event details, set ticket tiers and pricing, then publish — most organizers go live in under 10 minutes.",
    cta: { label: "Organizer Hub →", href: "/organizers" },
  },
  {
    question: "What payment methods are accepted?",
    answer: "Rameelo accepts all major credit and debit cards — Visa, Mastercard, Amex, and Discover — processed securely via Stripe. We currently don't support cash, checks, or crypto.",
  },
  {
    question: "How do I reset my password?",
    answer: "Visit the forgot password page, enter your email address, and you'll receive a secure reset link within a few minutes. The link expires after 1 hour. Check your spam folder if it doesn't arrive.",
    cta: { label: "Reset password →", href: "/auth/forgot-password" },
  },
  {
    question: "Can I transfer my ticket?",
    answer: "Yes! In My Tickets, select the ticket you want to transfer, tap Transfer, and enter the recipient's email. They'll receive an email to claim it. Transfers are only available before the event starts.",
    cta: { label: "My Tickets →", href: "/portal/tickets" },
  },
  {
    question: "When do organizers get paid?",
    answer: "Organizers receive payouts 3 business days after their event concludes, sent directly to the bank account on file. Track all payouts in the Financials section of your Organizer Portal.",
    cta: { label: "Organizer Portal →", href: "/portal/organizer/financials" },
  },
];

const GREETING =
  "Hi there! 👋 I'm the Rameelo support assistant. Tap any question below to get an instant answer.";

export default function HelpChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: GREETING },
  ]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function pick(idx: number) {
    if (asked.has(idx) || typing) return;
    setAsked((prev) => new Set([...prev, idx]));
    setMessages((prev) => [...prev, { role: "user", text: QA[idx].question }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: QA[idx].answer, cta: QA[idx].cta },
      ]);
    }, 680);
  }

  function reset() {
    setMessages([{ role: "bot", text: GREETING }]);
    setAsked(new Set());
    setTyping(false);
    setShowAll(false);
  }

  const remaining = QA.map((q, i) => ({ ...q, idx: i })).filter(
    (q) => !asked.has(q.idx)
  );
  const visible = showAll ? remaining : remaining.slice(0, 5);

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.38)]"
      style={{ background: "#180e1a", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3.5 flex items-center gap-3"
        style={{
          background: "#21102a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-marigold to-[#d97b0e] flex items-center justify-center shadow">
            <svg
              className="w-[17px] h-[17px] text-aubergine"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400"
            style={{ border: "2px solid #21102a" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-display font-bold text-white text-sm leading-none mb-0.5"
            style={{ letterSpacing: "-0.01em" }}
          >
            Rameelo Support
          </p>
          <p className="font-mono text-[9px] text-emerald-400/80 uppercase tracking-widest">
            Online · Replies in minutes
          </p>
        </div>
        <Link
          href="/contact"
          className="font-mono text-[9px] uppercase tracking-widest transition-colors shrink-0"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          Contact →
        </Link>
      </div>

      {/* ── Message thread ── */}
      <div
        className="px-4 py-4 space-y-3 overflow-y-auto"
        style={{ minHeight: 148, maxHeight: 272 }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "bot" && (
              <div className="w-6 h-6 rounded-full bg-marigold flex items-center justify-center text-[9px] font-bold text-aubergine shrink-0 mt-0.5">
                R
              </div>
            )}
            <div
              className={`max-w-[80%] px-3.5 py-2.5 font-ui text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-marigold text-aubergine font-semibold rounded-2xl rounded-tr-sm"
                  : "rounded-2xl rounded-tl-sm"
              }`}
              style={
                msg.role === "bot"
                  ? { background: "rgba(255,255,255,0.085)", color: "rgba(255,255,255,0.88)" }
                  : {}
              }
            >
              {msg.text}
              {msg.cta && (
                <Link
                  href={msg.cta.href}
                  className="block mt-1.5 font-semibold text-marigold text-xs hover:opacity-70 transition-opacity"
                >
                  {msg.cta.label}
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-marigold flex items-center justify-center text-[9px] font-bold text-aubergine shrink-0">
              R
            </div>
            <div
              className="px-3.5 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center"
              style={{ background: "rgba(255,255,255,0.085)" }}
            >
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                  style={{ animationDelay: `${n * 0.15}s`, animationDuration: "0.9s" }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick questions ── */}
      {!typing && (
        <div
          className="px-4 pb-4 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
        >
          {remaining.length > 0 ? (
            <>
              <p
                className="font-mono text-[9px] uppercase tracking-widest mb-2.5"
                style={{ color: "rgba(255,255,255,0.26)" }}
              >
                {asked.size > 0 ? "Ask another question" : "Tap a question to get started"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visible.map((qa) => (
                  <button
                    key={qa.idx}
                    onClick={() => pick(qa.idx)}
                    className="group px-3 py-1.5 rounded-full font-ui text-xs transition-all text-left"
                    style={{
                      border: "1px solid rgba(255,255,255,0.11)",
                      color: "rgba(255,255,255,0.62)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(245,166,35,0.45)";
                      e.currentTarget.style.color = "#F5A623";
                      e.currentTarget.style.background = "rgba(245,166,35,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.62)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {qa.question}
                  </button>
                ))}
                {!showAll && remaining.length > 5 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-3 py-1.5 rounded-full font-ui text-xs transition-colors"
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.32)",
                    }}
                  >
                    +{remaining.length - 5} more
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-1">
              <p className="font-ui text-xs mb-3" style={{ color: "rgba(255,255,255,0.36)" }}>
                You&rsquo;ve covered all the common questions!
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={reset}
                  className="font-ui text-xs underline transition-opacity hover:opacity-60"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  Start over
                </button>
                <Link
                  href="/contact"
                  className="px-4 py-1.5 rounded-full bg-marigold text-aubergine font-display font-bold text-xs hover:bg-marigold-dark transition-all"
                >
                  Contact us →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
