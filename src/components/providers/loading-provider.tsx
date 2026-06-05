"use client";

import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setLoading(false), 400);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && (
        <div
          style={{
            opacity: fadeOut ? 0 : 1,
            transition: "opacity 0.4s ease-out",
            pointerEvents: fadeOut ? "none" : "all",
          }}
        >
          <LoadingScreen />
        </div>
      )}
      <div
        style={{
          opacity: loading && !fadeOut ? 0 : 1,
          transition: "opacity 0.3s ease-in",
        }}
      >
        {children}
      </div>
    </>
  );
}
