import Link from "next/link";
import { type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "heritage";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-marigold text-aubergine font-semibold hover:bg-marigold-dark transition-colors shadow-sm",
  secondary:
    "border border-aubergine/30 text-ink font-semibold hover:border-aubergine/60 bg-transparent transition-colors",
  ghost:
    "border border-white/25 text-white font-semibold hover:bg-white/10 bg-transparent transition-colors",
  heritage:
    "bg-durga text-white font-semibold hover:bg-durga/90 transition-colors shadow-sm",
};

const sizeStyles = {
  sm: "px-4 py-2 text-xs rounded-[10px]",
  md: "px-6 py-3 text-sm rounded-[10px]",
  lg: "px-8 py-4 text-sm rounded-[10px]",
};

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
}: ButtonProps) {
  const classes = `inline-flex items-center gap-2 font-ui ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
