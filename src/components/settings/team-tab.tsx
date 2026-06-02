"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, Mail, Trash2, Shield, ChevronDown, Loader2, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getInitials, generateAvatarColor, formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ADVISOR: "Advisor",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-400",
  ADMIN: "bg-brand-500/15 text-brand-400",
  ADVISOR: "bg-emerald-500/15 text-emerald-400",
  VIEWER: "bg-muted text-muted-foreground",
};

export function TeamTab({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ADMIN");
  const [sending, setSending] = useState(false);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team/members");
      const data = await res.json();
      setUsers(data.users || []);
      setPendingInvites(data.pendingInvites || []);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setSending(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Role updated");
      fetchTeam();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      const res = await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`${name} removed`);
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite section - only for SUPER_ADMIN and ADMIN */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-brand-400" />
          <h3 className="font-medium text-foreground text-sm">Invite Team Member</h3>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="colleague@moneykonnect.in"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              className="h-9 text-sm"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground"
          >
            {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            <option value="ADMIN">Admin</option>
          </select>
          <Button
            onClick={handleInvite}
            disabled={sending || !inviteEmail}
            size="sm"
            className="h-9 bg-brand-500 hover:bg-brand-600 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Invite link expires in 24 hours. Email sent from info@moneykonnect.in
        </p>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                </div>
                <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-full", ROLE_COLORS[invite.role])}>
                  {ROLE_LABELS[invite.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team members */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Team Members ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((member) => {
            const isCurrentUser = member.id === currentUser?.id;
            const initials = getInitials(member.name || member.email);
            const avatarColor = generateAvatarColor(member.id);

            return (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", avatarColor)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name || "—"}
                      {isCurrentUser && <span className="ml-2 text-2xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="h-7 px-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="ADVISOR">Advisor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-full", ROLE_COLORS[member.role])}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  )}
                  {isSuperAdmin && !isCurrentUser && (
                    <button
                      onClick={() => handleRemove(member.id, member.name || member.email)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
