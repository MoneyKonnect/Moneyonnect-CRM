import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: "w-7 h-7", text: "text-base", dot: "w-1.5 h-1.5" },
    md: { icon: "w-8 h-8", text: "text-lg", dot: "w-2 h-2" },
    lg: { icon: "w-10 h-10", text: "text-xl", dot: "w-2.5 h-2.5" },
  };

  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon */}
      <div
        className={cn(
          s.icon,
          "rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow-sm flex-shrink-0"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-[60%] h-[60%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z"
            fill="white"
            fillOpacity="0.9"
          />
          <path
            d="M12 6v2M12 16v2M6 12H4M20 12h-2M7.76 7.76l-1.42-1.42M17.66 17.66l-1.42-1.42M7.76 16.24l-1.42 1.42M17.66 6.34l-1.42 1.42"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline gap-0.5">
          <span
            className={cn(
              s.text,
              "font-semibold tracking-tight",
              className?.includes("text-white") ? "text-white" : "text-foreground"
            )}
          >
            Relation
          </span>
          <span
            className={cn(
              s.text,
              "font-semibold tracking-tight text-brand-400"
            )}
          >
            IQ
          </span>
        </div>
      )}
    </div>
  );
}
