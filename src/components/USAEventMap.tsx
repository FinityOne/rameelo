"use client";

import { useEffect, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const GEO_URL = "/states.json";

// City pins — the community's garba hubs
// Coordinates are [longitude, latitude]
const PINS = [
  { city: "Edison, NJ",     coords: [-74.41, 40.52] as [number,number], size: "lg", events: 0 },
  { city: "Houston, TX",    coords: [-95.37, 29.76] as [number,number], size: "lg", events: 0 },
  { city: "Chicago, IL",    coords: [-87.63, 41.88] as [number,number], size: "lg", events: 0 },
  { city: "Atlanta, GA",    coords: [-84.39, 33.75] as [number,number], size: "md", events: 0 },
  { city: "San Jose, CA",   coords: [-121.89, 37.34] as [number,number], size: "lg", events: 1 },
  { city: "Dallas, TX",     coords: [-96.80, 32.78] as [number,number], size: "md", events: 0 },
  { city: "Boston, MA",     coords: [-71.06, 42.36] as [number,number], size: "md", events: 0 },
  { city: "Seattle, WA",    coords: [-122.33, 47.61] as [number,number], size: "md", events: 0 },
  { city: "Denver, CO",     coords: [-104.99, 39.74] as [number,number], size: "sm", events: 0 },
  { city: "Phoenix, AZ",    coords: [-112.07, 33.45] as [number,number], size: "sm", events: 0 },
  { city: "Detroit, MI",    coords: [-83.05, 42.33] as [number,number], size: "sm", events: 0 },
  { city: "Philadelphia",   coords: [-75.17, 39.95] as [number,number], size: "sm", events: 0 },
  { city: "Los Angeles",    coords: [-118.24, 34.05] as [number,number], size: "md", events: 0 },
  { city: "Minneapolis",    coords: [-93.27, 44.98] as [number,number], size: "sm", events: 0 },
];

const PIN_R: Record<string, number> = { lg: 8, md: 6, sm: 4 };

export default function USAEventMap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [dropped, setDropped] = useState<boolean[]>(PINS.map(() => false));
  const [hovered, setHovered] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  // Total published events — 1 right now
  const totalEvents = 1;

  useEffect(() => {
    if (started) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.2 && !started) {
          setStarted(true);
          PINS.forEach((_, i) => {
            setTimeout(() => {
              setDropped(prev => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, 80 + i * 110);
          });
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [started]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #150a18 0%, #0c1624 60%, #080f1c 100%)" }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/3 w-[500px] h-[300px] rounded-full opacity-12"
          style={{ background: "radial-gradient(ellipse, #2E1B30 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #F5A623 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-marigold mb-3">Live across the USA</p>
          <h2
            className="font-display font-bold text-white mb-3"
            style={{ fontSize: "clamp(26px, 4vw, 46px)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Garba is everywhere.{" "}
            <span className="text-marigold">We&apos;re mapping it.</span>
          </h2>
          <p className="font-ui text-white/40 text-sm sm:text-base max-w-md mx-auto">
            From Edison to San Jose, Houston to Chicago — every major garba hub, one platform.
          </p>
        </div>

        {/* Map */}
        <div className="relative w-full" style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Subtle glow under map */}
          <div className="absolute -inset-2 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(245,166,35,0.06) 0%, transparent 70%)" }} />

          <div className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>

            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 1000 }}
              width={800}
              height={500}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              {/* State fills */}
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: "rgba(245,166,35,0.08)",
                          stroke: "rgba(245,166,35,0.18)",
                          strokeWidth: 0.6,
                          outline: "none",
                        },
                        hover: {
                          fill: "rgba(245,166,35,0.14)",
                          stroke: "rgba(245,166,35,0.28)",
                          strokeWidth: 0.8,
                          outline: "none",
                        },
                        pressed: {
                          fill: "rgba(245,166,35,0.14)",
                          stroke: "rgba(245,166,35,0.28)",
                          strokeWidth: 0.8,
                          outline: "none",
                        },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* City pins */}
              {PINS.map((pin, i) => {
                const r = PIN_R[pin.size] ?? 5;
                const isHovered = hovered === i;
                const show = dropped[i];
                const isActive = pin.events > 0;

                return (
                  <Marker
                    key={pin.city}
                    coordinates={pin.coords}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <g style={{ cursor: "pointer" }}>
                      {/* Drop animation: translate from -40px above when not dropped */}
                      <g style={{
                        transform: show ? "translateY(0)" : "translateY(-40px)",
                        opacity: show ? 1 : 0,
                        transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
                      }}>

                        {/* Pulse ring — only for cities with events */}
                        {isActive && show && (
                          <>
                            <circle r={r * 2.8} fill="none" stroke="#F5A623" strokeWidth="1.2" opacity="0">
                              <animate attributeName="r" values={`${r * 1.5};${r * 3.5}`} dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle r={r * 2} fill="none" stroke="#F5A623" strokeWidth="0.8" opacity="0">
                              <animate attributeName="r" values={`${r * 1.2};${r * 2.6}`} dur="2s" begin="0.5s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.4;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                            </circle>
                          </>
                        )}

                        {/* Pin body */}
                        <circle
                          r={isHovered ? r * 1.5 : r}
                          fill={isActive ? "#F5A623" : "rgba(245,166,35,0.55)"}
                          stroke={isActive ? "white" : "rgba(255,255,255,0.4)"}
                          strokeWidth={isHovered ? 1.5 : 1}
                          style={{ transition: "r 0.15s ease" }}
                        />
                        {/* Inner dot */}
                        <circle r={r * 0.4} fill="white" opacity={isActive ? 1 : 0.6} />

                        {/* Tooltip */}
                        {isHovered && (
                          <g>
                            <rect
                              x={-54} y={-(r + 42)}
                              width={108} height={34}
                              rx={7}
                              fill="rgba(8,10,18,0.94)"
                              stroke="rgba(245,166,35,0.25)"
                              strokeWidth={0.8}
                            />
                            <text
                              x={0} y={-(r + 28)}
                              textAnchor="middle"
                              fill="white"
                              style={{ fontSize: 9, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}
                            >
                              {pin.city}
                            </text>
                            <text
                              x={0} y={-(r + 16)}
                              textAnchor="middle"
                              fill={isActive ? "#F5A623" : "rgba(255,255,255,0.4)"}
                              style={{ fontSize: 7.5, fontFamily: "monospace", letterSpacing: "0.08em" }}
                            >
                              {isActive ? `${pin.events} EVENT${pin.events !== 1 ? "S" : ""}` : "COMING SOON"}
                            </text>
                            {/* Caret */}
                            <polygon
                              points={`-5,${-(r + 8)} 5,${-(r + 8)} 0,${-(r + 2)}`}
                              fill="rgba(8,10,18,0.94)"
                            />
                          </g>
                        )}
                      </g>
                    </g>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            { label: "Live events", value: totalEvents.toString() },
            { label: "Cities covered", value: "14" },
            { label: "States represented", value: "12" },
            { label: "More dropping", value: "2026" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="font-display font-bold text-marigold text-2xl sm:text-3xl" style={{ letterSpacing: "-0.025em" }}>
                {stat.value}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="font-ui text-white/30 text-sm">
            Don&apos;t see your city?{" "}
            <a href="/auth/signup" className="text-marigold font-semibold hover:text-marigold-dark transition-colors">
              Join as a founding member
            </a>{" "}
            — we&apos;re adding cities weekly.
          </p>
        </div>
      </div>
    </section>
  );
}
