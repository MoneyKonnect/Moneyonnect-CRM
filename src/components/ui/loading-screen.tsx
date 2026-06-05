"use client";

import Image from "next/image";

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: "#231f20" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Logo with pulse animation */}
        <div style={{ animation: "logoEntrance 0.6s ease-out forwards, logoPulse 2.5s ease-in-out 0.6s infinite" }}>
          <Image
            src="/mk-logo.jpeg"
            alt="MoneyKonnect"
            width={72}
            height={72}
            className="rounded-xl"
            priority
          />
        </div>

        {/* Text */}
        <div
          className="flex flex-col items-center gap-1"
          style={{ animation: "fadeInUp 0.4s ease-out 0.3s both" }}
        >
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#3fd1b8" }}
          >
            MoneyKonnect CRM
          </p>
          <p className="text-xs tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            by Tayal Capital
          </p>
        </div>

        {/* Dots */}
        <div
          className="flex items-center gap-1.5"
          style={{ animation: "fadeInUp 0.4s ease-out 0.5s both" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: "#3fd1b8",
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes logoEntrance {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes logoPulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(0.97); opacity: 0.85; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
