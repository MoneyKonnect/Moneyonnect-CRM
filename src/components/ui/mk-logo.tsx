"use client";

import { cn } from "@/lib/utils";

interface MKLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function MKLogo({ size = 32, animated = false, className }: MKLogoProps) {
  // The MK logo: 3x3 grid of large dots connected by thick flowing bezier curves
  // Studying the actual logo: dots are large circles, connections are thick rounded tubes
  // The S-curve goes: top-left connects right, top-right connects down-left (crossing)
  // middle-left connects right, middle-right connects down-left (crossing again)
  // bottom-left connects right, bottom-right standalone

  const s = size;
  const teal = "#3fd1b8";

  // Using a fixed viewBox of 100x100 for precision
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/*
        Logo analysis from image:
        - 3x3 grid, dots at roughly: col 20, 50, 80 / row 20, 50, 80
        - Large dots radius ~13
        - Thick connectors between dots — same color, stroke-width ~13, rounded caps
        - Connection pattern:
          Row 1: dot[0,0] → dot[0,1] (horizontal), dot[0,1] → dot[0,2] (horizontal)
          Row 2: dot[1,0] → dot[1,1] (horizontal), dot[1,1] → dot[1,2] (horizontal)
          Row 3: dot[2,0] → dot[2,1] (horizontal), dot[2,1] → dot[2,2] (horizontal)
          The S-curves cross BETWEEN rows:
          dot[0,1] curves down to dot[1,0] area
          dot[0,2] curves down to dot[1,1] area
          etc — creating the crossing wave pattern
      */}

      {/* Top row horizontal connections */}
      <line x1="20" y1="20" x2="50" y2="20" stroke={teal} strokeWidth="13" strokeLinecap="round"/>
      <line x1="50" y1="20" x2="80" y2="20" stroke={teal} strokeWidth="13" strokeLinecap="round"/>

      {/* Middle row horizontal connections */}
      <line x1="20" y1="50" x2="50" y2="50" stroke={teal} strokeWidth="13" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="80" y2="50" stroke={teal} strokeWidth="13" strokeLinecap="round"/>

      {/* Bottom row horizontal connections */}
      <line x1="20" y1="80" x2="50" y2="80" stroke={teal} strokeWidth="13" strokeLinecap="round"/>
      <line x1="50" y1="80" x2="80" y2="80" stroke={teal} strokeWidth="13" strokeLinecap="round"/>

      {/* S-curve crossing connections — the signature MK pattern */}
      {/* Top-right area curves down-left to middle row */}
      <path
        d="M 50 20 C 50 35, 20 35, 20 50"
        stroke={teal} strokeWidth="13" strokeLinecap="round" fill="none"
      />
      <path
        d="M 80 20 C 80 35, 50 35, 50 50"
        stroke={teal} strokeWidth="13" strokeLinecap="round" fill="none"
      />

      {/* Middle row curves down-left to bottom row */}
      <path
        d="M 50 50 C 50 65, 20 65, 20 80"
        stroke={teal} strokeWidth="13" strokeLinecap="round" fill="none"
      />
      <path
        d="M 80 50 C 80 65, 50 65, 50 80"
        stroke={teal} strokeWidth="13" strokeLinecap="round" fill="none"
      />

      {/* 9 dots — drawn LAST so they appear on top */}
      <circle cx="20" cy="20" r="13" fill={teal}/>
      <circle cx="50" cy="20" r="13" fill={teal}/>
      <circle cx="80" cy="20" r="13" fill={teal}/>
      <circle cx="20" cy="50" r="13" fill={teal}/>
      <circle cx="50" cy="50" r="13" fill={teal}/>
      <circle cx="80" cy="50" r="13" fill={teal}/>
      <circle cx="20" cy="80" r="13" fill={teal}/>
      <circle cx="50" cy="80" r="13" fill={teal}/>
      <circle cx="80" cy="80" r="13" fill={teal}/>
    </svg>
  );
}

export function MKLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#231f20" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div style={{ animation: "pulse 2s ease-in-out infinite" }}>
          <MKLogo size={80} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#3fd1b8" }}>
            MoneyKonnect CRM
          </p>
          <p className="text-xs tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            by Tayal Capital
          </p>
        </div>
        <div className="w-32 h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(63,209,184,0.15)" }}>
          <div style={{
            height: "100%",
            borderRadius: "9999px",
            backgroundColor: "#3fd1b8",
            animation: "loading-bar 1.5s ease-in-out infinite",
          }}/>
        </div>
      </div>
      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}
