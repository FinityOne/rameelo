import { type ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  color?: "marigold" | "peacock" | "ink-muted";
  className?: string;
}

export function Eyebrow({ children, color = "marigold", className = "" }: EyebrowProps) {
  const colorClass =
    color === "marigold"
      ? "text-marigold"
      : color === "peacock"
      ? "text-peacock"
      : "text-ink-muted";

  return (
    <p
      className={`font-mono text-[11px] font-medium tracking-[0.12em] uppercase ${colorClass} ${className}`}
    >
      {children}
    </p>
  );
}
