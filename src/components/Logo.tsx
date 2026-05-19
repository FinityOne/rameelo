import Image from "next/image";
import Link from "next/link";

type LogoVariant = "red" | "white" | "icon";

interface LogoProps {
  variant?: LogoVariant;
  /** Height in px — width is auto-scaled */
  height?: number;
  href?: string;
  className?: string;
}

/**
 * variant="red"   → rameelo-horizontal-red-transparent  (use on light/ivory backgrounds)
 * variant="white" → rameelo-horizontal-white-transparent (use on dark/aubergine backgrounds)
 * variant="icon"  → rameelo-icon-goldred                (favicon / square stamp)
 */
export default function Logo({ variant = "red", height = 28, href = "/", className = "" }: LogoProps) {
  const srcs: Record<LogoVariant, string> = {
    red:   "/logo/rameelo-horizontal-red-transparent.png",
    white: "/logo/rameelo-horizontal-white-transparent.png",
    icon:  "/logo/rameelo-icon-goldred.png",
  };

  const isSquare = variant === "icon";

  const img = (
    <img
      src={srcs[variant]}
      alt="Rameelo"
      style={{ height, width: "auto", display: "block" }}
      className={className}
    />
  );

  if (!href) return img;

  return (
    <Link href={href} className="inline-flex items-center shrink-0" style={{ height }}>
      {img}
    </Link>
  );
}
