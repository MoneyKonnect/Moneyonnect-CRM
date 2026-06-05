"use client";

import { cn } from "@/lib/utils";

interface MKLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function MKLogo({ size = 32, animated = true, className }: MKLogoProps) {
  const s = size;
  const pad = s * 0.1;
  const inner = s - pad * 2;
  const cell = inner / 2;

  // 9 dot positions (3x3 grid)
  const dots = [
    { x: pad + 0,        y: pad + 0,        delay: 0 },
    { x: pad + cell / 2, y: pad + 0,        delay: 100 },
    { x: pad + cell,     y: pad + 0,        delay: 200 },
    { x: pad + 0,        y: pad + cell / 2, delay: 300 },
    { x: pad + cell / 2, y: pad + cell / 2, delay: 400 },
    { x: pad + cell,     y: pad + cell / 2, delay: 500 },
    { x: pad + 0,        y: pad + cell,     delay: 600 },
    { x: pad + cell / 2, y: pad + cell,     delay: 700 },
    { x: pad + cell,     y: pad + cell,     delay: 800 },
  ];

  const r = s * 0.055;

  // Connection paths (the flowing S-curve connections)
  const connections = [
    // Top row connections
    `M ${dots[0].x} ${dots[0].y} Q ${dots[1].x} ${dots[0].y - r * 2} ${dots[2].x} ${dots[2].y}`,
    // Middle row connections
    `M ${dots[3].x} ${dots[3].y} Q ${dots[4].x} ${dots[3].y + r * 2} ${dots[5].x} ${dots[5].y}`,
    // Bottom row
    `M ${dots[6].x} ${dots[6].y} Q ${dots[7].x} ${dots[6].y - r * 2} ${dots[8].x} ${dots[8].y}`,
    // Vertical connections
    `M ${dots[0].x} ${dots[0].y} Q ${dots[0].x + r * 2} ${dots[3].y} ${dots[6].x} ${dots[6].y}`,
    `M ${dots[2].x} ${dots[2].y} Q ${dots[2].x - r * 2} ${dots[5].y} ${dots[8].x} ${dots[8].y}`,
    // Diagonal S-curves (the signature MK pattern)
    `M ${dots[0].x} ${dots[2].y} C ${dots[1].x} ${dots[2].y} ${dots[1].x} ${dots[6].y} ${dots[2].x} ${dots[6].y}`,
    `M ${dots[6].x} ${dots[0].y} C ${dots[7].x} ${dots[0].y} ${dots[7].x} ${dots[8].y} ${dots[8].x} ${dots[8].y}`,
  ];

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Connection lines */}
      {connections.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="#3fd1b8"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
          opacity="0.35"
          fill="none"
          style={animated ? {
            strokeDasharray: 100,
            strokeDashoffset: 100,
            animation: `mk-line 1.5s ease-out forwards`,
            animationDelay: `${i * 80}ms`,
          } : undefined}
        />
      ))}

      {/* Dots */}
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={r}
          fill="#3fd1b8"
          style={animated ? {
            animation: `mk-dot 1.5s ease-in-out infinite`,
            animationDelay: `${dot.delay}ms`,
          } : undefined}
        />
      ))}
    </svg>
  );
}

// Full loading screen version
export function MKLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#231f20" }}
    >
      <div className="flex flex-col items-center gap-6">
        <MKLogo size={80} animated={true} />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#3fd1b8" }}>
            RelationIQ
          </p>
          <p className="text-xs text-white/30 tracking-wider">by MoneyKonnect</p>
        </div>
        {/* Loading bar */}
        <div className="w-32 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(63,209,184,0.15)" }}>
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: "#3fd1b8",
              animation: "loading-bar 1.5s ease-in-out infinite",
              width: "40%",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(350%); width: 40%; }
        }
        @keyframes mk-dot {
          0%, 100% { opacity: 0.3; r: ${80 * 0.055 * 0.8}px; }
          50% { opacity: 1; r: ${80 * 0.055 * 1.2}px; }
        }
        @keyframes mk-line {
          from { stroke-dashoffset: 100; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
