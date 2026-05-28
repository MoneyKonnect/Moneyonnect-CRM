"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Edit2,
  Globe,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { residencySchema, type ResidencyInput } from "@/lib/validations/client";
import { saveResidency } from "@/actions/residency";
import { cn } from "@/lib/utils";

const RESIDENCY_TYPES = [
  { value: "RESIDENT_INDIAN", label: "Resident Indian", flag: "🇮🇳" },
  { value: "NRI", label: "Non-Resident Indian (NRI)", flag: "🌏" },
  { value: "OCI", label: "Overseas Citizen of India (OCI)", flag: "🌏" },
  { value: "PIO", label: "Person of Indian Origin (PIO)", flag: "🌏" },
  { value: "FOREIGN_NATIONAL", label: "Foreign National", flag: "🌍" },
  { value: "RETURNING_NRI", label: "Returning NRI", flag: "🔄" },
];

const VISA_TYPES = [
  "H1B", "L1", "GREEN_CARD", "CITIZEN", "WORK_PERMIT", "STUDENT", "OTHER"
];

const ACCOUNT_TYPES = [
  { value: "NRO", label: "NRO Account" },
  { value: "NRE", label: "NRE Account" },
  { value: "FCNR", label: "FCNR Account" },
  { value: "BOTH", label: "NRO + NRE" },
  { value: "ALL_THREE", label: "NRO + NRE + FCNR" },
];

interface ResidencyTabProps {
  client: any;
}

export function ResidencyTab({ client }: ResidencyTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!client.residency);
  const residency = client.residency;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<ResidencyInput>({
    resolver: zodResolver(residencySchema),
    defaultValues: {
      residencyType: residency?.residencyType || "RESIDENT_INDIAN",
      countryOfResidence: residency?.countryOfResidence || "",
      citizenship: residency?.citizenship || "",
      visaType: residency?.visaType || undefined,
      taxResidency: residency?.taxResidency || "",
      timezone: residency?.timezone || "",
      accountType: residency?.accountType || undefined,
      fatcaCompliant: residency?.fatcaCompliant || false,
      foreignAddress: residency?.foreignAddress || "",
      indianAddress: residency?.indianAddress || "",
      passportNumber: residency?.passportNumber || "",
      passportExpiry: residency?.passportExpiry
        ? new Date(residency.passportExpiry).toISOString().split("T")[0]
        : "",
    },
  });

  const residencyType = watch("residencyType");
  const isNRI = residencyType !== "RESIDENT_INDIAN";

  const onSubmit = async (data: ResidencyInput) => {
    const result = await saveResidency(client.id, data);
    if (result.success) {
      toast.success("Residency details saved");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Failed to save");
    }
  };

  if (!editing && residency) {
    const typeConfig = RESIDENCY_TYPES.find(t => t.value === residency.residencyType);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Residency & Tax Status</h2>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {/* Residency type badge */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
            <div className="text-3xl">{typeConfig?.flag}</div>
            <div>
              <p className="font-semibold text-foreground">{typeConfig?.label}</p>
              {residency.countryOfResidence && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Currently in {residency.countryOfResidence}
                </p>
              )}
            </div>
            {residency.fatcaCompliant && (
              <span className="ml-auto text-2xs bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-medium">
                FATCA Compliant
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {[
              { label: "Citizenship", value: residency.citizenship },
              { label: "Visa Type", value: residency.visaType },
              { label: "Tax Residency", value: residency.taxResidency },
              { label: "Timezone", value: residency.timezone },
              { label: "Account Type", value: residency.accountType },
              { label: "Passport No.", value: residency.passportNumber },
            ].filter(item => item.value).map((item) => (
              <div key={item.label}>
                <p className="text-2xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {residency.foreignAddress && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-2xs text-muted-foreground mb-1">Foreign Address</p>
              <p className="text-sm text-foreground">{residency.foreignAddress}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Residency & Tax Status</h2>
        </div>
        {residency && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-border bg-card p-5 space-y-6">
        {/* Residency type */}
        <div className="space-y-1.5">
          <Label>Residency Type *</Label>
          <Select
            defaultValue={residency?.residencyType || "RESIDENT_INDIAN"}
            onValueChange={(v) => setValue("residencyType", v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESIDENCY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.flag} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* NRI-specific fields */}
        {isNRI && (
          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              NRI / Overseas Details
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country of Residence</Label>
                <Input placeholder="United States" {...register("countryOfResidence")} />
              </div>

              <div className="space-y-1.5">
                <Label>Citizenship</Label>
                <Input placeholder="Indian / US Citizen" {...register("citizenship")} />
              </div>

              <div className="space-y-1.5">
                <Label>Visa Type</Label>
                <Select onValueChange={(v) => setValue("visaType", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visa type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISA_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tax Residency</Label>
                <Input placeholder="US / UK / UAE" {...register("taxResidency")} />
              </div>

              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input placeholder="EST / IST / GST" {...register("timezone")} />
              </div>

              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select onValueChange={(v) => setValue("accountType", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Passport Number</Label>
                <Input placeholder="A1234567" {...register("passportNumber")} />
              </div>

              <div className="space-y-1.5">
                <Label>Passport Expiry</Label>
                <Input type="date" {...register("passportExpiry")} />
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-sm font-medium">FATCA Compliant</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Foreign Account Tax Compliance Act
                  </p>
                </div>
                <Switch
                  defaultChecked={residency?.fatcaCompliant || false}
                  onCheckedChange={(v) => setValue("fatcaCompliant", v)}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Foreign Address</Label>
                <Input placeholder="123 Main St, New York, NY 10001, USA" {...register("foreignAddress")} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Indian Address</Label>
                <Input placeholder="123, MG Road, Mumbai 400001" {...register("indianAddress")} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {residency && (
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Residency Details
          </Button>
        </div>
      </form>
    </div>
  );
}
