"use client";

import { useState } from "react";
import {
  TrendingUp,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFormModal } from "@/components/leads/lead-form-modal";

interface LeadsHeaderProps {
  total: number;
}

export function LeadsHeader({ total }: LeadsHeaderProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {total} leads across all stages
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5 shadow-glow-sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Lead
        </Button>
      </div>

      <LeadFormModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
