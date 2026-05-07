import { type ReactNode } from "react";

type BadgeVariant = "marigold" | "aubergine" | "peacock" | "durga" | "ivory" | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  marigold: "bg-marigold text-aubergine",
  aubergine: "bg-aubergine text-white",
  peacock: "bg-peacock text-white",
  durga: "bg-durga text-white",
  ivory: "bg-ivory-200 text-ink",
  outline: "border border-ink/20 text-ink-muted bg-transparent",
};

const dotColors: Record<BadgeVariant, string> = {
  marigold: "bg-aubergine",
  aubergine: "bg-marigold",
  peacock: "bg-white",
  durga: "bg-white",
  ivory: "bg-ink-muted",
  outline: "bg-ink-muted",
};

export function Badge({ children, variant = "ivory", dot, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-medium tracking-[0.08em] uppercase ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
