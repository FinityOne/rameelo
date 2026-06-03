"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import QRLib from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { GRADIENTS } from "../events/create/types";
import { useOrg } from "../org-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventRow = {
  id: string;
  title: string;
  artist: string | null;
  start_date: string;
  start_time: string | null;
  city: string | null;
  state: string | null;
  venue_name: string | null;
  cover_gradient: string;
  status: string;
  selling_on_rameelo: boolean;
  artists: { name: string } | null;
  ticket_tiers: { price: number }[];
};

type EventVM = {
  id: string; title: string; artist: string | null; dateStr: string; timeStr: string | null;
  city: string | null; state: string | null; venue: string | null; gradientCss: string;
  status: string; priceFrom: number | null; url: string;
};

const CATEGORY_FALLBACK = "Garba Night";

function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmt12(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
}
function gradientColors(css: string): string[] {
  const m = css.match(/#[0-9a-fA-F]{6}/g);
  return m && m.length ? m : ["#2E1B30", "#3D2543"];
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1800); }}
      className={`inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-1.5 rounded-lg transition-all ${done ? "bg-peacock text-white" : "bg-aubergine text-white hover:bg-aubergine-light"} ${className}`}
    >
      {done ? (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied</>
      ) : (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{label}</>
      )}
    </button>
  );
}

// ── QR card ────────────────────────────────────────────────────────────────────

function QRCard({ ev }: { ev: EventVM }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    QRLib.toDataURL(ev.url, { width: 320, margin: 2, color: { dark: "#2E1B30", light: "#ffffff" } }).then(setPreview).catch(() => {});
  }, [ev.url]);

  async function download() {
    const data = await QRLib.toDataURL(ev.url, { width: 1024, margin: 3, color: { dark: "#2E1B30", light: "#ffffff" } });
    const a = document.createElement("a"); a.href = data; a.download = `${slug(ev.title)}-qr.png`; a.click();
  }

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5">
      <div className="flex items-start gap-4">
        <div className="w-28 h-28 rounded-xl border border-ivory-200 p-2 bg-white shrink-0">
          {preview && <img src={preview} alt="Event QR code" className="w-full h-full" style={{ imageRendering: "pixelated" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Event QR code</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5 mb-3">Print it on posters or show it at the door — it opens your event page on Rameelo.</p>
          <button onClick={download} className="inline-flex items-center gap-1.5 bg-aubergine text-white font-ui font-semibold text-xs px-3.5 py-2 rounded-lg hover:bg-aubergine-light transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Flyer card (canvas-rendered, downloadable poster) ────────────────────────────

function FlyerCard({ ev }: { ev: EventVM }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setReady(false);
      const W = 1080, H = 1350, P = 90;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background gradient
      const colors = gradientColors(ev.gradientCss);
      const g = ctx.createLinearGradient(0, 0, W, H);
      colors.forEach((c, i) => g.addColorStop(colors.length > 1 ? i / (colors.length - 1) : 0, c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Decorative dotted ring (top-right) + bottom vignette
      ctx.strokeStyle = "rgba(245,166,35,0.18)"; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.arc(W - 60, 120, 260, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const vig = ctx.createLinearGradient(0, H * 0.4, 0, H);
      vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vig; ctx.fillRect(0, H * 0.4, W, H * 0.6);

      // Eyebrow
      ctx.textBaseline = "top"; ctx.textAlign = "left";
      ctx.fillStyle = "#F5A623"; ctx.font = "700 30px Georgia";
      ctx.fillText("RAMEELO  ·  " + CATEGORY_FALLBACK.toUpperCase(), P, P);

      // QR (bottom-left white chip) — render first so we can lay out text above it
      const qrCanvas = document.createElement("canvas");
      await QRLib.toCanvas(qrCanvas, ev.url, { width: 200, margin: 1, color: { dark: "#2E1B30", light: "#ffffff" } });
      if (cancelled) return;
      const chipH = 260, chipY = H - P - chipH, chipW = W - P * 2;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.roundRect(P, chipY, chipW, chipH, 28); ctx.fill();
      ctx.drawImage(qrCanvas, P + 30, chipY + 30, 200, 200);
      ctx.fillStyle = "#2E1B30"; ctx.textAlign = "left";
      ctx.font = "800 40px Georgia";
      ctx.fillText("Scan to get tickets", P + 256, chipY + 60);
      ctx.fillStyle = "#6B5E6E"; ctx.font = "500 26px Georgia";
      ctx.fillText("rameelo.com", P + 256, chipY + 120);
      ctx.fillStyle = ev.priceFrom !== null ? "#0E8C7A" : "#6B5E6E"; ctx.font = "800 30px Georgia";
      ctx.fillText(ev.priceFrom === null ? "Tickets on Rameelo" : ev.priceFrom === 0 ? "Free entry" : `From $${ev.priceFrom}`, P + 256, chipY + 168);

      // Text block (drawn upward from just above the chip)
      let y = chipY - 50;
      const drawUp = (text: string, font: string, color: string, lh: number) => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "left";
        ctx.fillText(text, P, y); y -= lh;
      };
      // meta lines (bottom to top)
      const meta: string[] = [];
      if (ev.venue || ev.city) meta.push([ev.venue, [ev.city, ev.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "));
      meta.push([fmtDay(ev.dateStr), fmt12(ev.timeStr)].filter(Boolean).join("  ·  "));
      [...meta].forEach(line => drawUp(line, "500 34px Georgia", "rgba(255,255,255,0.92)", 50));
      y -= 6;
      if (ev.artist) drawUp(ev.artist, "700 46px Georgia", "#F5C84C", 70);

      // Title — wrap upward, up to 3 lines
      ctx.font = "800 90px Georgia";
      const maxW = W - P * 2;
      const words = ev.title.split(" ");
      const lines: string[] = []; let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
      }
      if (cur) lines.push(cur);
      const shown = lines.slice(0, 3);
      ctx.fillStyle = "#FFFFFF";
      for (let i = shown.length - 1; i >= 0; i--) { ctx.fillText(shown[i], P, y); y -= 100; }

      if (!cancelled) setReady(true);
    }
    render();
    return () => { cancelled = true; };
  }, [ev]);

  function download() {
    const canvas = canvasRef.current; if (!canvas) return;
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `${slug(ev.title)}-flyer.png`; a.click();
  }

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Event flyer</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">Story-ready 1080×1350 poster with your details and a scan-for-tickets code.</p>
        </div>
        <button onClick={download} disabled={!ready}
          className="inline-flex items-center gap-1.5 bg-marigold text-aubergine font-display font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm disabled:opacity-50 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download flyer
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-ivory-200 bg-ivory mx-auto" style={{ maxWidth: 320 }}>
        <canvas ref={canvasRef} className="w-full block" style={{ aspectRatio: "1080 / 1350" }} />
      </div>
    </div>
  );
}

// ── Promo kit (ready-to-post captions) ───────────────────────────────────────────

function PromoKit({ ev }: { ev: EventVM }) {
  const [tab, setTab] = useState<"instagram" | "whatsapp" | "story">("instagram");

  const cityTag = (ev.city ?? "").replace(/[^a-zA-Z]/g, "");
  const dateLine = [fmtDay(ev.dateStr), fmt12(ev.timeStr)].filter(Boolean).join(" · ");
  const place = [ev.venue, [ev.city, ev.state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  const priceLine = ev.priceFrom === null ? "" : ev.priceFrom === 0 ? "🎟️ Free entry" : `🎟️ Tickets from $${ev.priceFrom}`;

  const captions = useMemo(() => {
    const instagram = [
      `🪩 ${ev.title} is almost here!`,
      ev.artist ? `Dancing all night to ${ev.artist} 🎶` : `Get ready to dance all night 🎶`,
      ``,
      `📅 ${dateLine}`,
      place ? `📍 ${place}` : "",
      priceLine,
      ``,
      `Grab your tickets before they're gone 👇`,
      ev.url,
      ``,
      `#Garba #Navratri #Dandiya #RaasGarba${cityTag ? ` #${cityTag}` : ""} #Rameelo`,
    ].filter(l => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n");

    const whatsapp = [
      `*${ev.title}* 🪈`,
      `${dateLine}`,
      place ? `${place}` : "",
      ev.artist ? `Featuring ${ev.artist}` : "",
      priceLine,
      ``,
      `Get your tickets here 👉 ${ev.url}`,
    ].filter(Boolean).join("\n");

    const story = [
      `${ev.title}`,
      `${dateLine}${ev.city ? ` · ${ev.city}` : ""}`,
      ``,
      `Tap the link for tickets 🎟️`,
      ev.url,
    ].join("\n");

    return { instagram, whatsapp, story };
  }, [ev, dateLine, place, priceLine, cityTag]);

  const tabs = [
    { key: "instagram", label: "Instagram", emoji: "📸" },
    { key: "whatsapp", label: "WhatsApp", emoji: "💬" },
    { key: "story", label: "Story", emoji: "✨" },
  ] as const;

  const text = captions[tab];

  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-ivory-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-marigold/15 text-marigold-dark">Done for you</span>
        </div>
        <p className="font-display font-bold text-ink text-base" style={{ letterSpacing: "-0.01em" }}>Ready-to-post promo kit</p>
        <p className="font-ui text-xs text-ink-muted mt-0.5">We wrote the captions for you — pick a channel, copy, and post.</p>
      </div>

      <div className="px-5 pt-4">
        <div className="flex gap-1 bg-ivory rounded-xl p-1 border border-ivory-200 w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg font-ui font-semibold text-xs transition-all ${tab === t.key ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
              <span className="mr-1">{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-ivory-200 bg-ivory/50 p-4">
          <pre className="font-ui text-sm text-ink whitespace-pre-wrap break-words leading-relaxed">{text}</pre>
        </div>
        <div className="flex justify-end mt-3">
          <CopyButton text={text} label="Copy caption" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { activeOrg } = useOrg();
  const [events, setEvents] = useState<EventVM[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const q = supabase
        .from("events")
        .select("id, title, artist, start_date, start_time, city, state, venue_name, cover_gradient, status, selling_on_rameelo, artists(name), ticket_tiers(price)")
        .order("start_date", { ascending: false });
      const { data } = await (activeOrg ? q.eq("org_id", activeOrg.id) : q.eq("organizer_id", user.id));

      const vms: EventVM[] = ((data ?? []) as unknown as EventRow[]).map(e => {
        const prices = (e.ticket_tiers ?? []).map(t => Number(t.price));
        const gradient = GRADIENTS.find(g => g.id === e.cover_gradient) ?? GRADIENTS[0];
        return {
          id: e.id, title: e.title, artist: e.artists?.name ?? e.artist ?? null,
          dateStr: e.start_date, timeStr: e.start_time, city: e.city, state: e.state, venue: e.venue_name,
          gradientCss: gradient.css, status: e.status,
          priceFrom: prices.length ? Math.min(...prices) : null,
          url: `https://rameelo.com/events/${e.id}`,
        };
      });
      setEvents(vms);
      // default to soonest upcoming, else most recent
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = [...vms].reverse().find(v => v.dateStr >= today);
      setSelectedId(upcoming?.id ?? vms[0]?.id ?? "");
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const ev = events.find(e => e.id === selectedId) ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Marketing</h2>
        <p className="font-ui text-ink-muted text-sm mt-0.5">Everything you need to fill the floor — pick an event and grab your kit.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-marigold/10 border border-marigold/20 flex items-center justify-center mx-auto mb-4 text-3xl">📣</div>
          <p className="font-display font-semibold text-ink text-xl mb-2" style={{ letterSpacing: "-0.015em" }}>No events to promote yet</p>
          <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto mb-6">Create an event and your marketing kit — flyer, QR, captions — appears here instantly.</p>
          <Link href="/organizer/events/create" className="inline-flex items-center gap-2 bg-marigold text-aubergine font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-marigold-dark transition-colors shadow-sm">
            Create an event →
          </Link>
        </div>
      ) : (
        <>
          {/* Event picker */}
          <div className="bg-white rounded-2xl border border-ivory-200 p-4">
            <label className="font-mono text-[9px] uppercase tracking-widest text-ink-muted block mb-1.5">Promoting</label>
            <div className="relative">
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full h-11 rounded-xl border border-ivory-200 bg-ivory pl-3 pr-9 font-ui text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 cursor-pointer appearance-none">
                {events.map(e => (
                  <option key={e.id} value={e.id}>{e.title} · {fmtDay(e.dateStr)}{e.status !== "published" ? "  (not live yet)" : ""}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {ev && ev.status !== "published" && (
              <p className="font-ui text-[11px] text-marigold-dark mt-2">Heads up: this event isn&apos;t published yet, so the link and QR won&apos;t open publicly until it goes live.</p>
            )}
          </div>

          {ev && (
            <>
              {/* Shareable link */}
              <div className="bg-white rounded-2xl border border-ivory-200 p-5">
                <p className="font-display font-bold text-ink text-base mb-1" style={{ letterSpacing: "-0.01em" }}>Shareable link</p>
                <p className="font-ui text-xs text-ink-muted mb-3">Drop it in your bio, group chats, or anywhere.</p>
                <div className="flex items-center gap-2 rounded-xl border border-ivory-200 bg-ivory px-3 py-2.5">
                  <p className="flex-1 font-mono text-xs text-ink truncate">{ev.url}</p>
                  <CopyButton text={ev.url} label="Copy link" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${ev.title} 🪈 — ${ev.url}`)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-1.5 rounded-lg border border-ivory-200 text-ink hover:border-[#25D366]/50 transition-colors">
                    <span className="text-[#25D366]">●</span> WhatsApp
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${ev.title} 🪈`)}&url=${encodeURIComponent(ev.url)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-1.5 rounded-lg border border-ivory-200 text-ink hover:border-ink/30 transition-colors">
                    X / Twitter
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ev.url)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-ui font-semibold text-xs px-3 py-1.5 rounded-lg border border-ivory-200 text-ink hover:border-[#1877F2]/50 transition-colors">
                    <span className="text-[#1877F2]">●</span> Facebook
                  </a>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <QRCard ev={ev} />
                <div className="sm:row-span-2"><FlyerCard ev={ev} /></div>
                <PromoKit ev={ev} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
