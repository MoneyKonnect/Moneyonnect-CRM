"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leadSchema, type LeadInput } from "@/lib/validations/lead";
import { createLead, updateLead } from "@/actions/leads";
import { cn } from "@/lib/utils";

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  lead?: any;
  defaultStage?: string;
}

const SOURCES = [
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "WEBSITE", label: "Website" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EVENT", label: "Event" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "EXISTING_CLIENT", label: "Existing Client" },
  { value: "OTHER", label: "Other" },
];

const INTERESTS = [
  "Complimentary Portfolio Health Review",
  "NRI Wealth & Investment Planning",
  "International / Global Investing",
  "Tax Saving & Capital Gains Planning",
  "Retirement & Passive Income Planning",
  "Estate Planning / Trust / Will Structuring",
  "Real Estate Portfolio Evaluation",
  "PMS / AIF Investment Consultation",
  "Need a Second Opinion on Existing Investments",
  "Goal-Based Wealth Planning",
  "Other",
];

const RESIDENCY_OPTIONS = [
  { value: "RESIDENT", label: "🇮🇳 Resident Indian" },
  { value: "NRI",      label: "🌍 NRI / OCI"        },
];

const STAGES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "MEETING_SCHEDULED", label: "Meeting Scheduled" },
  { value: "INTERESTED", label: "Interested" },
  { value: "DOCUMENTATION_PENDING", label: "Documentation Pending" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "CONVERTED", label: "Converted" },
  { value: "DORMANT", label: "Dormant" },
  { value: "LOST", label: "Lost" },
];

export function LeadFormModal({
  open,
  onClose,
  lead,
  defaultStage = "NEW",
}: LeadFormModalProps) {
  const router = useRouter();
  const isEditing = !!lead;

  const [selectedInterest, setSelectedInterest] = useState(lead?.interest || "");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      source: "OTHER",
      stage: defaultStage as any,
    },
  });

  useEffect(() => {
    if (lead) {
      setSelectedInterest(lead.interest || "");
      reset({
        fullName: lead.fullName,
        phone: lead.phone || "",
        email: lead.email || "",
        source: lead.source,
        stage: lead.stage,
        estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
        notes: lead.notes || "",
        nextFollowUpAt: lead.nextFollowUpAt
          ? new Date(lead.nextFollowUpAt).toISOString().split("T")[0]
          : "",
        interest: lead.interest || "",
        otherInterest: lead.otherInterest || "",
        residencyType: lead.residencyType || "RESIDENT",
      });
    } else {
      reset({ source: "OTHER", stage: defaultStage as any });
    }
  }, [lead, reset, defaultStage]);

  const onSubmit = async (data: LeadInput) => {
    const result = isEditing
      ? await updateLead(lead.id, data)
      : await createLead(data);

    if (result.success) {
      toast.success(isEditing ? "Lead updated" : "Lead created");
      onClose();
      router.refresh();
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>
              Full Name <span className="text-danger">*</span>
            </Label>
            <Input
              placeholder="Ramesh Patel"
              className={cn(errors.fullName && "border-danger")}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-danger">{errors.fullName.message}</p>
            )}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="ramesh@example.com"
                {...register("email")}
              />
            </div>
          </div>

          {/* Source & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                defaultValue={lead?.source || "OTHER"}
                onValueChange={(v) => setValue("source", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                defaultValue={lead?.stage || defaultStage}
                onValueChange={(v) => setValue("stage", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated value & follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Est. Value (₹)</Label>
              <Input
                type="number"
                placeholder="2500000"
                {...register("estimatedValue")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next Follow-up</Label>
              <Input type="date" {...register("nextFollowUpAt")} />
            </div>
          </div>

          {/* Interest */}
          <div className="space-y-1.5">
            <Label>Service Interest</Label>
            <Select
              defaultValue={lead?.interest || ""}
              onValueChange={(v) => { setSelectedInterest(v); setValue("interest", v as any); }}
            >
              <SelectTrigger><SelectValue placeholder="Select interest area" /></SelectTrigger>
              <SelectContent>
                {INTERESTS.map(i => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedInterest === "Other" && (
              <Input
                placeholder="Please describe your requirement…"
                {...register("otherInterest")}
                className="mt-2"
              />
            )}
          </div>

          {/* Residency */}
          <div className="space-y-1.5">
            <Label>Residency Type</Label>
            <Select
              defaultValue={lead?.residencyType || "RESIDENT"}
              onValueChange={(v) => setValue("residencyType", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESIDENCY_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Context about this lead, referral details, etc."
              className="resize-none text-sm min-h-[70px]"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {isEditing ? "Save Changes" : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
