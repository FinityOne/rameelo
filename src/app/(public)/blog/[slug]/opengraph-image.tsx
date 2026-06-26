import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/blog";

// Branded, per-article social share card (Open Graph + Twitter fallback).
// Generated at build time per slug so every shared link has a unique, on-brand
// preview with the headline, category and a dek that entices the click.
export const alt = "Rameelo — Garba & Navratri, covered.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Resolve a Tailwind gradient string (e.g. "from-[#7C1F2C] via-[#a23a2b] to-marigold")
// into concrete hex stops so the card mirrors the article's cover.
const NAMED: Record<string, string> = {
  marigold: "#F5A623",
  "marigold-dark": "#D4891B",
  aubergine: "#2E1B30",
  peacock: "#0E8C7A",
  durga: "#7C1F2C",
  ivory: "#FCF9F2",
};

function gradientStops(cover: string): string[] {
  const stops: string[] = [];
  const re = /(?:from|via|to)-(\[#[0-9a-fA-F]{3,8}\]|[a-z][a-z-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cover)) !== null) {
    const raw = m[1];
    if (raw.startsWith("[#")) stops.push(raw.slice(1, -1));
    else if (NAMED[raw]) stops.push(NAMED[raw]);
  }
  return stops.length ? stops : ["#7C1F2C", "#B84A22", "#F5A623"];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);

  const title = article?.title ?? "Garba & Navratri, covered.";
  const category = article?.category ?? "Rameelo Review";
  const emoji = article?.coverEmoji ?? "🪔";
  const dek = (article?.excerpt ?? "America's authoritative source for raas garba culture, city guides, artists & events.").slice(0, 140);
  const author = article?.author ?? "The Rameelo Review";
  const readMin = article?.readMinutes;

  const stops = gradientStops(article?.coverGradient ?? "");
  const gradient =
    stops.length >= 3
      ? `linear-gradient(135deg, ${stops[0]} 0%, ${stops[1]} 48%, ${stops[2]} 100%)`
      : `linear-gradient(135deg, ${stops[0]} 0%, ${stops[stops.length - 1]} 100%)`;

  const titleSize = title.length > 62 ? 58 : title.length > 40 ? 70 : 82;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: gradient,
          fontFamily: "Geist",
        }}
      >
        {/* Dark scrim so text stays readable on bright gradients */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background: "linear-gradient(165deg, rgba(18,7,20,0.32) 0%, rgba(18,7,20,0.86) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "64px 72px",
            color: "#FFFFFF",
          }}
        >
          {/* Header: wordmark + category */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: 9, background: "#F5A623", marginRight: 14, display: "flex" }} />
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.32em", color: "#FFFFFF" }}>RAMEELO</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFE9C2" }}>
                {category}
              </span>
            </div>
          </div>

          {/* Main: emoji + headline + dek */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, display: "flex", marginBottom: 18 }}>{emoji}</div>
            <div
              style={{
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                display: "flex",
                maxWidth: 1000,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 30,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.82)",
                display: "flex",
                maxWidth: 940,
                marginTop: 22,
              }}
            >
              {dek}
            </div>
          </div>

          {/* Footer: accent + byline */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 54, height: 5, borderRadius: 4, background: "#F5A623", marginRight: 20, display: "flex" }} />
            <span style={{ fontSize: 24, fontWeight: 600, color: "#FFFFFF" }}>{author}</span>
            {readMin ? (
              <span style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", marginLeft: 14 }}>· {readMin} min read</span>
            ) : null}
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", marginLeft: "auto" }}>rameelo.com</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
