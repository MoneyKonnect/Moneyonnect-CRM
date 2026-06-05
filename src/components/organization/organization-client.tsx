"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  Building2,
  UserPlus,
  Mail,
  Loader2,
  Copy,
  Check,
  Shield,
  Crown,
  Eye,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials, generateAvatarColor, formatDate } from "@/lib/utils";

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: "Super Admin", icon: Crown,  color: "text-amber-400",   bg: "bg-amber-500/10"  },
  ADMIN:       { label: "Admin",       icon: Shield, color: "text-red-400",     bg: "bg-red-500/10"    },

};

export function OrganizationClient({ data, currentUserId }: { data: any; currentUserId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?invite=demo`
    : "https://your-domain.com/register?invite=demo";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Organization</h1>
            <p className="text-sm text-muted-foreground">{data.members.length} team member{data.members.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button size="sm" className="h-8 bg-brand-500 hover:bg-brand-600 text-white text-xs gap-1.5"
          onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Invite Member
        </Button>
      </div>

      {/* Workspace info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" /> Workspace
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Members", value: data.members.length },
            
            { label: "Admins",        value: data.members.filter((m: any) => ["ADMIN","SUPER_ADMIN"].includes(m.role)).length },
            { label: "Plan",          value: data.plan, highlight: true },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-2xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-xl font-bold mt-0.5", stat.highlight ? "text-brand-400" : "text-foreground")}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Team members */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
        </div>
        <div className="divide-y divide-border">
          {data.members.map((member: any) => {
            const roleCfg = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.ADMIN;
            const RoleIcon = roleCfg.icon;
            const isYou = member.id === currentUserId;
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold flex-shrink-0", generateAvatarColor(member.id))}>
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    {isYou && <span className="text-2xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-1.5 py-0.5 rounded-full">you</span>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />{member.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-2xs font-medium px-2 py-1 rounded-full border flex items-center gap-1", roleCfg.bg, roleCfg.color, "border-current/20")}>
                    <RoleIcon className="h-3 w-3" />
                    {roleCfg.label}
                  </span>
                  <span className="text-2xs text-muted-foreground hidden sm:block">
                    Joined {formatDate(member.createdAt, "short")}
                  </span>
                  {!isYou && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Change role</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger">Remove member</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Invite your team</h3>
        <p className="text-xs text-muted-foreground mb-4">Add advisors and support staff to collaborate on clients</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground font-mono truncate">
            {inviteLink}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs flex-shrink-0" onClick={handleCopyLink}>
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function InviteMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string,any>>({
    defaultValues: { role: "ADMIN" },
  });

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, role: data.role }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "Failed to send invite", { description: result.details }); return; }
      toast.success(`Invite sent to ${data.email}!`, {
        description: `They'll receive an email with a link to join as ${data.role}`,
      });
      onClose();
    } catch {
      toast.error("Failed to send invite");
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-400" /> Invite Team Member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email address *</Label>
            <Input type="email" placeholder="colleague@example.com" {...register("email", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select defaultValue="ADMIN" onValueChange={v => setValue("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([value, cfg]) => (
                  <SelectItem key={value} value={value}>
                    <span className={cfg.color}>{cfg.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-2xs text-muted-foreground">
              Advisors can manage their own clients. Admins can see all clients.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Personal message (optional)</Label>
            <Input placeholder="Hi! Join our CRM to collaborate on clients…" {...register("message")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
