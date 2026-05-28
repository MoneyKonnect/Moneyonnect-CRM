"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Dashboard error:", error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-5">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed text-sm">
        An unexpected error occurred. This has been logged and we'll look into it.
      </p>
      <Button onClick={reset} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
