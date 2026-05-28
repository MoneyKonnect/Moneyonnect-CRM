"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createTask } from "@/actions/tasks";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultClientId?: string;
}

export function TaskFormModal({ open, onClose, defaultClientId }: TaskFormModalProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { type: "FOLLOW_UP", priority: "MEDIUM", status: "PENDING" },
  });

  const onSubmit = async (data: any) => {
    const result = await createTask({
      ...data,
      clientId: defaultClientId || null,
    });
    if (result.success) {
      toast.success("Task created!");
      reset();
      onClose();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Follow-up call with client" {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="FOLLOW_UP" onValueChange={v => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CALL","MEETING","FOLLOW_UP","KYC_RENEWAL","INVESTMENT_MATURITY","CUSTOM"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="MEDIUM" onValueChange={v => setValue("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW","MEDIUM","HIGH","URGENT"].map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date & Time</Label>
            <Input type="datetime-local" {...register("dueAt")} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional details…" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
