"use client";

import { useEffect, useRef, useState } from "react";

// ── Region colors matching the event cover gradient palette ─────────────────
const REGION_COLORS: Record<string, { fill: string; glow: string; label: string }> = {
  northeast: { fill: "#1E3A7A", glow: "#1E3A7A", label: "Northeast" },
  midwest:   { fill: "#0E7A6A", glow: "#0E8C7A", label: "Midwest" },
  southeast: { fill: "#B84A22", glow: "#CC4A20", label: "Southeast" },
  southwest: { fill: "#B84A22", glow: "#B84A22", label: "Southwest" },
  west:      { fill: "#D4891B", glow: "#F5C030", label: "West" },
};

const STATE_REGIONS: Record<string, string> = {
  ME:"northeast",NH:"northeast",VT:"northeast",MA:"northeast",RI:"northeast",
  CT:"northeast",NY:"northeast",NJ:"northeast",PA:"northeast",MD:"northeast",
  DE:"northeast",DC:"northeast",
  IL:"midwest",OH:"midwest",MI:"midwest",IN:"midwest",WI:"midwest",MN:"midwest",
  IA:"midwest",MO:"midwest",KS:"midwest",NE:"midwest",SD:"midwest",ND:"midwest",
  FL:"southeast",GA:"southeast",NC:"southeast",SC:"southeast",VA:"southeast",
  TN:"southeast",AL:"southeast",MS:"southeast",LA:"southeast",AR:"southeast",
  WV:"southeast",KY:"southeast",
  TX:"southwest",OK:"southwest",NM:"southwest",AZ:"southwest",
  CA:"west",OR:"west",WA:"west",NV:"west",UT:"west",CO:"west",
  ID:"west",MT:"west",WY:"west",AK:"west",HI:"west",
};

// ── City pins — the community's garba hubs ──────────────────────────────────
const PINS = [
  { city: "Edison, NJ",    x: 77.2, y: 26.5, size: "lg", region: "northeast", events: 12 },
  { city: "Houston, TX",   x: 52.5, y: 67.5, size: "lg", region: "southwest", events: 9  },
  { city: "Chicago, IL",   x: 61.5, y: 28.0, size: "lg", region: "midwest",   events: 8  },
  { city: "Atlanta, GA",   x: 67.5, y: 56.0, size: "md", region: "southeast", events: 7  },
  { city: "San Jose, CA",  x: 9.5,  y: 41.0, size: "lg", region: "west",      events: 10 },
  { city: "Dallas, TX",    x: 51.5, y: 61.0, size: "md", region: "southwest", events: 6  },
  { city: "Boston, MA",    x: 80.0, y: 21.5, size: "md", region: "northeast", events: 5  },
  { city: "Seattle, WA",   x: 10.0, y: 12.0, size: "md", region: "west",      events: 5  },
  { city: "Denver, CO",    x: 40.0, y: 40.0, size: "sm", region: "west",      events: 4  },
  { city: "Phoenix, AZ",   x: 23.5, y: 57.0, size: "sm", region: "southwest", events: 4  },
  { city: "Detroit, MI",   x: 67.0, y: 24.5, size: "sm", region: "midwest",   events: 3  },
  { city: "Philadelphia",  x: 76.0, y: 28.5, size: "sm", region: "northeast", events: 4  },
  { city: "Los Angeles",   x: 12.5, y: 52.5, size: "md", region: "west",      events: 6  },
  { city: "Austin, TX",    x: 50.0, y: 69.0, size: "sm", region: "southwest", events: 3  },
  { city: "Minneapolis",   x: 54.0, y: 19.5, size: "sm", region: "midwest",   events: 3  },
];

const PIN_SIZES: Record<string, number> = { lg: 14, md: 10, sm: 7 };
const PIN_DELAY_MS = 120; // stagger per pin

type PinState = "hidden" | "dropping" | "visible" | "pulsing";

interface PinData {
  city: string;
  x: number;
  y: number;
  size: string;
  region: string;
  events: number;
  state: PinState;
}

export default function USAEventMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<PinData[]>(
    PINS.map(p => ({ ...p, state: "hidden" as PinState }))
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Trigger pin drop animation as user scrolls the map into view
  useEffect(() => {
    if (hasStarted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.25 && !hasStarted) {
          setHasStarted(true);
          PINS.forEach((_, i) => {
            setTimeout(() => {
              setPins(prev => prev.map((p, j) =>
                j === i ? { ...p, state: "dropping" } : p
              ));
              setTimeout(() => {
                setPins(prev => prev.map((p, j) =>
                  j === i ? { ...p, state: "pulsing" } : p
                ));
              }, 380);
            }, i * PIN_DELAY_MS);
          });
        }
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  const regionCounts = Object.entries(REGION_COLORS).map(([key, val]) => ({
    key,
    label: val.label,
    color: val.fill,
    glow: val.glow,
    count: PINS.filter(p => p.region === key).reduce((s, p) => s + p.events, 0),
  }));

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1a0d1e 0%, #0d1a2e 50%, #0a1520 100%)" }}
    >
      {/* ── Atmospheric background glows ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #1E3A7A 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #D4891B 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #0E7A6A 0%, transparent 70%)" }} />
      </div>

      {/* ── Noise texture overlay ── */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "256px" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ── Section header ── */}
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-marigold mb-3">Live across the USA</p>
          <h2
            className="font-display font-bold text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Garba is everywhere.{" "}
            <span className="text-marigold" style={{ fontStyle: "normal" }}>We&apos;re mapping it.</span>
          </h2>
          <p className="font-ui text-white/40 text-sm sm:text-base max-w-md mx-auto">
            From Edison to San Jose, Houston to Chicago — every major garba hub, one platform.
          </p>
        </div>

        {/* ── Map container ── */}
        <div className="relative w-full" style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Outer glow ring */}
          <div className="absolute -inset-4 rounded-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(245,166,35,0.15) 0%, transparent 70%)" }} />

          {/* Map frame */}
          <div className="relative rounded-2xl overflow-hidden border border-white/5"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(1px)" }}>

            {/* SVG map */}
            <svg
              viewBox="0 0 960 600"
              className="w-full h-auto block"
              style={{ filter: "drop-shadow(0 0 40px rgba(0,0,0,0.6))" }}
            >
              <defs>
                {/* Grid lines */}
                <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                </pattern>
                {/* Glow filters per region */}
                {Object.entries(REGION_COLORS).map(([key, val]) => (
                  <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                ))}
                <filter id="pin-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Background grid */}
              <rect width="960" height="600" fill="url(#grid)" />

              {/* USA State paths — simplified outlines colored by region */}
              <USAStatePaths hoveredPin={hovered} />

              {/* Animated pins */}
              {pins.map((pin, i) => {
                const cx = pin.x * 9.6;
                const cy = pin.y * 6;
                const r = PIN_SIZES[pin.size] ?? 10;
                const regionColor = REGION_COLORS[pin.region]?.fill ?? "#888";
                const isHovered = hovered === pin.city;

                if (pin.state === "hidden") return null;

                return (
                  <g
                    key={pin.city}
                    style={{
                      cursor: "pointer",
                      transform: pin.state === "dropping" ? `translate(${cx}px, ${cy - 80}px)` : `translate(${cx}px, ${cy}px)`,
                      transition: pin.state === "dropping"
                        ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        : "transform 0.2s ease",
                    }}
                    onMouseEnter={() => setHovered(pin.city)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Pulse ring (behind pin) */}
                    {pin.state === "pulsing" && (
                      <>
                        <circle r={r * 2.5} fill="none" stroke={regionColor} strokeWidth="1.5" opacity="0.3">
                          <animate attributeName="r" values={`${r * 1.5};${r * 3.5};${r * 1.5}`} dur="2.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
                        </circle>
                        <circle r={r * 1.5} fill="none" stroke={regionColor} strokeWidth="1" opacity="0.2">
                          <animate attributeName="r" values={`${r * 1.2};${r * 2.2};${r * 1.2}`} dur="2.5s" begin="0.6s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}

                    {/* Pin body */}
                    <circle
                      r={isHovered ? r * 1.35 : r}
                      fill={regionColor}
                      stroke="white"
                      strokeWidth={isHovered ? 2 : 1.5}
                      filter="url(#pin-glow)"
                      style={{ transition: "r 0.15s ease, stroke-width 0.15s ease" }}
                      opacity={pin.state === "pulsing" ? 1 : 0.85}
                    />

                    {/* Inner dot */}
                    <circle r={r * 0.35} fill="white" opacity="0.9" />

                    {/* Tooltip */}
                    {isHovered && (
                      <g>
                        <rect
                          x={-55} y={-r - 44}
                          width={110} height={36}
                          rx={8}
                          fill="rgba(10,12,18,0.92)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth={1}
                        />
                        <text x={0} y={-r - 28} textAnchor="middle" fill="white"
                          style={{ fontSize: 9, fontFamily: "system-ui", fontWeight: 600 }}>
                          {pin.city}
                        </text>
                        <text x={0} y={-r - 16} textAnchor="middle"
                          style={{ fontSize: 8, fontFamily: "monospace", fill: regionColor, letterSpacing: "0.05em" }}>
                          {pin.events} EVENTS
                        </text>
                        {/* Tooltip caret */}
                        <polygon
                          points={`-5,${-r - 8} 5,${-r - 8} 0,${-r - 3}`}
                          fill="rgba(10,12,18,0.92)"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* ── Region legend ── */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-5">
          {regionCounts.map(r => (
            <div key={r.key} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/4">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color, boxShadow: `0 0 6px ${r.glow}` }} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">{r.label}</span>
              <span className="font-display font-bold text-white text-xs">{r.count}+</span>
              <span className="font-mono text-[9px] text-white/30">events</span>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-8 text-center">
          <p className="font-ui text-white/35 text-sm">
            Don&apos;t see your city yet?{" "}
            <a href="/auth/signup" className="text-marigold font-semibold hover:text-marigold-dark transition-colors">
              Join as a founding member
            </a>{" "}
            — we&apos;re expanding every week.
          </p>
        </div>
      </div>

      {/* Custom CSS for pin drop animation */}
      <style>{`
        @keyframes pin-bounce {
          0%   { transform: translateY(-80px); }
          60%  { transform: translateY(4px); }
          80%  { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

// ── USA state SVG paths (simplified outlines) ─────────────────────────────────
// Coordinates fit 960×600 viewBox — continental US + Alaska/Hawaii insets
function USAStatePaths({ hoveredPin }: { hoveredPin: string | null }) {
  const activeCities = new Set(
    PINS
      .filter(p => hoveredPin === null || p.city === hoveredPin)
      .map(p => p.region)
  );

  function getStateFill(stateCode: string) {
    const region = STATE_REGIONS[stateCode];
    if (!region) return "rgba(255,255,255,0.04)";
    const base = REGION_COLORS[region]?.fill ?? "#333";
    const isActive = activeCities.has(region);
    return isActive ? base + "55" : base + "28";
  }

  function getStateStroke(stateCode: string) {
    return "rgba(255,255,255,0.08)";
  }

  // Simplified state paths using approximate coordinates in 960×600 viewBox
  // These are clean geometric approximations suitable for a decorative map
  const states: { code: string; d: string }[] = [
    // Pacific Northwest
    { code: "WA", d: "M 60 40 L 180 40 L 185 120 L 65 125 Z" },
    { code: "OR", d: "M 60 125 L 185 120 L 188 210 L 58 215 Z" },
    // California
    { code: "CA", d: "M 30 215 L 188 210 L 200 280 L 185 370 L 155 430 L 125 480 L 55 455 L 40 380 L 30 290 Z" },
    // Mountain West
    { code: "NV", d: "M 188 210 L 245 205 L 255 310 L 225 380 L 185 370 L 200 280 Z" },
    { code: "ID", d: "M 185 120 L 270 118 L 275 200 L 245 205 L 188 210 Z" },
    { code: "MT", d: "M 185 40 L 360 38 L 358 130 L 270 118 L 185 120 Z" },
    { code: "WY", d: "M 270 118 L 370 115 L 372 210 L 275 200 Z" },
    { code: "UT", d: "M 245 205 L 330 202 L 332 300 L 255 310 Z" },
    { code: "CO", d: "M 330 202 L 430 200 L 432 290 L 332 300 Z" },
    { code: "AZ", d: "M 225 380 L 255 310 L 332 300 L 335 395 L 280 460 L 200 450 Z" },
    { code: "NM", d: "M 332 300 L 430 290 L 432 390 L 335 395 Z" },
    // Great Plains
    { code: "ND", d: "M 358 38 L 510 36 L 508 118 L 360 120 Z" },
    { code: "SD", d: "M 360 120 L 508 118 L 510 205 L 362 210 Z" },
    { code: "NE", d: "M 362 210 L 510 205 L 510 280 L 365 285 Z" },
    { code: "KS", d: "M 365 285 L 510 280 L 510 350 L 368 355 Z" },
    { code: "OK", d: "M 368 355 L 510 350 L 512 420 L 432 420 L 432 390 L 370 390 Z" },
    { code: "TX", d: "M 370 390 L 432 390 L 432 420 L 512 420 L 515 490 L 480 540 L 395 540 L 330 495 L 280 460 L 335 395 Z" },
    // Midwest
    { code: "MN", d: "M 508 36 L 600 35 L 602 120 L 510 118 Z" },
    { code: "IA", d: "M 510 205 L 605 202 L 608 280 L 510 280 Z" },
    { code: "MO", d: "M 510 280 L 608 280 L 610 360 L 512 355 Z" },
    { code: "WI", d: "M 600 35 L 645 38 L 648 140 L 602 120 Z" },
    { code: "IL", d: "M 605 202 L 650 198 L 652 320 L 610 310 L 608 280 Z" },
    { code: "AR", d: "M 512 355 L 610 360 L 612 420 L 515 420 Z" },
    { code: "LA", d: "M 515 420 L 612 420 L 610 480 L 545 495 L 515 490 Z" },
    { code: "MS", d: "M 612 420 L 655 415 L 655 480 L 610 480 Z" },
    { code: "AL", d: "M 655 415 L 698 410 L 700 490 L 665 500 L 655 480 Z" },
    { code: "TN", d: "M 650 350 L 750 345 L 752 395 L 655 400 Z" },
    { code: "KY", d: "M 650 320 L 755 315 L 755 350 L 650 355 Z" },
    { code: "IN", d: "M 652 200 L 700 198 L 702 320 L 655 320 Z" },
    { code: "MI", d: "M 645 38 L 705 40 L 710 150 L 650 155 L 648 100 Z" },
    { code: "OH", d: "M 700 198 L 752 195 L 755 315 L 702 320 Z" },
    // Southeast
    { code: "FL", d: "M 698 490 L 700 490 L 705 540 L 760 560 L 800 490 L 755 450 L 700 440 Z" },
    { code: "GA", d: "M 700 400 L 755 395 L 758 450 L 700 440 Z" },
    { code: "SC", d: "M 755 350 L 800 345 L 800 400 L 758 395 Z" },
    { code: "NC", d: "M 755 315 L 820 310 L 822 355 L 755 350 Z" },
    { code: "VA", d: "M 755 280 L 825 275 L 825 315 L 755 315 Z" },
    { code: "WV", d: "M 752 265 L 800 260 L 800 305 L 755 310 Z" },
    // Northeast
    { code: "PA", d: "M 755 240 L 825 238 L 827 278 L 755 282 Z" },
    { code: "NY", d: "M 760 180 L 850 175 L 855 240 L 760 242 Z" },
    { code: "VT", d: "M 848 158 L 870 155 L 872 195 L 850 198 Z" },
    { code: "NH", d: "M 870 150 L 890 148 L 892 192 L 872 194 Z" },
    { code: "ME", d: "M 872 100 L 925 98 L 928 188 L 875 192 Z" },
    { code: "MA", d: "M 855 195 L 920 192 L 920 215 L 855 218 Z" },
    { code: "RI", d: "M 900 215 L 920 215 L 918 232 L 900 230 Z" },
    { code: "CT", d: "M 860 218 L 900 218 L 900 238 L 860 240 Z" },
    { code: "NJ", d: "M 840 238 L 858 238 L 858 270 L 840 270 Z" },
    { code: "DE", d: "M 820 268 L 840 265 L 840 290 L 820 288 Z" },
    { code: "MD", d: "M 790 265 L 825 262 L 825 285 L 790 288 Z" },
  ];

  return (
    <g>
      {states.map(({ code, d }) => (
        <path
          key={code}
          d={d}
          fill={getStateFill(code)}
          stroke={getStateStroke(code)}
          strokeWidth={0.8}
          style={{ transition: "fill 0.4s ease" }}
        />
      ))}
    </g>
  );
}
