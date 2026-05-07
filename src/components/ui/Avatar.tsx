interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  color?: "marigold" | "aubergine" | "peacock" | "durga";
}

const colorStyles = {
  marigold: "bg-marigold text-aubergine",
  aubergine: "bg-aubergine text-white",
  peacock: "bg-peacock text-white",
  durga: "bg-durga text-white",
};

const sizeStyles = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
};

export function Avatar({ initials, size = "md", color = "aubergine" }: AvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-ui font-bold shrink-0 ${colorStyles[color]} ${sizeStyles[size]}`}
    >
      {initials}
    </div>
  );
}
