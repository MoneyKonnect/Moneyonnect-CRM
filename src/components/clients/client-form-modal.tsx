"use client";

import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { createClient, updateClient } from "@/actions/clients";
import { cn } from "@/lib/utils";

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  client?: any;
}

export function ClientFormModal({ open, onClose, client }: ClientFormModalProps) {
  const router = useRouter();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      category: "STANDARD",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        fullName: client.fullName || "",
        phone: client.phone || "",
        email: client.email || "",
        pan: client.pan || "",
        occupation: client.occupation || "",
        incomeBracket: client.incomeBracket || "",
        riskAppetite: client.riskAppetite || undefined,
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        pincode: client.pincode || "",
        category: client.category || "STANDARD",
        status: client.status || "ACTIVE",
        aum: client.aum ? String(client.aum) : "",
      });
    } else {
      reset({ category: "STANDARD", status: "ACTIVE" });
    }
  }, [client, reset]);

  const onSubmit = async (data: ClientInput) => {
    try {
      const result = isEditing
        ? await updateClient(client.id, data)
        : await createClient(data);

      if (result.success) {
        toast.success(isEditing ? "Client updated" : "Client added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section: Basic Info */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="fullName">
                  Full Name <span className="text-danger">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Rajesh Kumar Sharma"
                  className={cn(errors.fullName && "border-danger")}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-danger">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rajesh@example.com"
                  className={cn(errors.email && "border-danger")}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-danger">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" {...register("dob")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  placeholder="ABCDE1234F"
                  className={cn(
                    "uppercase",
                    errors.pan && "border-danger"
                  )}
                  {...register("pan")}
                />
                {errors.pan && (
                  <p className="text-xs text-danger">{errors.pan.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Professional */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Professional Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="Software Engineer"
                  {...register("occupation")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="incomeBracket">Income Bracket</Label>
                <Select
                  onValueChange={(v) => setValue("incomeBracket", v)}
                  defaultValue={client?.incomeBracket || ""}
                >
                  <SelectTrigger id="incomeBracket">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "< ₹5L",
                      "₹5L – ₹10L",
                      "₹10L – ₹25L",
                      "₹25L – ₹50L",
                      "₹50L – ₹1Cr",
                      "> ₹1Cr",
                    ].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Risk Appetite</Label>
                <Select
                  onValueChange={(v) => setValue("riskAppetite", v as any)}
                  defaultValue={client?.riskAppetite || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "CONSERVATIVE", label: "Conservative" },
                      { value: "MODERATE", label: "Moderate" },
                      { value: "AGGRESSIVE", label: "Aggressive" },
                      { value: "VERY_AGGRESSIVE", label: "Very Aggressive" },
                    ].map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aum">AUM (₹)</Label>
                <Input
                  id="aum"
                  type="number"
                  placeholder="5000000"
                  {...register("aum")}
                />
              </div>
            </div>
          </div>

          {/* Section: Classification */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Classification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  onValueChange={(v) => setValue("category", v as any)}
                  defaultValue={client?.category || "STANDARD"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["RETAIL", "STANDARD", "PREMIUM", "HNI", "ULTRA_HNI"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  onValueChange={(v) => setValue("status", v as any)}
                  defaultValue={client?.status || "ACTIVE"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["ACTIVE", "INACTIVE", "PROSPECT", "DORMANT"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  placeholder="123, Example Street, Andheri West"
                  {...register("address")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Mumbai" {...register("city")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="Maharashtra"
                  {...register("state")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  placeholder="400053"
                  {...register("pincode")}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Saving…" : "Creating…"}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
